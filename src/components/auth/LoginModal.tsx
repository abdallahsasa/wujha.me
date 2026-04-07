import { useState } from "react";
import { X, Sparkles, Mail, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePublicAuth } from "@/contexts/PublicAuthContext";
import { toast } from "sonner";
import { validatePhone, normalizeSyrianPhone } from "@/lib/phone-validation";

type View = "main" | "guest" | "email";
type EmailMode = "login" | "signup";

export default function LoginModal({ open, onClose, context = "general" }: { open: boolean; onClose: () => void; context?: "order" | "general" }) {
  const [view, setView] = useState<View>("main");
  const [emailMode, setEmailMode] = useState<EmailMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setGuestUser } = usePublicAuth();

  // Guest form
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  // Email form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupName, setSignupName] = useState("");

  if (!open) return null;

  const reset = () => {
    setView("main");
    setEmailMode("login");
    setGuestName("");
    setGuestPhone("");
    setGuestEmail("");
    setEmail("");
    setPassword("");
    setSignupName("");
    setShowPassword(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !guestPhone.trim()) {
      toast.error("الرجاء إدخال الاسم ورقم الهاتف");
      return;
    }
    const cleanedPhone = normalizeSyrianPhone(guestPhone);
    const phoneCheck = validatePhone(cleanedPhone);
    if (!phoneCheck.valid) {
      toast.error(phoneCheck.error);
      return;
    }
    const trimmedGuestName = guestName.trim();
    // Validate name - only letters and spaces
    const nameRegex = /^[\u0600-\u06FFa-zA-Z\s]+$/;
    if (!nameRegex.test(trimmedGuestName)) {
      toast.error("الاسم يجب أن يحتوي على حروف فقط");
      return;
    }

    setLoading(true);
    try {
      const normalizedGuestEmail = guestEmail.trim().toLowerCase();
      const { data, error } = await supabase.from("users").insert({
        name: guestName.trim(),
        phone: cleanedPhone,
        email: normalizedGuestEmail || null,
      }).select().single();

      if (error) throw error;
      setGuestUser(data);
      toast.success("تم تسجيلك بنجاح!");
      handleClose();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) {
        toast.error("فشل تسجيل الدخول بجوجل");
      }
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("الرجاء إدخال البريد وكلمة المرور");
      return;
    }
    setLoading(true);
    try {
      if (emailMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("تم تسجيل الدخول!");
        handleClose();
      } else {
        const trimmedSignupName = signupName.trim() || email.split("@")[0];
        
        // Validate name - only letters and spaces
        const nameRegex = /^[\u0600-\u06FFa-zA-Z\s]+$/;
        if (!nameRegex.test(trimmedSignupName)) {
          toast.error("الاسم يجب أن يحتوي على حروف فقط");
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: trimmedSignupName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب! تحقق من بريدك الإلكتروني للتأكيد.");
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-11 rounded-lg border border-wujha-border bg-wujha-surface px-4 text-sm text-wujha-text placeholder:text-wujha-text-muted focus:outline-none focus:ring-1 focus:ring-wujha-gold";
  const btnPrimary = "w-full h-11 rounded-lg bg-wujha-gold font-bold text-wujha-gold-foreground transition hover:opacity-90 disabled:opacity-50 text-sm";
  const btnOutline = "w-full h-11 rounded-lg border border-wujha-border bg-wujha-surface font-medium text-wujha-text transition hover:bg-wujha-surface-hover disabled:opacity-50 text-sm flex items-center justify-center gap-3";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div
        dir="rtl"
        className="relative w-full max-w-sm mx-4 rounded-2xl bg-wujha-bg border border-wujha-border p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={handleClose} className="absolute top-4 left-4 text-wujha-text-muted hover:text-wujha-text transition">
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-bold text-center mb-6">مرحباً بك في وجهة</h2>

        {view === "main" && (
          <div className="space-y-4">
            {context === "order" && (
              <>
                {/* Quick Order */}
                <button onClick={() => setView("guest")} className="w-full h-12 rounded-lg bg-wujha-surface border border-wujha-border font-bold text-wujha-text transition hover:bg-wujha-surface-hover flex items-center justify-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-wujha-gold" />
                  طلب سريع — بدون حساب
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-wujha-border" />
                  <span className="text-wujha-text-muted text-xs">أو</span>
                  <div className="flex-1 border-t border-wujha-border" />
                </div>
              </>
            )}

            {/* Google */}
            <button onClick={handleGoogleLogin} disabled={loading} className={btnOutline}>
              <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              تسجيل بحساب جوجل
            </button>

            {/* Email */}
            <button onClick={() => setView("email")} className={btnOutline}>
              <Mail className="h-5 w-5 text-wujha-text-muted" />
              تسجيل بالبريد الإلكتروني
            </button>
          </div>
        )}

        {view === "guest" && (
          <form onSubmit={handleGuestSubmit} className="space-y-4">
            <p className="text-wujha-text-muted text-xs text-center mb-2">أدخل بياناتك للمتابعة بدون إنشاء حساب</p>
            <input type="text" placeholder="الاسم الكامل *" value={guestName} onChange={e => setGuestName(e.target.value)} className={inputClass} required />
            <input type="tel" placeholder="0998XXXXXXX" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className={inputClass} dir="ltr" required />
            <input type="email" placeholder="البريد الإلكتروني (اختياري)" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} className={inputClass} dir="ltr" />
            <button type="submit" disabled={loading} className={btnPrimary}>
              {loading ? "جاري التسجيل..." : "متابعة"}
            </button>
            <button type="button" onClick={() => setView("main")} className="w-full text-center text-wujha-text-muted text-xs hover:text-wujha-gold transition">
              ← رجوع
            </button>
          </form>
        )}

        {view === "email" && (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex rounded-lg bg-wujha-surface border border-wujha-border overflow-hidden">
              <button
                onClick={() => setEmailMode("login")}
                className={`flex-1 py-2 text-sm font-medium transition ${emailMode === "login" ? "bg-wujha-gold text-wujha-gold-foreground" : "text-wujha-text-muted hover:text-wujha-text"}`}
              >
                تسجيل دخول
              </button>
              <button
                onClick={() => setEmailMode("signup")}
                className={`flex-1 py-2 text-sm font-medium transition ${emailMode === "signup" ? "bg-wujha-gold text-wujha-gold-foreground" : "text-wujha-text-muted hover:text-wujha-text"}`}
              >
                حساب جديد
              </button>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-3">
              {emailMode === "signup" && (
                <input type="text" placeholder="الاسم" value={signupName} onChange={e => setSignupName(e.target.value)} className={inputClass} />
              )}
              <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} dir="ltr" required />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={inputClass + " pl-10"}
                  dir="ltr"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-wujha-text-muted hover:text-wujha-text">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button type="submit" disabled={loading} className={btnPrimary}>
                {loading ? "جاري..." : emailMode === "login" ? "دخول" : "إنشاء حساب"}
              </button>
            </form>

            <button type="button" onClick={() => setView("main")} className="w-full text-center text-wujha-text-muted text-xs hover:text-wujha-gold transition">
              ← رجوع
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
