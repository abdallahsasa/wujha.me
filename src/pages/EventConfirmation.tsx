import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeCanvas } from "qrcode.react";
import { CheckCircle2, Download, Loader2, Calendar, Clock, MapPin, MessageCircle, Hourglass, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { getEventShareUrl } from "@/lib/share-urls";

interface TicketData {
  id: string;
  guest_name: string;
  guest_phone: string;
  qr_code: string;
  ticket_code: string | null;
  event_id: string;
  status: string;
  payment_status: string;
  payment_reference: string | null;
  seating_area: string | null;
  events: {
    title_ar: string;
    slug: string;
    event_code: string | null;
    start_date: string;
    end_date: string | null;
    cover_image: string | null;
    venues: { name_ar: string; address_ar: string } | null;
  };
}

export default function EventConfirmation() {
  const { ticketId } = useParams<{ eventId: string; ticketId: string }>();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [supportWhatsApp, setSupportWhatsApp] = useState("");

  useEffect(() => {
    if (!ticketId) return;
    const fetchData = async () => {
      const [ticketsRes, settingsRes] = await Promise.all([
        supabase.rpc("get_tickets_for_confirmation", { _ticket_id: ticketId }),
        supabase
          .from("page_content")
          .select("metadata")
          .eq("page_key", "site_settings")
          .maybeSingle(),
      ]);

      if (settingsRes.data?.metadata) {
        const meta = settingsRes.data.metadata as Record<string, any>;
        setSupportWhatsApp(meta.contact_whatsapp || "");
      }

      if (!ticketsRes.data || ticketsRes.data.length === 0) { setLoading(false); return; }

      const mapped: TicketData[] = ticketsRes.data.map((t: any) => ({
        id: t.id,
        guest_name: t.guest_name,
        guest_phone: t.guest_phone,
        qr_code: t.qr_code,
        ticket_code: t.ticket_code,
        event_id: t.event_id,
        status: t.status,
        payment_status: t.payment_status,
        payment_reference: t.payment_reference,
        seating_area: t.seating_area,
        events: {
          title_ar: t.event_title_ar,
          slug: t.event_slug,
          event_code: t.event_code,
          start_date: t.event_start_date,
          end_date: t.event_end_date,
          cover_image: t.event_cover_image,
          venues: t.venue_name_ar ? { name_ar: t.venue_name_ar, address_ar: t.venue_address_ar } : null,
        },
      }));
      setTickets(mapped);
      setLoading(false);
    };
    fetchData();
  }, [ticketId]);

  const handleDownloadPdf = async () => {
    const { generateTicketsPdf } = await import("@/lib/ticket-pdf");
    if (tickets.length === 0) return;
    const ev = tickets[0].events;
    await generateTicketsPdf(
      tickets.map((t, i) => ({ qr_code: t.qr_code, guest_name: t.guest_name, ticket_code: t.ticket_code || undefined, index: i + 1, total: tickets.length })),
      { title_ar: ev.title_ar, event_code: ev.event_code || undefined, start_date: ev.start_date, venue_name: ev.venues?.name_ar, venue_address: ev.venues?.address_ar },
    );
  };

  const handleShareWhatsApp = () => {
    if (tickets.length === 0) return;
    const ev = tickets[0].events;
    const shareUrl = getEventShareUrl((ev as any).slug || tickets[0].event_id);
    const text = `أنا رايح على ${ev.title_ar}! سجّل من هون: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const openSupportWhatsApp = () => {
    if (!supportWhatsApp) return;
    const ref = tickets[0]?.payment_reference || "";
    const msg = encodeURIComponent(`مرحباً، أريد الاستفسار عن حجزي\nالمرجع: ${ref}`);
    window.open(`https://wa.me/${supportWhatsApp}?text=${msg}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white" dir="rtl">
        <h1 className="text-2xl font-bold mb-2">التذكرة غير موجودة</h1>
        <p className="text-gray-400">قد يكون الرابط غير صحيح</p>
      </div>
    );
  }

  const event = tickets[0].events;
  const startDate = new Date(event.start_date);
  const paymentStatus = tickets[0].payment_status;
  const isPending = paymentStatus === "pending";
  const isRejected = paymentStatus === "rejected";
  const isExpired = paymentStatus === "expired";
  const isConfirmed = paymentStatus === "paid" || paymentStatus === "free";
  const hasQr = tickets.some(t => t.qr_code && t.qr_code !== "");

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#0a0a0a] text-white flex flex-col items-center px-4 py-8 safe-bottom" dir="rtl">
      <div className="mb-8">
        <span className="text-2xl font-bold tracking-wider bg-gradient-to-l from-amber-300 to-amber-500 bg-clip-text text-transparent">WUJHA</span>
      </div>

      <div className="max-w-sm w-full">
        <div className="text-center mb-6">
          {isConfirmed && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mb-4"><CheckCircle2 className="h-8 w-8 text-amber-400" /></div>
              <h1 className="text-2xl font-bold mb-1">تم التسجيل بنجاح!</h1>
              <p className="text-amber-400 text-lg">أهلاً {tickets[0].guest_name} 👋</p>
              {tickets.length > 1 && <p className="text-gray-400 text-sm mt-1">{tickets.length} تذاكر</p>}
            </>
          )}
          {isPending && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mb-4"><Hourglass className="h-8 w-8 text-amber-400" /></div>
              <h1 className="text-2xl font-bold mb-1">بانتظار تأكيد الدفع</h1>
              <p className="text-amber-400 text-lg">أهلاً {tickets[0].guest_name} 👋</p>
              <p className="text-gray-400 text-sm mt-2">سيتم تفعيل تذاكرك بعد تأكيد عملية الدفع. ستصلك رسالة تأكيد على بريدك الإلكتروني.</p>
              {tickets[0].payment_reference && (
                <div className="mt-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">رمز المرجع</p>
                  <p className="text-lg font-mono font-bold text-amber-400">{tickets[0].payment_reference}</p>
                </div>
              )}
            </>
          )}
          {isRejected && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4"><XCircle className="h-8 w-8 text-red-400" /></div>
              <h1 className="text-2xl font-bold mb-1">تم رفض الدفع</h1>
              <p className="text-gray-400 text-sm mt-2">لم يتم تأكيد الدفع لحجزك. إذا كنت قد أجريت الدفع، يرجى التواصل مع الدعم.</p>
            </>
          )}
          {isExpired && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4"><XCircle className="h-8 w-8 text-red-400" /></div>
              <h1 className="text-2xl font-bold mb-1">انتهت مهلة الدفع</h1>
              <p className="text-gray-400 text-sm mt-2">انتهت مهلة الدفع (٢٤ ساعة) وتم إلغاء التذاكر تلقائياً. يمكنك إعادة الحجز.</p>
            </>
          )}
        </div>

        <div className="bg-gradient-to-b from-white/[0.08] to-white/[0.03] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm mb-4">
          <div className="p-5 space-y-3">
            <h2 className="text-xl font-bold leading-tight">{event.title_ar}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-amber-400/90"><Calendar className="h-4 w-4 shrink-0" /><bdi>{format(startDate, "EEEE d MMMM yyyy", { locale: ar })}</bdi></div>
              <div className="flex items-center gap-2 text-amber-400/90"><Clock className="h-4 w-4 shrink-0" /><bdi>{format(startDate, "h:mm a", { locale: ar })}</bdi></div>
              {event.venues && <div className="flex items-center gap-2 text-amber-400/90"><MapPin className="h-4 w-4 shrink-0" /><span>{event.venues.name_ar}</span></div>}
            </div>
          </div>
        </div>

        {isConfirmed && hasQr && tickets.map((ticket, i) => (
          <div key={ticket.id} className="bg-gradient-to-b from-white/[0.08] to-white/[0.03] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm mb-4">
            {tickets.length > 1 && (
              <div className="px-5 pt-3 flex items-center justify-between">
                <span className="text-xs text-gray-400">تذكرة {i + 1} من {tickets.length}</span>
                {ticket.ticket_code && <span className="text-xs font-mono text-gray-500">{ticket.ticket_code}</span>}
              </div>
            )}
            <div className="relative">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0a0a0a]" />
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0a0a0a]" />
              <div className="border-t border-dashed border-white/10 mx-6" />
            </div>
            <div className="p-6 flex flex-col items-center">
              <div className="bg-white p-2 rounded-lg mb-4 shadow-xl">
                <QRCodeCanvas 
                  value={ticket.qr_code} 
                  size={160} 
                  level="H" 
                  bgColor="#ffffff" 
                  fgColor="#0a0a0a" 
                  className="block"
                />
              </div>
              {ticket.ticket_code && <p className="text-[10px] font-mono text-amber-400/60 mb-2 tracking-widest">{ticket.ticket_code}</p>}
              {ticket.seating_area && (
                <div className="mb-4 text-center">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block mb-1">المنطقة / Section</span>
                  <span className="text-amber-400 font-bold bg-amber-500/10 px-3 py-1 rounded-full">{ticket.seating_area}</span>
                </div>
              )}
              <p className="text-[10px] text-gray-500 text-center leading-relaxed font-medium">أظهر رمز QR عند المدخل<br /><span className="opacity-60 italic">Show this QR code at the entrance</span></p>
            </div>
          </div>
        ))}

        <div className="mt-6 space-y-3">
          {isConfirmed && hasQr && (
            <>
              <Button onClick={handleDownloadPdf} className="w-full h-12 text-base font-bold bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black rounded-xl">
                <Download className="h-5 w-5 ml-2" /> تحميل التذاكر PDF
              </Button>
              <Button onClick={handleShareWhatsApp} variant="outline" className="w-full h-12 text-base font-medium border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-xl">
                <svg className="h-5 w-5 ml-2" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                مشاركة عبر واتساب
              </Button>
            </>
          )}
          {isPending && (
            <>
              <Link to={`/payment/${tickets[0].id}`}>
                <Button className="w-full h-12 text-base font-bold bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black rounded-xl">عرض تعليمات الدفع</Button>
              </Link>
              {supportWhatsApp && (
                <Button onClick={openSupportWhatsApp} variant="outline" className="w-full h-12 text-base font-medium border-white/10 bg-green-600/10 text-green-400 hover:bg-green-600/20 rounded-xl">
                  <MessageCircle className="h-5 w-5 ml-2" /> تواصل مع الدعم عبر واتساب
                </Button>
              )}
            </>
          )}
          {(isRejected || isExpired) && supportWhatsApp && (
            <Button onClick={openSupportWhatsApp} variant="outline" className="w-full h-12 text-base font-medium border-white/10 bg-green-600/10 text-green-400 hover:bg-green-600/20 rounded-xl">
              <MessageCircle className="h-5 w-5 ml-2" /> تواصل مع الدعم عبر واتساب
            </Button>
          )}
        </div>

        <div className="text-center mt-8 pb-4">
          <span className="text-xs text-gray-600">Powered by <span className="text-amber-500/60">WUJHA</span></span>
        </div>
      </div>
    </div>
  );
}
