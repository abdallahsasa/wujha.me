import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Check, X, FileText, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface Application {
  id: string;
  auth_id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  documents: { name: string; path: string; url: string }[];
  admin_notes: string | null;
  created_at: string;
}

export default function OrganizerApplications() {
  const { adminUser } = useAdminAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const isAdmin = adminUser?.role === "super_admin" || adminUser?.role === "admin";

  const fetchApplications = async () => {
    let query = supabase
      .from("organizer_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;
    if (data) setApplications(data as unknown as Application[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const handleApprove = async (app: Application) => {
    try {
      // 1. Create organizer record
      const { data: organizer, error: orgError } = await supabase
        .from("organizers")
        .insert({
          name_ar: app.name,
          email: app.email,
          phone: app.phone,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // 2. Create admin_users record for the organizer
      const { error: adminError } = await supabase
        .from("admin_users")
        .insert({
          auth_id: app.auth_id,
          email: app.email,
          name: app.name,
          phone: app.phone,
          role: "organizer",
          organizer_id: organizer.id,
          is_active: true,
        });

      if (adminError) throw adminError;

      // 3. Update application status
      const { error: updateError } = await supabase
        .from("organizer_applications")
        .update({
          status: "approved",
          reviewed_by: adminUser!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", app.id);

      if (updateError) throw updateError;

      // 4. Notify the organizer (insert notification for their new admin_users record)
      const { data: newAdminUser } = await supabase
        .from("admin_users")
        .select("id")
        .eq("auth_id", app.auth_id)
        .single();

      if (newAdminUser) {
        await supabase.from("notifications").insert({
          recipient_admin_id: newAdminUser.id,
          title: "تم قبول طلبك!",
          message: "تم قبول طلبك كمنظم فعاليات. يمكنك الآن إضافة فعالياتك من لوحة التحكم.",
          type: "application_approved",
        });
      }

      toast.success("تم قبول المنظم بنجاح");
      fetchApplications();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    }
  };

  const handleReject = async (app: Application) => {
    try {
      const { error } = await supabase
        .from("organizer_applications")
        .update({
          status: "rejected",
          reviewed_by: adminUser!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", app.id);

      if (error) throw error;

      toast.success("تم رفض الطلب");
      fetchApplications();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    }
  };

  const getDocumentUrl = (path: string) => {
    const { data } = supabase.storage.from("organizer-documents").getPublicUrl(path);
    return data.publicUrl;
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">قيد المراجعة</Badge>;
      case "approved": return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">مقبول</Badge>;
      case "rejected": return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">مرفوض</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!isAdmin) {
    return <div className="p-6 text-center text-muted-foreground">ليس لديك صلاحية الوصول</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">طلبات المنظمين</h1>
        <div className="flex gap-2">
          {(["pending", "all", "approved", "rejected"] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => { setFilter(f); setLoading(true); }}
            >
              {f === "all" ? "الكل" : f === "pending" ? "قيد المراجعة" : f === "approved" ? "مقبول" : "مرفوض"}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">لا توجد طلبات</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>البريد</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>الوثائق</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map(app => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.name}</TableCell>
                    <TableCell className="text-sm">{app.email}</TableCell>
                    <TableCell className="text-sm">{app.phone || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {app.documents.map((doc, i) => (
                          <a
                            key={i}
                            href={getDocumentUrl(doc.path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400 transition"
                            title={doc.name}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{statusBadge(app.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(app.created_at), "yyyy/MM/dd")}
                    </TableCell>
                    <TableCell>
                      {app.status === "pending" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-green-500 border-green-500/30 hover:bg-green-500/10" onClick={() => handleApprove(app)}>
                            <Check className="h-3.5 w-3.5 mr-1" /> قبول
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-red-500 border-red-500/30 hover:bg-red-500/10" onClick={() => handleReject(app)}>
                            <X className="h-3.5 w-3.5 mr-1" /> رفض
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
