import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Eye, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RichTextEditor from "@/components/admin/RichTextEditor";

const TEMPLATE_META: Record<string, { name: string; defaultSubject: string; variables: { key: string; label: string }[] }> = {
  "ticket-confirmation": {
    name: "تأكيد التسجيل — فعالية مجانية",
    defaultSubject: "تأكيد تسجيلك في الحدث",
    variables: [
      { key: "{{guestName}}", label: "اسم الضيف" },
      { key: "{{eventTitle}}", label: "عنوان الفعالية" },
      { key: "{{eventDate}}", label: "تاريخ الفعالية" },
      { key: "{{eventTime}}", label: "وقت الفعالية" },
      { key: "{{venueName}}", label: "اسم المكان" },
      { key: "{{ticketCount}}", label: "عدد التذاكر" },
      { key: "{{confirmationUrl}}", label: "رابط التأكيد" },
    ],
  },
  "payment-rejected": {
    name: "رفض الدفع",
    defaultSubject: "تم رفض دفعتك",
    variables: [
      { key: "{{guestName}}", label: "اسم الضيف" },
      { key: "{{eventTitle}}", label: "عنوان الفعالية" },
      { key: "{{referenceCode}}", label: "رقم المرجع" },
      { key: "{{rejectionReason}}", label: "سبب الرفض" },
    ],
  },
  "payment-expired": {
    name: "انتهاء مهلة الدفع",
    defaultSubject: "انتهت مهلة الدفع",
    variables: [
      { key: "{{guestName}}", label: "اسم الضيف" },
      { key: "{{eventTitle}}", label: "عنوان الفعالية" },
      { key: "{{referenceCode}}", label: "رقم المرجع" },
      { key: "{{totalAmount}}", label: "المبلغ الإجمالي" },
    ],
  },
  "organizer-invitation": {
    name: "دعوة منظم",
    defaultSubject: "دعوة للانضمام كمنظم على وجهة",
    variables: [
      { key: "{{organizerName}}", label: "اسم المنظم" },
      { key: "{{loginUrl}}", label: "رابط تسجيل الدخول" },
    ],
  },
};

const SAMPLE_DATA: Record<string, Record<string, string>> = {
  "ticket-confirmation": {
    "{{guestName}}": "أحمد",
    "{{eventTitle}}": "حفل موسيقي",
    "{{eventDate}}": "الأربعاء ١٣ أبريل ٢٠٢٦",
    "{{eventTime}}": "٤:٠٠ م",
    "{{venueName}}": "مسرح المدينة",
    "{{ticketCount}}": "2",
    "{{confirmationUrl}}": "https://wujha.me/invite/123/confirmation/456",
  },
  "payment-rejected": {
    "{{guestName}}": "سارة",
    "{{eventTitle}}": "معرض فني",
    "{{referenceCode}}": "TKT-0001-0001",
    "{{rejectionReason}}": "لم يتم التحقق من إيصال الدفع",
  },
  "payment-expired": {
    "{{guestName}}": "محمد",
    "{{eventTitle}}": "ورشة عمل",
    "{{referenceCode}}": "TKT-0002-0001",
    "{{totalAmount}}": "50,000 ل.س",
  },
  "organizer-invitation": {
    "{{organizerName}}": "شركة الأمل",
    "{{loginUrl}}": "https://wujha.me/admin/login",
  },
};

// Unescape HTML entities that may come from DB storage
const unescapeHtml = (html: string): string => {
  if (!html) return html;
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

export default function EmailTemplateEditor() {
  const { templateKey } = useParams<{ templateKey: string }>();
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [defaultRenderedHtml, setDefaultRenderedHtml] = useState("");

  const meta = templateKey ? TEMPLATE_META[templateKey] : null;

  // Fetch the default rendered template from the edge function
  useEffect(() => {
    if (!templateKey) return;
    supabase.functions
      .invoke("preview-transactional-email", { method: "POST" })
      .then(({ data, error }) => {
        if (error || !data?.templates) return;
        const match = data.templates.find(
          (t: any) => t.templateName === templateKey && t.status === "ready"
        );
        if (match?.html) {
          setDefaultRenderedHtml(match.html);
        }
      })
      .catch(() => {});
  }, [templateKey]);

  useEffect(() => {
    if (!templateKey || !meta) return;
    supabase
      .from("email_templates" as any)
      .select("*")
      .eq("template_key", templateKey)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setSubject(data.subject_ar);
          setBodyHtml(data.body_html);
        } else {
          setSubject(meta.defaultSubject);
          setBodyHtml("");
        }
        setLoaded(true);
      });
  }, [templateKey, meta]);

  const insertVariable = useCallback((variable: string) => {
    // We'll append to the editor content via a custom event
    window.dispatchEvent(new CustomEvent("insert-template-variable", { detail: variable }));
  }, []);

  const handleSave = async () => {
    if (!templateKey || !adminUser) return;
    setSaving(true);
    const { error } = await (supabase.from("email_templates" as any) as any).upsert(
      {
        template_key: templateKey,
        subject_ar: subject,
        body_html: bodyHtml,
        updated_at: new Date().toISOString(),
        updated_by: adminUser.id,
      },
      { onConflict: "template_key" }
    );
    setSaving(false);
    if (error) {
      toast.error("فشل الحفظ");
      console.error(error);
    } else {
      toast.success("تم حفظ القالب بنجاح");
    }
  };

  const getPreviewHtml = () => {
    // If no custom template, use the default rendered HTML from edge function
    if (!bodyHtml && defaultRenderedHtml) {
      return defaultRenderedHtml;
    }
    if (!templateKey) return unescapeHtml(bodyHtml);
    let html = unescapeHtml(bodyHtml);
    const samples = SAMPLE_DATA[templateKey] || {};
    Object.entries(samples).forEach(([key, value]) => {
      html = html.split(key).join(value);
    });
    return html;
  };

  if (!meta) return <div className="p-8 text-center">قالب غير موجود</div>;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/email-templates")}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{meta.name}</h1>
          <p className="text-sm text-muted-foreground">تعديل محتوى البريد الإلكتروني</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Editor area */}
        <div className="space-y-4">
          {/* Subject */}
          <div className="space-y-2">
            <Label>عنوان البريد</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} dir="rtl" placeholder="عنوان البريد الإلكتروني" />
          </div>

          {/* Body editor */}
          <div className="space-y-2">
            <Label>محتوى البريد</Label>
            {loaded && <RichTextEditor content={bodyHtml} onChange={setBodyHtml} />}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
              حفظ
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              <Eye className="h-4 w-4 ml-2" /> معاينة
            </Button>
          </div>
        </div>

        {/* Variables panel */}
        <div className="rounded-lg border bg-card p-4 h-fit">
          <h3 className="font-semibold mb-3 text-sm">المتغيرات المتاحة</h3>
          <p className="text-xs text-muted-foreground mb-3">انقر على أي متغير لإدراجه في المحرر</p>
          <div className="space-y-2">
            {meta.variables.map((v) => (
              <button
                key={v.key}
                onClick={() => insertVariable(v.key)}
                className="flex items-center justify-between w-full text-sm px-3 py-2 rounded-md border hover:bg-muted transition-colors text-right"
              >
                <span className="text-muted-foreground">{v.label}</span>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono" dir="ltr">{v.key}</code>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>معاينة البريد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="font-medium">العنوان: </span>
              {(() => {
                let s = subject;
                const samples = SAMPLE_DATA[templateKey!] || {};
                Object.entries(samples).forEach(([k, v]) => { s = s.split(k).join(v); });
                return s;
              })()}
            </div>
            <iframe
              srcDoc={getPreviewHtml()}
              className="w-full border rounded-lg bg-white"
              style={{ minHeight: 400, border: "none" }}
              dir="rtl"
              onLoad={(e) => {
                const iframe = e.currentTarget;
                if (iframe.contentDocument?.body) {
                  iframe.style.height = iframe.contentDocument.body.scrollHeight + 32 + "px";
                }
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
