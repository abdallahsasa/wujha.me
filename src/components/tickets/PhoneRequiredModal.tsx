import { useState } from "react";
import { X, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { validatePhone, normalizeSyrianPhone } from "@/lib/phone-validation";

type Props = {
  open: boolean;
  onClose: () => void;
  userId: string;
  onPhoneSaved: (phone: string) => void;
};

export default function PhoneRequiredModal({ open, onClose, userId, onPhoneSaved }: Props) {
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  if (!open) return null;

  const handleSave = async () => {
    const trimmed = normalizeSyrianPhone(phone);
    const phoneCheck = validatePhone(trimmed);
    if (!phoneCheck.valid) {
      setPhoneError(phoneCheck.error || "");
      return;
    }
    setPhoneError("");

    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ phone: trimmed })
        .eq("id", userId);

      if (error) throw error;
      onPhoneSaved(trimmed);
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ، يرجى المحاولة مرة أخرى");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        dir="rtl"
        className="relative w-full max-w-sm mx-4 rounded-2xl bg-wujha-bg border border-wujha-border p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 left-4 text-wujha-text-muted hover:text-wujha-text transition">
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Phone className="h-5 w-5 text-wujha-accent" />
          <h2 className="text-lg font-bold">رقم الهاتف مطلوب</h2>
        </div>

        <p className="text-sm text-wujha-text-muted mb-4">
          يرجى إدخال رقم هاتفك لإتمام عملية الحجز
        </p>

        <div className="space-y-2 mb-6">
          <label className="text-sm font-medium text-wujha-text">رقم الهاتف *</label>
          <input
            value={phone}
            onChange={e => { setPhone(e.target.value); setPhoneError(""); }}
            placeholder="0998XXXXXXX"
            type="tel"
            dir="ltr"
            maxLength={20}
            className={`w-full h-11 rounded-lg border ${phoneError ? "border-destructive" : "border-wujha-border"} bg-wujha-surface px-3 text-sm text-wujha-text placeholder:text-wujha-text-muted focus:outline-none focus:border-wujha-accent/50 transition text-right`}
          />
          {phoneError && <p className="text-xs text-destructive mt-1">{phoneError}</p>}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-lg bg-wujha-accent py-3 text-sm font-bold text-wujha-accent-foreground transition hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          حفظ ومتابعة
        </button>
      </div>
    </div>
  );
}
