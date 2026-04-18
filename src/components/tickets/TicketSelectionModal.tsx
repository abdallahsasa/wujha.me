import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Minus, Plus, Ticket, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import PhoneRequiredModal from "./PhoneRequiredModal";
import { isPlaceholderPhone, displayPhone, validatePhone, normalizeSyrianPhone } from "@/lib/phone-validation";

type TicketType = {
  id: string; name_ar: string; name_en: string | null; description_ar: string | null;
  price: number; currency: string; quantity_total: number; quantity_sold: number;
  max_per_order: number;
  price_usd: number | null; price_new_syp: number | null; price_old_syp: number | null;
  is_free?: boolean;
};

type PublicUser = {
  id: string; name: string; phone: string; email: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  event: { id: string; title_ar: string; is_free: boolean; currency: string; terms_ar?: string } | null;
  ticketTypes: TicketType[];
  isLoggedIn: boolean;
  publicUser?: PublicUser | null;
  guestUser?: PublicUser | null;
};

type Step = "select" | "details";

export default function TicketSelectionModal({ open, onClose, event, ticketTypes, publicUser, guestUser }: Props) {
  const navigate = useNavigate();
  const { formatPrice, currency } = useCurrency();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [step, setStep] = useState<Step>("select");

  const currentUser = publicUser || guestUser;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || "");
      setPhone(displayPhone(currentUser.phone));
      setEmail(currentUser.email || "");
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("select");
        setQuantities({});
      }, 300);
    }
  }, [open]);

  if (!open || !event) return null;

  const isFree = event.is_free;
  const remaining = (tt: TicketType) => tt.quantity_total - tt.quantity_sold;
  const qty = (id: string) => quantities[id] || 0;
  const setQty = (id: string, val: number) => setQuantities(prev => ({ ...prev, [id]: val }));

  const increment = (tt: TicketType) => {
    const current = qty(tt.id);
    const max = Math.min(tt.max_per_order, remaining(tt));
    if (current < max) setQty(tt.id, current + 1);
  };
  const decrement = (id: string) => {
    const current = qty(id);
    if (current > 0) setQty(id, current - 1);
  };

  const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0);

  // Helper to get price for a ticket type in current currency
  const getPriceInCurrency = (tt: TicketType): number => {
    if (currency === "usd") return tt.price_usd ?? 0;
    if (currency === "old_syp") return (tt.price_new_syp ?? 0) * 100;
    return tt.price_new_syp ?? 0;
  };

  // Compute running total for paid events
  const runningTotal = !isFree
    ? ticketTypes.reduce((sum, tt) => sum + getPriceInCurrency(tt) * qty(tt.id), 0)
    : 0;

  const handleContinueFromSelect = () => {
    if (totalItems === 0) { toast.error("الرجاء اختيار تذكرة واحدة على الأقل"); return; }
    if (!isFree && publicUser && isPlaceholderPhone(publicUser.phone)) {
      setPhoneModalOpen(true);
      return;
    }
    setStep("details");
  };

  const handleConfirmBooking = async () => {
    const trimmedName = name.trim();
    const trimmedPhone = normalizeSyrianPhone(phone);
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName) { toast.error("الرجاء إدخال الاسم الكامل"); return; }
    
    // Validate name - only letters and spaces
    const nameRegex = /^[\u0600-\u06FFa-zA-Z\s]+$/;
    if (!nameRegex.test(trimmedName)) {
      toast.error("الاسم يجب أن يحتوي على حروف فقط");
      return;
    }

    if (!birthday) { toast.error("الرجاء إدخال تاريخ الميلاد"); return; }
    if (!trimmedPhone) { toast.error("الرجاء إدخال رقم الهاتف"); return; }

    const phoneValidation = validatePhone(trimmedPhone);
    if (!phoneValidation.valid) {
      setPhoneError(phoneValidation.error || "");
      return;
    }
    setPhoneError("");



    setSubmitting(true);

    try {
      let userId: string;
      if (publicUser) {
        userId = publicUser.id;
      } else if (guestUser) {
        userId = guestUser.id;
      } else {
        // Match by email only — phone matches silently reuse, new email = new user
        let existingUser: { id: string } | null = null;

        if (normalizedEmail) {
          const { data: byEmail } = await supabase
            .from("users").select("id").eq("email", normalizedEmail).limit(1);
          if (byEmail && byEmail.length > 0) {
            existingUser = byEmail[0];
            toast.info("هذا البريد مسجل مسبقاً — سيتم ربط الحجز بحسابك");
          }
        }

        if (existingUser) {
          userId = existingUser.id;
        } else {
          // New user — create a fresh record regardless of phone matches
          const { data: newUser, error: ue } = await supabase
            .from("users")
            .insert({ name: trimmedName, phone: trimmedPhone, email: normalizedEmail || null })
            .select("id").single();
          if (ue || !newUser) throw ue || new Error("Failed to create user");
          userId = newUser.id;
        }
      }

      const selectedTypes = ticketTypes.filter(tt => qty(tt.id) > 0);
      const ticketInserts: Array<{
        event_id: string; ticket_type_id: string; user_id: string;
        guest_name: string; guest_phone: string; guest_email: string;
        guest_birthday: string;
        guest_count: number;
        qr_code: string | null; status: string; payment_status: string;
        payment_method: string | null; payment_reference: string | null; payment_amount: number;
      }> = [];

      for (const tt of selectedTypes) {
        const count = qty(tt.id);
        for (let i = 0; i < count; i++) {
          ticketInserts.push({
            event_id: event.id,
            ticket_type_id: tt.id,
            user_id: userId,
            guest_name: trimmedName,
            guest_phone: trimmedPhone,
            guest_email: normalizedEmail || "",
            guest_birthday: birthday,
            guest_count: 1,
            qr_code: null,
            status: isFree ? "valid" : "pending_payment",
            payment_status: isFree ? "free" : "pending",
            payment_method: null,
            payment_reference: null,
            payment_amount: isFree ? 0 : (tt.price_new_syp || tt.price_usd || tt.price_old_syp || 0),
          });
        }
      }

      const { data: rpcResult, error: te } = await supabase
        .rpc("book_tickets", { _tickets: ticketInserts });

      if (te || !rpcResult || (rpcResult as any[]).length === 0) throw te || new Error("Failed to create tickets");
      const ticketData = rpcResult as Array<{ id: string; qr_code: string | null }>;

      // Update quantity_sold via secure RPC
      for (const tt of selectedTypes) {
        const q = qty(tt.id);
        await supabase.rpc("increment_ticket_quantity_sold", {
          _ticket_type_id: tt.id,
          _count: q,
        });
      }

      // Send confirmation email only for free tickets — paid tickets get email after admin approval
      if (normalizedEmail && isFree) {
        const baseUrl = window.location.origin;
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "ticket-confirmation",
            recipientEmail: normalizedEmail,
            idempotencyKey: `ticket-confirm-${ticketData[0].id}`,
            templateData: {
              guestName: trimmedName,
              eventTitle: event.title_ar,
              ticketCount: totalItems,
              confirmationUrl: `${baseUrl}/invite/${event.id}/confirmation/${ticketData[0].id}`,
              eventTerms: event.terms_ar,
            },
          },
        }).catch(console.error);
      }

      onClose();
      if (isFree) {
        navigate(`/invite/${event.id}/confirmation/${ticketData[0].id}`);
      } else {
        navigate(`/payment/${ticketData[0].id}`);
      }
    } catch (err: any) {
      console.error("=== TICKET BOOKING ERROR ===");
      console.error("Error object:", err);
      console.error("Message:", err?.message);
      console.error("Details:", err?.details);
      console.error("Hint:", err?.hint);
      console.error("Code:", err?.code);
      console.error("Stack:", err?.stack);
      const msg = err?.message || err?.details || String(err);
      toast.error(`خطأ في الحجز: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhoneSaved = (savedPhone: string) => {
    setPhone(savedPhone);
    setPhoneModalOpen(false);
    setStep("details");
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div
          dir="rtl"
          className="relative w-full max-w-lg mx-0 md:mx-4 rounded-t-2xl md:rounded-2xl bg-wujha-bg border border-wujha-border p-5 sm:p-6 shadow-2xl max-h-[90vh] max-h-[90dvh] overflow-y-auto safe-bottom"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={step === "select" ? onClose : () => setStep("select")}
            className="absolute top-4 left-4 text-wujha-text-muted hover:text-wujha-text transition">
            {step === "select" ? <X className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
          </button>

          {/* ===== STEP 1: Ticket Selection ===== */}
          {step === "select" && (
            <>
              <div className="flex items-center gap-2 mb-6">
                <Ticket className="h-5 w-5 text-wujha-accent" />
                <h2 className="text-lg font-bold">اختر التذاكر</h2>
              </div>

              <div className="space-y-4 mb-6">
                {ticketTypes.map(tt => {
                  const left = remaining(tt);
                  const soldOut = left <= 0;
                  const priceLabel = isFree ? "مجاني" : formatPrice(tt);
                  return (
                    <div key={tt.id} className={`rounded-xl border p-4 transition ${soldOut ? "border-wujha-border opacity-50" : "border-wujha-border hover:border-wujha-accent/30"}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-bold text-sm">{tt.name_ar}</p>
                          {tt.description_ar && <p className="text-wujha-text-muted text-xs mt-1">{tt.description_ar}</p>}
                          <p className="text-wujha-accent font-bold text-sm mt-2">{priceLabel}</p>
                          {!soldOut && left <= 20 && <p className="text-xs text-destructive mt-1">متبقي {left} فقط</p>}
                        </div>
                        {soldOut ? (
                          <span className="text-xs text-wujha-text-muted font-medium">نفدت</span>
                        ) : (
                          <div className="flex items-center gap-3">
                            <button onClick={() => decrement(tt.id)} disabled={qty(tt.id) === 0}
                              className="h-8 w-8 rounded-lg border border-wujha-border flex items-center justify-center text-wujha-text-muted hover:border-wujha-accent/30 disabled:opacity-30 transition">
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-6 text-center font-bold text-sm">{qty(tt.id)}</span>
                            <button onClick={() => increment(tt)} disabled={qty(tt.id) >= Math.min(tt.max_per_order, left)}
                              className="h-8 w-8 rounded-lg border border-wujha-border flex items-center justify-center text-wujha-text-muted hover:border-wujha-accent/30 disabled:opacity-30 transition">
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-wujha-border pt-4">
                {totalItems > 0 && (
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-wujha-text-muted text-sm">{totalItems} تذكرة</span>
                    <span className="text-lg font-bold text-wujha-accent">
                      {isFree ? "مجاني" : formatPrice({
                        price_new_syp: currency === "new_syp" ? runningTotal : null,
                        price_usd: currency === "usd" ? runningTotal : null,
                        price_old_syp: currency === "old_syp" ? runningTotal : null,
                      })}
                    </span>
                  </div>
                )}
                <button onClick={handleContinueFromSelect} disabled={totalItems === 0}
                  className="w-full rounded-lg bg-wujha-accent py-3 text-sm font-bold text-wujha-accent-foreground transition hover:opacity-90 disabled:opacity-40">
                  {isFree ? "سجّل الآن" : "احجز الآن"}
                </button>
              </div>
            </>
          )}

          {/* ===== STEP 2: Guest Details ===== */}
          {step === "details" && (
            <>
              <div className="flex items-center gap-2 mb-6">
                <Ticket className="h-5 w-5 text-wujha-accent" />
                <h2 className="text-lg font-bold">{isFree ? "بيانات التسجيل" : "بيانات الحجز"}</h2>
              </div>

              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-wujha-text">الاسم الكامل *</label>
                  <input value={name} onChange={e => !publicUser && setName(e.target.value)} placeholder="أدخل اسمك الكامل"
                    maxLength={100} readOnly={!!publicUser}
                    className={`w-full h-11 rounded-lg border border-wujha-border bg-wujha-surface px-3 text-sm text-wujha-text placeholder:text-wujha-text-muted focus:outline-none focus:border-wujha-accent/50 transition ${publicUser ? "opacity-60 cursor-not-allowed" : ""}`} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-wujha-text">رقم الهاتف <span className="text-destructive">*</span></label>
                  <input value={phone} onChange={e => { setPhone(e.target.value); setPhoneError(""); }} placeholder="0998XXXXXXX" type="tel" dir="ltr"
                    maxLength={20}
                    className={`w-full h-11 rounded-lg border ${phoneError ? "border-destructive" : "border-wujha-border"} bg-wujha-surface px-3 text-sm text-wujha-text placeholder:text-wujha-text-muted focus:outline-none focus:border-wujha-accent/50 transition text-right`} />
                  {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
                </div>
                <div className="space-y-2">
                    البريد الإلكتروني (اختياري)
                  </label>
                  <input value={email} onChange={e => !publicUser && setEmail(e.target.value)} placeholder="email@example.com" type="email" dir="ltr"
                    maxLength={255} readOnly={!!publicUser}
                    className={`w-full h-11 rounded-lg border border-wujha-border bg-wujha-surface px-3 text-sm text-wujha-text placeholder:text-wujha-text-muted focus:outline-none focus:border-wujha-accent/50 transition text-right ${publicUser ? "opacity-60 cursor-not-allowed" : ""}`} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-wujha-text">تاريخ الميلاد *</label>
                  <input 
                    value={birthday} 
                    onChange={e => setBirthday(e.target.value)} 
                    type="date" 
                    className="w-full h-11 rounded-lg border border-wujha-border bg-wujha-surface px-3 text-sm text-wujha-text focus:outline-none focus:border-wujha-accent/50 transition" 
                  />
                </div>
              </div>

              {/* Order summary */}
              <div className="rounded-xl border border-wujha-border p-4 mb-6">
                <p className="text-xs text-wujha-text-muted mb-2">ملخص الطلب</p>
                {ticketTypes.filter(tt => qty(tt.id) > 0).map(tt => (
                  <div key={tt.id} className="flex justify-between text-sm mb-1">
                    <span>{tt.name_ar} × {qty(tt.id)}</span>
                    <span className="text-wujha-accent text-xs">{isFree ? "مجاني" : formatPrice(tt)}</span>
                  </div>
                ))}
                {!isFree && (
                  <div className="border-t border-wujha-border pt-2 mt-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span>المجموع</span>
                      <span className="text-wujha-accent">{formatPrice({
                        price_new_syp: currency === "new_syp" ? runningTotal : null,
                        price_usd: currency === "usd" ? runningTotal : null,
                        price_old_syp: currency === "old_syp" ? runningTotal : null,
                      })}</span>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleConfirmBooking} disabled={submitting}
                className="w-full rounded-lg bg-wujha-accent py-3 text-sm font-bold text-wujha-accent-foreground transition hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isFree ? "تأكيد التسجيل" : "تأكيد الحجز"}
              </button>
            </>
          )}
        </div>
      </div>

      {publicUser && (
        <PhoneRequiredModal
          open={phoneModalOpen}
          onClose={() => setPhoneModalOpen(false)}
          userId={publicUser.id}
          onPhoneSaved={handlePhoneSaved}
        />
      )}
    </>
  );
}
