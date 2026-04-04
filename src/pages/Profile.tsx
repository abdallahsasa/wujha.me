import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePublicAuth } from "@/contexts/PublicAuthContext";
import { ArrowRight, Save } from "lucide-react";
import { toast } from "sonner";
import { displayPhone, validatePhone, normalizeSyrianPhone } from "@/lib/phone-validation";


type City = { id: string; name_ar: string };

export default function Profile() {
  const { authUser, publicUser, guestUser, loading: authLoading, setGuestUser } = usePublicAuth();
  const navigate = useNavigate();
  const [cities, setCities] = useState<City[]>([]);
  const [saving, setSaving] = useState(false);

  const currentUser = publicUser || guestUser;
  const isGuest = !authUser && !!guestUser;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cityId, setCityId] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser && !authUser) {
      navigate("/");
      return;
    }
    if (currentUser) {
      setName(currentUser.name || "");
      setPhone(displayPhone(currentUser.phone));
      setEmail(currentUser.email || "");
    }
    supabase.from("cities").select("id, name_ar").eq("is_active", true).order("sort_order").then(({ data }) => {
      if (data) setCities(data);
    });
    // Fetch city_id from users table
    if (currentUser?.id) {
      supabase.from("users").select("city_id").eq("id", currentUser.id).single().then(({ data }) => {
        if (data?.city_id) setCityId(data.city_id);
      });
    }
  }, [authLoading, currentUser, authUser]);

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("الاسم ورقم الهاتف مطلوبان");
      return;
    }
    const cleanedPhone = normalizeSyrianPhone(phone);
    const phoneCheck = validatePhone(cleanedPhone);
    if (!phoneCheck.valid) {
      toast.error(phoneCheck.error);
      return;
    }
    if (!currentUser) return;

    setSaving(true);
    try {
      if (isGuest) {
        // For guest users, update via direct table (public INSERT allowed, but UPDATE needs auth)
        // Just update local state
        const updatedGuest = { ...currentUser, name: name.trim(), phone: phone.trim(), email: email.trim() || null };
        setGuestUser(updatedGuest);
        toast.success("تم حفظ البيانات");
      } else {
        // Authenticated user — update via RLS
        const { error } = await supabase
          .from("users")
          .update({
            name: name.trim(),
            phone: cleanedPhone,
            email: email.trim() || null,
            city_id: cityId || null,
          })
          .eq("id", currentUser.id);

        if (error) throw error;
        toast.success("تم تحديث الملف الشخصي");
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full h-11 rounded-lg border border-wujha-border bg-wujha-surface px-4 text-sm text-wujha-text placeholder:text-wujha-text-muted focus:outline-none focus:ring-1 focus:ring-wujha-gold";

  if (authLoading) {
    return (
      <div dir="rtl" className="min-h-screen bg-wujha-bg flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-wujha-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-lg px-4 md:px-6 py-8">
        <div className="rounded-xl bg-wujha-surface border border-wujha-border p-6 space-y-5">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-wujha-gold text-wujha-gold-foreground text-2xl font-bold">
              {name.charAt(0) || "?"}
            </div>
          </div>

          {isGuest && (
            <p className="text-center text-wujha-text-muted text-xs bg-wujha-gold/10 rounded-lg py-2">
              أنت مسجل كزائر — سجّل دخولك لحفظ بياناتك بشكل دائم
            </p>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-wujha-text-muted mb-1.5">الاسم *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="الاسم الكامل" />
            </div>
            <div>
              <label className="block text-xs font-medium text-wujha-text-muted mb-1.5">رقم الهاتف *</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} dir="ltr" placeholder="0998XXXXXXX" />
            </div>
            <div>
              <label className="block text-xs font-medium text-wujha-text-muted mb-1.5">البريد الإلكتروني</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} dir="ltr" placeholder="email@example.com" />
            </div>
            {!isGuest && (
              <div>
                <label className="block text-xs font-medium text-wujha-text-muted mb-1.5">المدينة</label>
                <select value={cityId} onChange={e => setCityId(e.target.value)} className={inputClass}>
                  <option value="">اختر المدينة</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                </select>
              </div>
            )}
          </div>

          <button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-lg bg-wujha-gold font-bold text-wujha-gold-foreground transition hover:opacity-90 disabled:opacity-50 text-sm flex items-center justify-center gap-2">
            <Save className="h-4 w-4" />
            {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>
      </main>
    </div>
  );
}
