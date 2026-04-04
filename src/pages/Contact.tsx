import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageCircle } from "lucide-react";

export default function Contact() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) return;
    setLoading(true);
    const { error } = await supabase.from("contact_messages" as any).insert([{
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim(),
      message: form.message.trim(),
    }]);
    setLoading(false);
    if (error) {
      toast({ title: "خطأ", description: "حدث خطأ أثناء الإرسال، حاول مجدداً", variant: "destructive" });
      return;
    }
    toast({ title: "تم الإرسال", description: "تم إرسال رسالتك بنجاح — سنتواصل معك قريباً" });
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <>
      <Helmet>
        <title>تواصل معنا | وجهة</title>
        <meta name="description" content="تواصل مع فريق وجهة — نسعد بتواصلك معنا" />
      </Helmet>

      <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-wujha-text mb-10">تواصل معنا</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 [&>:first-child]:order-first md:[&>:first-child]:order-none">
          {/* Right column (RTL) — Contact info */}
          <div className="space-y-4">
            <a
              href="mailto:contact@wujha.me"
              className="flex items-center gap-4 p-5 rounded-2xl border border-wujha-border hover:border-wujha-accent/40 transition group"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-wujha-surface">
                <Mail className="h-5 w-5 text-wujha-accent" />
              </div>
              <div>
                <p className="text-sm text-wujha-text-muted mb-0.5">البريد الإلكتروني</p>
                <p className="font-medium text-wujha-text group-hover:text-wujha-accent transition" dir="ltr">
                  contact@wujha.me
                </p>
              </div>
            </a>

            <a
              href="https://wa.me/97155283371"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-5 rounded-2xl border border-wujha-border hover:border-green-500/40 transition group"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-wujha-surface">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-wujha-text-muted mb-0.5">واتساب</p>
                <p className="font-medium text-wujha-text group-hover:text-green-600 transition" dir="ltr">
                  0097155283371
                </p>
              </div>
            </a>
          </div>

          {/* Left column — Contact form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">الاسم *</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="اسمك الكامل"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني *</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="example@email.com"
                dir="ltr"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">الموضوع *</Label>
              <Input
                id="subject"
                required
                value={form.subject}
                onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                placeholder="موضوع الرسالة"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">الرسالة *</Label>
              <Textarea
                id="message"
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                placeholder="اكتب رسالتك هنا..."
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto min-h-[44px]">
              {loading ? "جاري الإرسال..." : "إرسال"}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
