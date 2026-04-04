import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Mail, MailOpen, Trash2 } from "lucide-react";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function ContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("contact_messages" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setMessages((data as any) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchMessages(); }, []);

  const toggleRead = async (msg: ContactMessage) => {
    await supabase
      .from("contact_messages" as any)
      .update({ is_read: !msg.is_read } as any)
      .eq("id", msg.id);
    setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, is_read: !m.is_read } : m));
  };

  const deleteMsg = async (id: string) => {
    await supabase.from("contact_messages" as any).delete().eq("id", id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
    toast({ title: "تم الحذف" });
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-[300px] w-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">رسائل التواصل</h1>

      {messages.length === 0 ? (
        <p className="text-muted-foreground">لا توجد رسائل بعد.</p>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الحالة</TableHead>
                <TableHead>الاسم</TableHead>
                <TableHead>البريد</TableHead>
                <TableHead>الموضوع</TableHead>
                <TableHead className="max-w-[200px]">الرسالة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((msg) => (
                <TableRow key={msg.id} className={msg.is_read ? "opacity-60" : ""}>
                  <TableCell>
                    <Badge variant={msg.is_read ? "secondary" : "default"}>
                      {msg.is_read ? "مقروءة" : "جديدة"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{msg.name}</TableCell>
                  <TableCell dir="ltr" className="text-right">{msg.email}</TableCell>
                  <TableCell>{msg.subject}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{msg.message}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(msg.created_at), "d MMM yyyy", { locale: ar })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => toggleRead(msg)} title={msg.is_read ? "تحديد كغير مقروءة" : "تحديد كمقروءة"}>
                        {msg.is_read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMsg(msg.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
