import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const TEMPLATE_DEFS = [
  { key: "ticket-confirmation", name: "تأكيد التسجيل — فعالية مجانية", desc: "يُرسل عند حجز تذكرة مجانية أو عند موافقة المشرف على تذكرة مدفوعة" },
  { key: "payment-rejected", name: "رفض الدفع", desc: "يُرسل عند رفض الدفع من قبل المشرف" },
  { key: "payment-expired", name: "انتهاء مهلة الدفع", desc: "يُرسل عند انتهاء مهلة الدفع خلال ٢٤ ساعة" },
  { key: "organizer-invitation", name: "دعوة منظم", desc: "يُرسل إلى المنظمين المدعوين" },
];

export default function EmailTemplatesList() {
  const navigate = useNavigate();
  const [customTemplates, setCustomTemplates] = useState<Record<string, { updated_at: string }>>({});

  useEffect(() => {
    supabase
      .from("email_templates" as any)
      .select("template_key, updated_at")
      .then(({ data }: any) => {
        if (data) {
          const map: Record<string, { updated_at: string }> = {};
          data.forEach((t: any) => { map[t.template_key] = { updated_at: t.updated_at }; });
          setCustomTemplates(map);
        }
      });
  }, []);

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold">قوالب البريد</h1>
      <p className="text-muted-foreground text-sm">تعديل محتوى رسائل البريد الإلكتروني المرسلة تلقائياً</p>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">اسم القالب</TableHead>
              <TableHead className="text-right">الوصف</TableHead>
              <TableHead className="text-right">آخر تعديل</TableHead>
              <TableHead className="text-right w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TEMPLATE_DEFS.map((t) => (
              <TableRow key={t.key}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{t.desc}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {customTemplates[t.key]
                    ? format(new Date(customTemplates[t.key].updated_at), "d MMM yyyy", { locale: ar })
                    : "—"}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/admin/email-templates/${t.key}`)}>
                    <Pencil className="h-4 w-4 ml-1" /> تعديل
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
