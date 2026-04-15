import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, Loader2, LogIn, User } from "lucide-react";
import { optimizeUrl } from "@/lib/cloudinary";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { usePublicAuth } from "@/contexts/PublicAuthContext";
import LoginModal from "@/components/auth/LoginModal";

interface EventData {
  id: string;
  title_ar: string;
  description_ar: string;
  short_description_ar: string;
  start_date: string;
  end_date: string | null;
  cover_image: string | null;
  is_free: boolean;
  is_invitation_only: boolean;
  venue_id: string | null;
  venues?: { name_ar: string; address_ar: string } | null;
  cities?: { name_ar: string } | null;
  terms_ar?: string;
}

export default function EventInvitation() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { publicUser, guestUser, loading: authLoading } = usePublicAuth();

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Pre-fill form when auth state changes
  const currentUser = publicUser || guestUser;
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || "");
      setPhone(currentUser.phone || "");
      setEmail(currentUser.email || "");
    }
  }, [currentUser?.id]);

  const isLoggedIn = !!publicUser || !!guestUser;

  useEffect(() => {
    if (!eventId) return;
    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, venues(name_ar, address_ar), cities(name_ar)")
        .eq("id", eventId)
        .eq("status", "published")
        .single();

      if (error || !data) {
        setEvent(null);
      } else {
        setEvent(data as unknown as EventData);
      }
      setLoading(false);
    };
    fetchEvent();
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !eventId) return;

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedPhone) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      let userId: string;

      // If logged in (publicUser), use their ID directly
      if (publicUser) {
        userId = publicUser.id;
      } else if (guestUser) {
        userId = guestUser.id;
      } else {
        // Guest flow: find or create user by phone
        const { data: existingUsers } = await supabase
          .from("users")
          .select("id")
          .eq("phone", trimmedPhone)
          .limit(1);

        if (existingUsers && existingUsers.length > 0) {
          userId = existingUsers[0].id;
        } else {
          const { data: newUser, error: userErr } = await supabase
            .from("users")
            .insert({ name: trimmedName, phone: trimmedPhone, email: trimmedEmail || null })
            .select("id")
            .single();
          if (userErr || !newUser) throw userErr || new Error("Failed to create user");
          userId = newUser.id;
        }
      }

      // Get first active ticket type for this event
      const { data: ticketTypes } = await supabase
        .from("ticket_types")
        .select("id")
        .eq("event_id", eventId)
        .eq("is_active", true)
        .order("sort_order")
        .limit(1);

      if (!ticketTypes || ticketTypes.length === 0) {
        toast({ title: "لا توجد تذاكر متاحة حالياً", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      // Check if user already has a ticket for this event (via secure RPC)
      const { data: guestTickets } = await supabase.rpc("get_tickets_by_guest", {
        _phone: trimmedPhone,
        _email: "",
      });
      const existingTickets = (guestTickets || []).filter((t: any) => t.event_id === eventId);

      if (existingTickets && existingTickets.length > 0) {
        toast({ title: "لديك تذكرة مسجلة بالفعل لهذا الحدث" });
        navigate(`/invite/${eventId}/confirmation/${existingTickets[0].id}`);
        return;
      }

      // Determine quantity (from URL param or default 1)
      const urlParams = new URLSearchParams(window.location.search);
      const ticketQty = Math.max(1, Math.min(10, parseInt(urlParams.get("qty") || "1", 10)));
      const ticketTypeId = urlParams.get("ticketType") || ticketTypes[0].id;

      // Create N individual ticket rows
      const ticketInserts = Array.from({ length: ticketQty }, () => ({
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        user_id: userId,
        guest_name: trimmedName,
        guest_phone: trimmedPhone,
        guest_email: trimmedEmail || "",
        qr_code: crypto.randomUUID(),
        status: "valid",
        payment_status: "free",
      }));

      const { data: ticketData, error: ticketErr } = await supabase
        .from("tickets")
        .insert(ticketInserts)
        .select("id");

      if (ticketErr || !ticketData || ticketData.length === 0)
        throw ticketErr || new Error("Failed to create tickets");

      // Send confirmation email (fire-and-forget)
      if (trimmedEmail) {
        const startDate = new Date(event.start_date);
        const baseUrl = window.location.origin;
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "ticket-confirmation",
            recipientEmail: trimmedEmail,
            idempotencyKey: `ticket-confirm-${ticketData[0].id}`,
            templateData: {
              guestName: trimmedName,
              eventTitle: event.title_ar,
              eventDate: startDate.toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
              eventTime: startDate.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
              venueName: event.venues?.name_ar || "",
              ticketCount: ticketQty,
              confirmationUrl: `${baseUrl}/invite/${eventId}/confirmation/${ticketData[0].id}`,
              coverImage: event.cover_image || "",
              eventTerms: event.terms_ar,
            },
          },
        }).catch(console.error);
      }

      navigate(`/invite/${eventId}/confirmation/${ticketData[0].id}`);
    
    } catch (err) {
      console.error(err);
      toast({ title: "حدث خطأ، يرجى المحاولة مرة أخرى", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white" dir="rtl">
        <h1 className="text-2xl font-bold mb-2">الحدث غير موجود</h1>
        <p className="text-gray-400">قد يكون الرابط غير صحيح أو تم إلغاء الحدث</p>
      </div>
    );
  }

  const startDate = new Date(event.start_date);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#0a0a0a] text-white" dir="rtl">
      {/* Header with Logo */}
      <header className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-center">
        <div className="bg-black/40 backdrop-blur-md rounded-full px-6 py-2">
          <span className="text-xl font-bold tracking-wider bg-gradient-to-l from-amber-300 to-amber-500 bg-clip-text text-transparent">
            WUJHA
          </span>
        </div>
      </header>

      {/* Hero Cover Image */}
      <div className="relative w-full h-[50vh] min-h-[320px] overflow-hidden">
        {event.cover_image ? (
          <img
            src={optimizeUrl(event.cover_image || "")}
            alt={event.title_ar}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-900/40 via-[#0a0a0a] to-[#0a0a0a]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />

        {/* Event Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-3 drop-shadow-lg">
            {event.title_ar}
          </h1>
        </div>
      </div>

      {/* Event Details */}
      <div className="max-w-xl mx-auto px-5 -mt-2">
        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 text-amber-400/90">
            <Calendar className="h-5 w-5 shrink-0" />
            <bdi className="text-base">
              {format(startDate, "EEEE d MMMM yyyy", { locale: ar })}
            </bdi>
          </div>
          <div className="flex items-center gap-3 text-amber-400/90">
            <Clock className="h-5 w-5 shrink-0" />
            <bdi className="text-base">
              {format(startDate, "h:mm a", { locale: ar })}
            </bdi>
          </div>
          {event.venues && (
            <div className="flex items-center gap-3 text-amber-400/90">
              <MapPin className="h-5 w-5 shrink-0" />
              <span className="text-base">
                {event.venues.name_ar}
                {event.venues.address_ar && ` — ${event.venues.address_ar}`}
              </span>
            </div>
          )}
        </div>

        <p className="text-gray-300 leading-relaxed text-base mb-10">
          {event.short_description_ar || event.description_ar}
        </p>

        {/* Divider */}
        <div className="h-px bg-gradient-to-l from-transparent via-amber-500/30 to-transparent mb-8" />

        {/* Registration Form */}
        <div className="mb-16">
          <h2 className="text-xl font-bold mb-6 text-center">التسجيل في الحدث</h2>

          {/* Auth-aware banner */}
          {!isLoggedIn && !authLoading && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-amber-400"
              >
                <LogIn className="h-4 w-4" />
                <span className="text-sm font-medium">سجل دخولك لتسجيل أسرع</span>
              </button>
              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-gray-500">أو أكمل كزائر</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
            </div>
          )}

          {isLoggedIn && currentUser && (
            <div className="mb-5 flex items-center gap-2 text-sm text-amber-400/80">
              <User className="h-4 w-4" />
              <span>مرحباً، {currentUser.name}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300">الاسم الكامل *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="أدخل اسمك الكامل"
                required
                maxLength={100}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-amber-500/50 h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-300">رقم الهاتف *</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09XXXXXXXX"
                required
                maxLength={20}
                dir="ltr"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-amber-500/50 h-12 text-base text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                maxLength={255}
                dir="ltr"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-amber-500/50 h-12 text-base text-right"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-13 text-lg font-bold bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black rounded-xl shadow-lg shadow-amber-500/20 transition-all"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "تسجيل"
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center pb-8">
          <span className="text-xs text-gray-600">
            Powered by <span className="text-amber-500/60">WUJHA</span>
          </span>
        </div>
      </div>

      <LoginModal open={showLoginModal} onClose={() => setShowLoginModal(false)} context="general" />
    </div>
  );
}
