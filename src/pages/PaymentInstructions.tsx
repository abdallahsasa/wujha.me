import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Copy, ArrowRight, Clock, MessageCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Skeleton } from "@/components/ui/skeleton";

type TicketRow = {
  id: string;
  guest_name: string;
  guest_phone: string;
  payment_amount: number | null;
  payment_status: string;
  ticket_type_id: string;
  event_id: string;
  created_at: string;
};

type TicketTypeRow = {
  id: string;
  name_ar: string;
  price_new_syp: number | null;
  price_usd: number | null;
  price_old_syp: number | null;
};

type SiteSettings = {
  shamcash_enabled?: boolean;
  shamcash_number?: string;
  syriatel_cash_enabled?: boolean;
  syriatel_cash_number?: string;
  mtn_cash_enabled?: boolean;
  mtn_cash_number?: string;
  contact_whatsapp?: string;
};

const DEADLINE_HOURS = 24;

function useCountdown(createdAt: string | null) {
  const deadline = useMemo(() => {
    if (!createdAt) return null;
    return new Date(new Date(createdAt).getTime() + DEADLINE_HOURS * 60 * 60 * 1000);
  }, [createdAt]);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!deadline) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline) return { hours: 0, minutes: 0, seconds: 0, expired: true };

  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { hours, minutes, seconds, expired: false };
}

export default function PaymentInstructions() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { formatPrice, currencyLabel, currency } = useCurrency();

  const [ticket, setTicket] = useState<TicketRow | null>(null);
  const [event, setEvent] = useState<{ title_ar: string } | null>(null);
  const [siblingTickets, setSiblingTickets] = useState<TicketRow[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeRow[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);
  const [activeMethod, setActiveMethod] = useState<string | null>(null);

  const refCode = `WUJHA-${(ticketId || "").slice(0, 8).toUpperCase()}`;
  const countdown = useCountdown(ticket?.created_at ?? null);

  useEffect(() => {
    if (!ticketId) return;

    const load = async () => {
      const { data: t } = await supabase
        .from("tickets")
        .select("id, guest_name, guest_phone, payment_amount, payment_status, ticket_type_id, event_id, created_at")
        .eq("id", ticketId)
        .single();

      if (!t) { setLoading(false); return; }
      setTicket(t);

      const [eventRes, siblingsRes, settingsRes] = await Promise.all([
        supabase.from("events").select("title_ar").eq("id", t.event_id).single(),
        supabase.from("tickets")
          .select("id, guest_name, guest_phone, payment_amount, payment_status, ticket_type_id, event_id, created_at")
          .eq("event_id", t.event_id)
          .eq("guest_phone", t.guest_phone)
          .eq("payment_status", "pending"),
        supabase.from("page_content").select("metadata").eq("page_key", "site_settings").single(),
      ]);

      if (eventRes.data) setEvent(eventRes.data);

      const siblings = siblingsRes.data || [];
      setSiblingTickets(siblings);

      // Fetch ticket type details for the order summary
      const typeIds = [...new Set(siblings.map(s => s.ticket_type_id))];
      if (typeIds.length > 0) {
        const { data: types } = await supabase
          .from("ticket_types")
          .select("id, name_ar, price_new_syp, price_usd, price_old_syp")
          .in("id", typeIds);
        if (types) setTicketTypes(types);
      }

      if (settingsRes.data?.metadata) {
        const s = settingsRes.data.metadata as SiteSettings;
        setSettings(s);
        // Auto-select first enabled method
        if (s.shamcash_enabled && s.shamcash_number) setActiveMethod("shamcash");
        else if (s.syriatel_cash_enabled && s.syriatel_cash_number) setActiveMethod("syriatel");
        else if (s.mtn_cash_enabled && s.mtn_cash_number) setActiveMethod("mtn");
      }
      setLoading(false);
    };

    load();
  }, [ticketId]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ");
  };

  // Helper to get price for a ticket type in current currency
  const getPriceForType = (tt: TicketTypeRow): number => {
    if (currency === "usd") return tt.price_usd ?? 0;
    if (currency === "old_syp") return (tt.price_new_syp ?? 0) * 100;
    return tt.price_new_syp ?? 0;
  };

  // Group siblings by ticket_type_id for order summary
  const orderLines = useMemo(() => {
    const map = new Map<string, { type: TicketTypeRow; count: number }>();
    for (const s of siblingTickets) {
      const existing = map.get(s.ticket_type_id);
      const tt = ticketTypes.find(t => t.id === s.ticket_type_id);
      if (!tt) continue;
      if (existing) { existing.count++; }
      else { map.set(s.ticket_type_id, { type: tt, count: 1 }); }
    }
    return Array.from(map.values());
  }, [siblingTickets, ticketTypes]);

  const totalAmount = orderLines.reduce((sum, { type, count }) => sum + getPriceForType(type) * count, 0);
  const formattedTotal = `${totalAmount.toLocaleString()} ${currencyLabel}`;

  const paymentMethods = [
    { key: "shamcash", label: "شام كاش", number: settings.shamcash_number, enabled: settings.shamcash_enabled },
    { key: "syriatel", label: "سيريتل كاش", number: settings.syriatel_cash_number, enabled: settings.syriatel_cash_enabled },
    { key: "mtn", label: "MTN Cash", number: settings.mtn_cash_number, enabled: settings.mtn_cash_enabled },
  ].filter(m => m.enabled && m.number);

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-wujha-bg flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div dir="rtl" className="min-h-screen bg-wujha-bg flex flex-col items-center justify-center p-6 text-center">
        <p className="text-wujha-text-muted mb-4">لم يتم العثور على الحجز</p>
        <Link to="/" className="text-wujha-accent text-sm hover:underline">العودة للرئيسية</Link>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-wujha-bg">
      <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-wujha-accent/10 mb-4">
            <Clock className="h-7 w-7 text-wujha-accent" />
          </div>
          <h1 className="text-xl font-bold mb-1">بانتظار الدفع</h1>
          <p className="text-wujha-text-muted text-sm">{event?.title_ar}</p>
          <p className="text-wujha-accent text-sm mt-1">أهلاً {ticket.guest_name} 👋</p>
        </div>

        {/* Countdown Timer */}
        <div className={`rounded-xl border p-4 mb-6 text-center ${countdown.expired ? "border-destructive/30 bg-destructive/5" : "border-wujha-accent/30 bg-wujha-accent/5"}`}>
          {countdown.expired ? (
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-sm font-bold text-destructive">انتهت مهلة الدفع</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-wujha-text-muted mb-2">المهلة المتبقية للدفع</p>
              <div className="flex items-center justify-center gap-1 font-mono text-2xl font-bold text-wujha-accent" dir="ltr">
                <span className="bg-wujha-surface rounded-lg px-2 py-1 min-w-[2.5rem]">{pad(countdown.hours)}</span>
                <span className="text-wujha-text-muted">:</span>
                <span className="bg-wujha-surface rounded-lg px-2 py-1 min-w-[2.5rem]">{pad(countdown.minutes)}</span>
                <span className="text-wujha-text-muted">:</span>
                <span className="bg-wujha-surface rounded-lg px-2 py-1 min-w-[2.5rem]">{pad(countdown.seconds)}</span>
              </div>
              <p className="text-xs text-wujha-text-muted mt-2">يجب إتمام الدفع خلال 24 ساعة وإلا سيتم إلغاء الحجز</p>
            </>
          )}
        </div>

        {/* Reference Code */}
        <div className="rounded-xl border border-wujha-accent/30 bg-wujha-accent/5 p-4 mb-6 text-center">
          <p className="text-xs text-wujha-text-muted mb-2">كود المرجع — أرسله مع التحويل</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg font-mono font-bold tracking-wider text-wujha-accent">{refCode}</span>
            <button onClick={() => handleCopy(refCode)} className="text-wujha-text-muted hover:text-wujha-accent transition">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="rounded-xl border border-wujha-border p-4 mb-6">
          <p className="text-xs text-wujha-text-muted mb-3">ملخص الطلب</p>
          {orderLines.map(({ type, count }) => (
            <div key={type.id} className="flex justify-between text-sm mb-2">
              <span>{type.name_ar} × {count}</span>
              <span className="text-wujha-accent text-xs font-medium">
                {formatPrice({ price_new_syp: type.price_new_syp, price_usd: type.price_usd, price_old_syp: type.price_old_syp })}
              </span>
            </div>
          ))}
          <div className="border-t border-wujha-border pt-2 mt-2">
            <div className="flex justify-between text-sm font-bold">
              <span>المجموع</span>
              <span className="text-wujha-accent">{formattedTotal}</span>
            </div>
          </div>
        </div>

        {/* Payment Methods — Tabs */}
        {paymentMethods.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-bold mb-3">حوّل المبلغ إلى:</p>
            {/* Tabs */}
            <div className="flex gap-2 mb-3">
              {paymentMethods.map(m => (
                <button
                  key={m.key}
                  onClick={() => setActiveMethod(m.key)}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition border ${
                    activeMethod === m.key
                      ? "bg-wujha-accent text-wujha-accent-foreground border-wujha-accent"
                      : "bg-wujha-surface text-wujha-text-muted border-wujha-border hover:border-wujha-accent/30"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {/* Active method card */}
            {paymentMethods.filter(m => m.key === activeMethod).map(m => (
              <div key={m.key} className="rounded-xl border border-wujha-accent/20 bg-wujha-accent/5 p-4">
                <p className="text-xs text-wujha-text-muted mb-2">رقم الحساب — {m.label}</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-lg font-bold tracking-wider text-wujha-text" dir="ltr">{m.number}</span>
                  <button onClick={() => handleCopy(m.number!)} className="rounded-lg border border-wujha-border px-3 py-1.5 text-xs text-wujha-text-muted hover:text-wujha-accent hover:border-wujha-accent/30 transition">
                    <Copy className="h-3.5 w-3.5 inline ml-1" />
                    نسخ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="rounded-xl bg-wujha-surface border border-wujha-border p-4 mb-6">
          <p className="text-sm font-bold mb-3">خطوات الدفع:</p>
          <ol className="space-y-2 text-sm text-wujha-text-muted list-decimal pr-4">
            <li>حوّل المبلغ <span className="font-bold text-wujha-text">{formattedTotal}</span> إلى الرقم أعلاه</li>
            <li>أرسل كود المرجع <span className="font-bold text-wujha-accent">{refCode}</span> في ملاحظات التحويل</li>
            <li>أرسل إيصال التحويل عبر واتساب</li>
            <li>سيتم تأكيد تذكرتك وإرسال QR خلال ساعات</li>
          </ol>
        </div>

        {/* 24-hour notice */}
        <div className="rounded-xl bg-wujha-surface border border-wujha-border p-3 mb-6">
          <p className="text-xs text-wujha-text-muted text-center leading-relaxed">
            ⚠️ في حال عدم إتمام الدفع خلال <span className="font-bold text-wujha-text">24 ساعة</span> من وقت الحجز، سيتم إلغاء الحجز تلقائياً
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {settings.contact_whatsapp && (
            <a
              href={`https://wa.me/${settings.contact_whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`مرحباً، حجزت تذاكر بكود المرجع: ${refCode}\nالمبلغ: ${formattedTotal}\nالحدث: ${event?.title_ar || ""}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-lg bg-wujha-accent py-3 text-sm font-bold text-wujha-accent-foreground transition hover:opacity-90 flex items-center justify-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              إرسال إيصال عبر واتساب
            </a>
          )}
          <Link
            to="/"
            className="w-full rounded-lg border border-wujha-border py-3 text-sm font-medium text-wujha-text transition hover:border-wujha-accent/30 flex items-center justify-center gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
