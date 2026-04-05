import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePublicAuth } from "@/contexts/PublicAuthContext";
import { Calendar, MapPin, Ticket, QrCode, CheckCircle, Clock, XCircle, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";


type TicketWithDetails = {
  id: string;
  status: string;
  qr_code: string;
  guest_name: string;
  guest_count: number;
  checked_in_at: string | null;
  created_at: string;
  payment_status: string;
  seating_area?: string | null;
  events: { id: string; title_ar: string; start_date: string; cover_image: string | null; venues: { name_ar: string } | null } | null;
  ticket_types: { name_ar: string; price: number; currency: string } | null;
};

export default function MyTickets() {
  const { authUser, publicUser, guestUser, loading: authLoading } = usePublicAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQr, setSelectedQr] = useState<string | null>(null);

  const currentUser = publicUser || guestUser;

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser && !authUser) {
      navigate("/");
      return;
    }
    fetchTickets();
  }, [authLoading, currentUser, authUser]);

  const fetchTickets = async () => {
    setLoading(true);

    if (currentUser) {
      // Use secure RPC for guest lookups
      const { data } = await supabase.rpc("get_tickets_by_guest", {
        _phone: currentUser.phone,
        _email: currentUser.email || "",
      });

      const mapped: TicketWithDetails[] = (data || []).map((t: any) => ({
        id: t.id,
        status: t.status,
        payment_status: t.payment_status,
        qr_code: t.qr_code,
        guest_name: t.guest_name,
        guest_count: t.guest_count,
        seating_area: t.seating_area,
        checked_in_at: t.checked_in_at,
        created_at: t.created_at,
        events: {
          id: t.event_id,
          title_ar: t.event_title_ar,
          start_date: t.event_start_date,
          cover_image: t.event_cover_image,
          venues: t.venue_name_ar ? { name_ar: t.venue_name_ar } : null,
        },
        ticket_types: t.ticket_type_name_ar ? {
          name_ar: t.ticket_type_name_ar,
          price: t.ticket_type_price,
          currency: t.ticket_type_currency,
        } : null,
      }));
      setTickets(mapped);
    } else if (authUser) {
      // Authenticated user — RLS policy allows reading own tickets via user_id
      const { data } = await supabase
        .from("tickets")
        .select("id, status, payment_status, qr_code, guest_name, guest_count, seating_area, checked_in_at, created_at, events(id, title_ar, start_date, cover_image, venues(name_ar)), ticket_types(name_ar, price, currency)")
        .order("created_at", { ascending: false });
      setTickets((data as unknown as TicketWithDetails[]) || []);
    }

    setLoading(false);
  };

  const getStatusInfo = (ticket: TicketWithDetails) => {
    if (ticket.checked_in_at) return { label: "تم الدخول", icon: CheckCircle, color: "text-green-400", bg: "bg-green-400/10" };
    if (ticket.status === "cancelled") return { label: "ملغاة", icon: XCircle, color: "text-red-400", bg: "bg-red-400/10" };
    if (ticket.payment_status === "pending") return { label: "بانتظار الدفع", icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10" };
    if (ticket.status === "expired") return { label: "منتهية", icon: Clock, color: "text-wujha-text-muted", bg: "bg-wujha-surface" };
    const eventDate = ticket.events?.start_date ? new Date(ticket.events.start_date) : null;
    if (eventDate && eventDate < new Date()) return { label: "منتهية", icon: Clock, color: "text-wujha-text-muted", bg: "bg-wujha-surface" };
    return { label: "صالحة", icon: Ticket, color: "text-wujha-gold", bg: "bg-wujha-gold/10" };
  };

  const formatDate = (date: string) => {
    try { return format(new Date(date), "d MMMM yyyy • HH:mm", { locale: ar }); }
    catch { return date; }
  };

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-3xl px-4 md:px-6 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-wujha-gold border-t-transparent" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20">
            <Ticket className="h-12 w-12 mx-auto text-wujha-text-muted mb-4" />
            <p className="text-wujha-text-muted text-lg">لا توجد تذاكر حالياً</p>
            <Link to="/" className="inline-block mt-4 text-wujha-gold hover:underline text-sm">تصفح الفعاليات</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map(ticket => {
              const status = getStatusInfo(ticket);
              const StatusIcon = status.icon;
              return (
                <div key={ticket.id} className="rounded-xl bg-wujha-surface border border-wujha-border overflow-hidden">
                  {/* Event cover strip */}
                  {ticket.events?.cover_image && (
                    <div className="h-24 overflow-hidden">
                      <img src={ticket.events.cover_image} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    {/* Event title & status */}
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-base line-clamp-2">{ticket.events?.title_ar || "فعالية"}</h3>
                      <span className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${status.bg} ${status.color}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {status.label}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5 text-xs text-wujha-text-muted">
                      {ticket.events?.start_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate(ticket.events.start_date)}</span>
                        </div>
                      )}
                      {ticket.events?.venues && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{(ticket.events.venues as any).name_ar}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Ticket className="h-3.5 w-3.5" />
                        <span>{ticket.ticket_types?.name_ar || "تذكرة"} • {ticket.guest_name} • {ticket.guest_count} {ticket.guest_count > 1 ? "أشخاص" : "شخص"}</span>
                      </div>
                    </div>

                    {/* Seating Area */}
                    {ticket.seating_area && (
                      <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-center">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block mb-0.5">المنطقة / Section</span>
                        <span className="text-amber-500 font-bold text-sm">{ticket.seating_area}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      {ticket.qr_code && ticket.status !== "pending_payment" && ticket.status !== "cancelled" && (
                        <button
                          onClick={() => setSelectedQr(selectedQr === ticket.id ? null : ticket.id)}
                          className="flex items-center gap-2 rounded-lg bg-wujha-gold/10 text-wujha-gold px-4 py-2 text-xs font-medium hover:bg-wujha-gold/20 transition"
                        >
                          <QrCode className="h-4 w-4" />
                          {selectedQr === ticket.id ? "إخفاء" : "عرض QR"}
                        </button>
                      )}
                      {ticket.status === "cancelled" && (
                        <a
                          href={`https://wa.me/963933000000?text=${encodeURIComponent(`مرحباً، تم رفض حجزي في ${ticket.events?.title_ar || "فعالية"} — كود التذكرة: ${(ticket as any).ticket_code || ticket.id.slice(0,8)}. أرجو المساعدة.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-lg bg-green-500/10 text-green-400 px-4 py-2 text-xs font-medium hover:bg-green-500/20 transition"
                        >
                          <MessageCircle className="h-4 w-4" />
                          تواصل مع الدعم
                        </a>
                      )}
                    </div>

                    {/* QR Code */}
                    {selectedQr === ticket.id && ticket.qr_code && ticket.status !== "pending_payment" && (
                      <div className="flex justify-center pt-3 pb-1">
                        <div className="bg-white p-2 rounded-lg shadow-lg">
                          <QRCodeSVG value={ticket.qr_code} size={160} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
