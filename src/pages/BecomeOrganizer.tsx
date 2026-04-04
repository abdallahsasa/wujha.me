import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePublicAuth } from "@/contexts/PublicAuthContext";
import { toast } from "sonner";
import {
  Upload, X, FileText, CheckCircle, Clock, XCircle,
  Eye, EyeOff, BadgePercent, Users, Wrench, BarChart3,
} from "lucide-react";

type AppStatus = "idle" | "pending" | "approved" | "rejected";

/* ─── Value prop cards ─── */
const VALUE_PROPS = [
  { icon: BadgePercent, title: "0% عمولة", desc: "لا نأخذ أي نسبة من مبيعات تذاكرك. أنت تحتفظ بكل شيء." },
  { icon: Users, title: "وصول لجمهور جديد", desc: "آلاف المستخدمين يبحثون عن تجارب في سوريا. فعاليتك تظهر أمامهم." },
  { icon: Wrench, title: "أدوات إدارة متكاملة", desc: "إنشاء فعاليات، إدارة تذاكر، قوائم ضيوف، ماسح QR للباب — كلها مجاناً." },
  { icon: BarChart3, title: "بيانات وتحليلات", desc: "اعرف جمهورك: من حضر، من أين أتوا، وماذا يهتمون به." },
];

/* ─── How-it-works steps ─── */
const STEPS = [
  { num: "1", title: "سجّل حسابك", desc: "أنشئ حساب منظم مجاني خلال دقيقة." },
  { num: "2", title: "أضف فعاليتك", desc: "ارفع التفاصيل والصور وحدد التذاكر والأسعار." },
  { num: "3", title: "استقبل الحضور", desc: "شارك الرابط، تابع الحجوزات، وامسح التذاكر عند الباب." },
];

export default function BecomeOrganizer() {
  const { authUser } = usePublicAuth();
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);

  const [appStatus, setAppStatus] = useState<AppStatus>("idle");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Auth form
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // File uploads
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const checkApplication = async () => {
      if (!authUser) { setLoading(false); return; }
      const { data } = await supabase
        .from("organizer_applications")
        .select("status")
        .eq("auth_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) setAppStatus(data[0].status as AppStatus);
      setLoading(false);
    };
    checkApplication();
  }, [authUser]);

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth" });

  /* ─── Auth handler ─── */
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { toast.error("الرجاء إدخال البريد وكلمة المرور"); return; }
    setAuthLoading(true);
    try {
      if (authMode === "signup") {
        if (!name.trim()) { toast.error("الرجاء إدخال الاسم"); setAuthLoading(false); return; }
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin + "/become-organizer" },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب! تحقق من بريدك الإلكتروني للتأكيد.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("تم تسجيل الدخول!");
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally { setAuthLoading(false); }
  };

  /* ─── File handlers ─── */
  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const valid = newFiles.filter(f => { if (f.size > 10 * 1024 * 1024) { toast.error(`الملف ${f.name} أكبر من 10 ميغابايت`); return false; } return true; });
    setFiles(prev => [...prev, ...valid]);
    e.target.value = "";
  };
  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  /* ─── Submit handler ─── */
  const handleSubmit = async () => {
    if (!authUser) return;
    if (files.length === 0) { toast.error("الرجاء رفع الوثائق المطلوبة (الرخصة، الهوية)"); return; }
    setSubmitting(true);
    try {
      setUploading(true);
      const uploadedDocs: { name: string; path: string; url: string }[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop();
        const path = `${authUser.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("organizer-documents").upload(path, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("organizer-documents").getPublicUrl(path);
        uploadedDocs.push({ name: file.name, path, url: urlData.publicUrl });
      }
      setUploading(false);
      const { error } = await supabase.from("organizer_applications").insert({
        auth_id: authUser.id,
        name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Organizer",
        email: authUser.email!,
        phone: phone.trim() || null,
        documents: uploadedDocs,
      });
      if (error) throw error;
      const { data: admins } = await supabase.from("admin_users").select("id").in("role", ["super_admin", "admin"]).eq("is_active", true);
      if (admins && admins.length > 0) {
        await supabase.from("notifications").insert(admins.map(a => ({
          recipient_admin_id: a.id,
          title: "طلب انضمام منظم جديد",
          message: `${authUser.user_metadata?.full_name || authUser.email} قدّم طلب انضمام كمنظم`,
          type: "organizer_application",
        })));
      }
      setAppStatus("pending");
      toast.success("تم إرسال طلبك بنجاح! سيتم مراجعته قريباً.");
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء الإرسال");
    } finally { setSubmitting(false); setUploading(false); }
  };

  const inputClass = "w-full h-11 rounded-xl border border-wujha-border bg-white px-4 text-sm text-wujha-text placeholder:text-wujha-text-muted focus:outline-none focus:ring-1 focus:ring-wujha-accent";
  const btnPrimary = "w-full h-11 rounded-xl bg-wujha-accent font-bold text-white transition hover:opacity-90 disabled:opacity-50 text-sm";

  return (
    <div className="min-h-screen bg-background">

      {/* ═══════ HERO ═══════ */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight text-wujha-text mb-4">
            أدِر فعالياتك على وجهة
          </h1>
          <p className="text-lg md:text-xl text-wujha-text-muted mb-8 max-w-2xl mx-auto leading-relaxed">
            المنصة الأولى لاكتشاف الفعاليات والتجارب في سوريا — وجمهورك ينتظرك.
          </p>
          <button
            onClick={scrollToForm}
            className="inline-flex items-center gap-2 rounded-xl bg-wujha-accent px-8 py-3.5 text-base font-bold text-white transition hover:opacity-90"
          >
            سجّل كمنظم
          </button>
        </div>
      </section>

      {/* ═══════ VALUE PROPS ═══════ */}
      <section className="pb-20">
        <div className="mx-auto max-w-5xl px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {VALUE_PROPS.map((v) => (
            <div key={v.title} className="flex flex-col items-center text-center gap-2 rounded-2xl border border-wujha-border bg-white p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-wujha-surface">
                <v.icon className="h-6 w-6 text-wujha-text" />
              </div>
              <h3 className="text-lg font-bold text-wujha-text">{v.title}</h3>
              <p className="text-sm text-wujha-text-muted leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section className="py-20 bg-wujha-surface">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-3xl font-bold text-center text-wujha-text mb-12">كيف يعمل؟</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.num} className="text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#065741] text-[#EBF846] text-xl font-bold select-none">
                  {s.num}
                </div>
                <h3 className="text-lg font-bold text-wujha-text">{s.title}</h3>
                <p className="text-sm text-wujha-text-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ TRUST ═══════ */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <p className="text-lg text-wujha-text-muted">
            انضم إلى منظمي الفعاليات في سوريا على <span className="font-bold text-wujha-text">وجهة</span>
          </p>
        </div>
      </section>

      {/* ═══════ SIGN-UP FORM ═══════ */}
      <section ref={formRef} className="py-20 bg-wujha-surface">
        <div className="mx-auto max-w-lg px-4">
          <h2 className="text-3xl font-bold text-center text-wujha-text mb-8">ابدأ الآن</h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wujha-accent" />
            </div>
          ) : appStatus === "pending" ? (
            <div className="rounded-2xl border border-wujha-border bg-white p-8 text-center space-y-4">
              <Clock className="h-12 w-12 text-wujha-accent mx-auto" />
              <h3 className="text-xl font-bold">طلبك قيد المراجعة</h3>
              <p className="text-wujha-text-muted">تم إرسال طلبك بنجاح وسيتم مراجعته من قبل فريقنا. ستتلقى إشعاراً عند قبول أو رفض الطلب.</p>
            </div>
          ) : appStatus === "approved" ? (
            <div className="rounded-2xl border border-wujha-border bg-white p-8 text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="text-xl font-bold">تم قبول طلبك!</h3>
              <p className="text-wujha-text-muted">يمكنك الآن الدخول إلى لوحة التحكم وإضافة فعالياتك.</p>
              <button onClick={() => navigate("/admin/dashboard")} className="inline-block rounded-xl bg-wujha-accent px-6 py-2.5 font-bold text-white transition hover:opacity-90">
                الذهاب للوحة التحكم
              </button>
            </div>
          ) : appStatus === "rejected" ? (
            <div className="rounded-2xl border border-wujha-border bg-white p-8 text-center space-y-4">
              <XCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h3 className="text-xl font-bold">تم رفض الطلب</h3>
              <p className="text-wujha-text-muted">للأسف تم رفض طلبك. يمكنك التواصل مع فريق الدعم للحصول على مزيد من المعلومات.</p>
            </div>
          ) : !authUser ? (
            /* Auth form */
            <div className="rounded-2xl border border-wujha-border bg-white p-6 space-y-6">
              <div className="flex rounded-xl bg-wujha-surface border border-wujha-border overflow-hidden">
                <button onClick={() => setAuthMode("signup")} className={`flex-1 py-2.5 text-sm font-medium transition ${authMode === "signup" ? "bg-wujha-accent text-white" : "text-wujha-text-muted hover:text-wujha-text"}`}>حساب جديد</button>
                <button onClick={() => setAuthMode("login")} className={`flex-1 py-2.5 text-sm font-medium transition ${authMode === "login" ? "bg-wujha-accent text-white" : "text-wujha-text-muted hover:text-wujha-text"}`}>تسجيل دخول</button>
              </div>
              <form onSubmit={handleAuth} className="space-y-3">
                {authMode === "signup" && <input type="text" placeholder="الاسم الكامل *" value={name} onChange={e => setName(e.target.value)} className={inputClass} required />}
                <input type="email" placeholder="البريد الإلكتروني *" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} dir="ltr" required />
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="كلمة المرور *" value={password} onChange={e => setPassword(e.target.value)} className={inputClass + " pl-10"} dir="ltr" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-wujha-text-muted hover:text-wujha-text">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {authMode === "signup" && <input type="tel" placeholder="0998XXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} dir="ltr" />}
                <button type="submit" disabled={authLoading} className={btnPrimary}>
                  {authLoading ? "جاري..." : authMode === "signup" ? "إنشاء حساب" : "تسجيل دخول"}
                </button>
              </form>
              <p className="text-center text-xs text-wujha-text-muted">سيتم مراجعة طلبك خلال 24 ساعة.</p>
            </div>
          ) : (
            /* Document upload */
            <div className="rounded-2xl border border-wujha-border bg-white p-6 space-y-6">
              <h3 className="text-lg font-bold">رفع الوثائق المطلوبة</h3>
              <p className="text-wujha-text-muted text-sm">ارفع الرخصة التجارية، الهوية الشخصية، وأي وثائق أخرى تدعم طلبك.</p>
              <input type="tel" placeholder="0998XXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} dir="ltr" />
              <div className="space-y-3">
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-wujha-border p-8 cursor-pointer hover:border-wujha-accent/50 transition">
                  <Upload className="h-8 w-8 text-wujha-text-muted" />
                  <span className="text-sm text-wujha-text-muted">اضغط لرفع الملفات (صور أو PDF)</span>
                  <span className="text-xs text-wujha-text-muted">الحد الأقصى 10 ميغابايت لكل ملف</span>
                  <input type="file" className="hidden" accept="image/*,.pdf" multiple onChange={handleFileAdd} />
                </label>
                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-3 rounded-xl bg-wujha-surface border border-wujha-border p-3">
                        <FileText className="h-5 w-5 text-wujha-accent shrink-0" />
                        <span className="text-sm flex-1 truncate">{file.name}</span>
                        <span className="text-xs text-wujha-text-muted shrink-0">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                        <button onClick={() => removeFile(idx)} className="text-wujha-text-muted hover:text-red-500 transition"><X className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={handleSubmit} disabled={submitting || files.length === 0} className={btnPrimary}>
                {uploading ? "جاري رفع الملفات..." : submitting ? "جاري الإرسال..." : "إرسال الطلب"}
              </button>
              <p className="text-center text-xs text-wujha-text-muted">سيتم مراجعة طلبك خلال 24 ساعة.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
