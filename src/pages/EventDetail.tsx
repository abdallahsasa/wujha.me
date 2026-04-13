import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { usePublicAuth } from "@/contexts/PublicAuthContext";
import LoginModal from "@/components/auth/LoginModal";
import TicketSelectionModal from "@/components/tickets/TicketSelectionModal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Calendar, MapPin, Clock, Phone, Copy, Play, X as XIcon,
  MessageCircle, Facebook, ChevronLeft, ChevronRight, Heart,
  Shield, Zap, CheckCircle, Headphones, Share2, DoorOpen,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getEventShareUrl, getCanonicalEventUrl } from "@/lib/share-urls";
import { optimizeUrl, galleryUrl, thumbnailUrl } from "@/lib/cloudinary";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type TicketType = {
  id: string; name_ar: string; name_en: string | null; description_ar: string | null;
  price: number; currency: string; quantity_total: number; quantity_sold: number;
  max_per_order: number; is_active: boolean; sort_order: number;
  price_usd: number | null; price_new_syp: number | null; price_old_syp: number | null;
};

type EventData = {
  id: string; slug: string; title_ar: string; title_en: string | null; description_ar: string;
  short_description_ar: string; cover_image: string | null; hero_video: string | null;
  hero_thumbnail: string | null; images: string[] | null; start_date: string;
  end_date: string | null; doors_open: string | null; is_free: boolean;
  is_invitation_only: boolean; min_price: number | null; max_price: number | null;
  currency: string; age_restriction: string | null; dress_code: string | null;
  terms_ar: string | null; status: string; category_id: string; video_url: string | null;
  venues: { id: string; name_ar: string; address_ar: string; latitude: number; longitude: number; phone: string | null; whatsapp: string | null } | null;
  cities: { name_ar: string } | null;
  categories: { id: string; name_ar: string } | null;
  organizers: { name_ar: string; name_en: string | null; logo: string | null; description_ar: string | null } | null;
};

type RelatedEvent = {
  id: string; slug: string; title_ar: string; cover_image: string | null; start_date: string;
  is_free: boolean; min_price: number | null; currency: string;
  venues: { name_ar: string } | null;
};

const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/* ── helpers ── */
const fmtDate = (d: string) => { try { return format(new Date(d), "EEEE d MMMM yyyy", { locale: ar }); } catch { return d; } };
const fmtDateShort = (d: string) => { try { return format(new Date(d), "EEEE d MMMM", { locale: ar }); } catch { return d; } };
const fmtTime = (d: string) => { try { return format(new Date(d), "HH:mm", { locale: ar }); } catch { return ""; } };

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { authUser, publicUser, guestUser } = usePublicAuth();
  const { formatMinPrice } = useCurrency();
  const isLoggedIn = !!authUser || !!guestUser;

  const [event, setEvent] = useState<EventData | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [relatedEvents, setRelatedEvents] = useState<RelatedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginContext, setLoginContext] = useState<"order" | "general">("general");
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [pendingBookAfterLogin, setPendingBookAfterLogin] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [videoLightbox, setVideoLightbox] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const relatedScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!eventId) return;
    const fetchData = async () => {
      setLoading(true);
      const col = isUUID(eventId) ? "id" : "slug";
      const [evRes, ttRes] = await Promise.all([
        supabase.from("events")
          .select("*, venues(id, name_ar, address_ar, latitude, longitude, phone, whatsapp), cities(name_ar), categories(id, name_ar), organizers(name_ar, name_en, logo, description_ar)")
          .eq(col, eventId).single(),
        col === "id"
          ? supabase.from("ticket_types").select("*").eq("event_id", eventId).eq("is_active", true).order("sort_order")
          : Promise.resolve({ data: null }),
      ]);
      if (evRes.data) {
        const ev = evRes.data as unknown as EventData;
        // If accessed by UUID, redirect to slug URL
        if (isUUID(eventId) && (ev as any).slug) {
          window.history.replaceState(null, '', `/events/${(ev as any).slug}`);
        }
        setEvent(ev);
        // Fetch ticket types by actual event id
        if (col !== "id") {
          const { data: tt } = await supabase.from("ticket_types").select("*").eq("event_id", ev.id).eq("is_active", true).order("sort_order");
          if (tt) setTicketTypes(tt as TicketType[]);
        } else if (ttRes.data) {
          setTicketTypes(ttRes.data as TicketType[]);
        }
        const catId = (evRes.data as any).category_id;
        const relRes = await supabase.from("events")
          .select("id, slug, title_ar, cover_image, start_date, is_free, min_price, currency, venues(name_ar)")
          .eq("category_id", catId).eq("status", "published").neq("id", ev.id)
          .order("start_date").limit(8);
        if (relRes.data) setRelatedEvents(relRes.data as unknown as RelatedEvent[]);
      }
      setLoading(false);
    };
    fetchData();
  }, [eventId]);

  useEffect(() => {
    if (!publicUser || !event) return;
    supabase.from("favorites").select("id").eq("user_id", publicUser.id).eq("event_id", event.id).maybeSingle()
      .then(({ data }) => setIsFavorite(!!data));
  }, [publicUser, event?.id]);

  useEffect(() => {
    if (pendingBookAfterLogin && isLoggedIn) {
      setPendingBookAfterLogin(false);
      setTicketModalOpen(true);
    }
  }, [isLoggedIn, pendingBookAfterLogin]);

  const handleBookNow = () => {
    if (event?.is_invitation_only) return;
    if (!event?.is_free && !isLoggedIn) {
      setPendingBookAfterLogin(true);
      setLoginContext("order");
      setLoginOpen(true);
      return;
    }
    setTicketModalOpen(true);
  };

  const eventSlug = event?.slug || event?.id || eventId || "";
  const shareUrl = getEventShareUrl(eventSlug);
  const isPast = event ? new Date(event.end_date || event.start_date) < new Date() : false;

  const toggleFavorite = async () => {
    if (!authUser || !publicUser) {
      setLoginContext("general");
      setLoginOpen(true);
      return;
    }
    if (!event) return;
    if (isFavorite) {
      await supabase.from("favorites").delete().eq("user_id", publicUser.id).eq("event_id", event.id);
      setIsFavorite(false);
    } else {
      await supabase.from("favorites").insert({ user_id: publicUser.id, event_id: event.id });
      setIsFavorite(true);
    }
  };

  const handleCopyLink = () => { navigator.clipboard.writeText(shareUrl); toast.success("تم نسخ الرابط"); };
  const handleWhatsAppShare = () => {
    if (!event) return;
    const fmtShareDate = (() => { try { return format(new Date(event.start_date), "d MMMM yyyy", { locale: ar }); } catch { return ""; } })();
    const text = `🎉 ${event.title_ar}\n📅 ${fmtShareDate}\n🎟️ احجز الآن على وجهة:\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };
  const handleFacebookShare = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank");
  };
  const handleXShare = () => {
    const text = `${event?.title_ar} — احجز الآن على وجهة`;
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  const scrollRelated = (dir: "left" | "right") => {
    if (!relatedScrollRef.current) return;
    const amount = dir === "left" ? -280 : 280;
    relatedScrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  const minPriceLabel = useMemo(() => formatMinPrice(ticketTypes), [ticketTypes, formatMinPrice]);
  const isFree = event?.is_free ?? false;

  const hasEventInfo = event && (event.age_restriction || event.dress_code || event.terms_ar || event.organizers?.description_ar);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-[hsl(var(--wujha-accent))] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <p className="text-xl font-bold">الفعالية غير موجودة</p>
        <Link to="/" className="text-[hsl(var(--wujha-accent))] hover:underline">العودة للرئيسية</Link>
      </div>
    );
  }

  /* ── Booking Card Content (shared desktop & mobile drawer) ── */
  const BookingCardContent = () => (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-[hsl(var(--wujha-accent))]" />
        <span className="font-semibold text-sm">{fmtDateShort(event.start_date)}</span>
      </div>
      <div className="h-px bg-[hsl(var(--wujha-border))] mb-4" />
      {isFree ? (
        <p className="text-2xl font-bold text-[hsl(var(--wujha-accent))] mb-4">مجاني</p>
      ) : minPriceLabel ? (
        <div className="mb-4">
          <p className="text-xs text-[hsl(var(--wujha-text-muted))] mb-1">السعر يبدأ من:</p>
          <span className="text-xl font-bold">{minPriceLabel}</span>
        </div>
      ) : null}
      {isPast ? (
        <span className="block w-full text-center rounded-xl bg-gray-100 px-6 py-3.5 text-sm font-bold text-gray-400 cursor-default">انتهت الفعالية</span>
      ) : event.is_invitation_only ? (
        <span className="block w-full text-center rounded-xl bg-gray-100 px-6 py-3.5 text-sm font-bold text-gray-400 cursor-default">بدعوة فقط</span>
      ) : (
        <button onClick={handleBookNow} className="w-full rounded-xl bg-[hsl(var(--wujha-accent))] px-6 py-3.5 text-sm font-bold text-white transition hover:opacity-90">احجز الآن</button>
      )}
    </>
  );

  const canonicalUrl = getCanonicalEventUrl(eventSlug);
  const ogImage = event.cover_image || "";

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{event.title_ar} — وجهة</title>
        <meta name="description" content={event.short_description_ar} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={event.title_ar} />
        <meta property="og:description" content={event.short_description_ar} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="وجهة | Wujha" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={event.title_ar} />
        <meta name="twitter:description" content={event.short_description_ar} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>
      {/* ═══ COVER IMAGE ═══ */}
      <section className="relative w-full h-[200px] md:h-[380px] overflow-hidden">
        <img
          src={optimizeUrl(event.hero_thumbnail || event.cover_image || "") || "/placeholder.svg"}
          alt={event.title_ar}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <button
          onClick={toggleFavorite}
          className={`absolute top-4 left-4 rounded-full p-2.5 backdrop-blur-sm transition ${
            isFavorite ? "bg-red-500/20 text-red-500" : "bg-white/20 text-white hover:bg-white/30"
          }`}
          title={isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
        >
          <Heart className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
        </button>
        {event.video_url && (
          <button onClick={() => setVideoLightbox(true)} className="absolute inset-0 flex items-center justify-center group">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/90 flex items-center justify-center shadow-lg transition group-hover:scale-110">
              <Play className="h-7 w-7 md:h-8 md:w-8 text-[hsl(var(--wujha-text))] mr-[-2px]" fill="currentColor" />
            </div>
          </button>
        )}
      </section>

      {/* ═══ VIDEO LIGHTBOX ═══ */}
      {videoLightbox && event.video_url && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setVideoLightbox(false)}>
          <button className="absolute top-4 left-4 text-white/80 hover:text-white z-10" onClick={() => setVideoLightbox(false)}>
            <XIcon className="h-8 w-8" />
          </button>
          <div className="w-full max-w-4xl aspect-video" onClick={e => e.stopPropagation()}>
            <video src={event.video_url} controls autoPlay className="w-full h-full rounded-lg" />
          </div>
        </div>
      )}

      {/* ═══ TWO-COLUMN LAYOUT ═══ */}
      <div className="mx-auto max-w-[1200px] px-4 md:px-6 py-8">
        <div className="flex flex-col lg:flex-row-reverse gap-8">
          {/* ═══ RIGHT COLUMN — Content (60%) ═══ */}
          <div className="flex-1 min-w-0 lg:w-[60%]">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">{event.title_ar}</h1>
            <p className="text-[hsl(var(--wujha-text-muted))] text-base mb-5">{event.short_description_ar}</p>

            <div className="flex flex-wrap items-center gap-4 mb-5 text-sm">
              {event.doors_open && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <DoorOpen className="h-4 w-4 text-[hsl(var(--wujha-accent))]" />
                  <span>الأبواب تفتح: <strong>{fmtTime(event.doors_open)}</strong></span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <Clock className="h-4 w-4 text-[hsl(var(--wujha-accent))]" />
                <span>تبدأ الفعالية: <strong>{fmtTime(event.start_date)}</strong></span>
              </div>
              {event.end_date && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <Clock className="h-4 w-4 text-[hsl(var(--wujha-text-muted))]" />
                  <span>تنتهي: <strong>{fmtTime(event.end_date)}</strong></span>
                </div>
              )}
            </div>

            {event.venues && (
              <a href={`https://www.google.com/maps?q=${event.venues.latitude},${event.venues.longitude}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[hsl(var(--wujha-accent))] text-sm hover:underline mb-6">
                <MapPin className="h-4 w-4" />
                {event.venues.name_ar}{event.cities ? ` — ${event.cities.name_ar}` : ""}
              </a>
            )}

            {/* ── Share Row ── */}
            <div className="flex flex-wrap items-center gap-2 mb-8">
              <button onClick={handleWhatsAppShare} className="flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90">
                <MessageCircle className="h-4 w-4" /> واتساب
              </button>
              <button onClick={handleCopyLink} className="flex items-center justify-center rounded-full w-10 h-10 border border-[hsl(var(--wujha-border))] bg-white hover:bg-gray-50 transition" title="نسخ الرابط">
                <Copy className="h-4 w-4 text-[hsl(var(--wujha-text-muted))]" />
              </button>
              <button onClick={handleFacebookShare} className="flex items-center justify-center rounded-full w-10 h-10 border border-[hsl(var(--wujha-border))] bg-white hover:bg-gray-50 transition" title="فيسبوك">
                <Facebook className="h-4 w-4 text-[hsl(var(--wujha-text-muted))]" />
              </button>
              <button onClick={handleXShare} className="flex items-center justify-center rounded-full w-10 h-10 border border-[hsl(var(--wujha-border))] bg-white hover:bg-gray-50 transition" title="X">
                <svg className="h-4 w-4 text-[hsl(var(--wujha-text-muted))]" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </button>
            </div>

            {/* ── Full Description ── */}
            <div className="mb-8">
              <div className="text-[hsl(var(--wujha-text))] text-[15px] leading-[1.9] whitespace-pre-wrap">{event.description_ar}</div>
            </div>

            {/* ── Gallery ── */}
            {Array.isArray(event.images) && event.images.length > 0 && (
              <div className="mb-8">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(event.images as string[]).map((img, i) => (
                    <div key={i} className="aspect-video rounded-xl overflow-hidden">
                      <img src={galleryUrl(img)} alt={`${event.title_ar} ${i + 1}`} className="h-full w-full object-cover hover:scale-105 transition-transform duration-300" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Accordions ── */}
            <Accordion type="multiple" className="mb-8" defaultValue={["info", "directions"]}>
              {hasEventInfo && (
                <AccordionItem value="info" className="border border-[hsl(var(--wujha-border))] rounded-xl mb-3 px-4 overflow-hidden">
                  <AccordionTrigger className="hover:no-underline text-base font-bold">معلومات الفعالية</AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2 text-sm text-[hsl(var(--wujha-text-muted))]">
                      {event.age_restriction && <li>• القيود العمرية: {event.age_restriction}</li>}
                      {event.dress_code && <li>• الزي المطلوب: {event.dress_code}</li>}
                      {event.terms_ar && <li>• الشروط والأحكام: {event.terms_ar}</li>}
                      {event.organizers?.description_ar && <li>• ملاحظة المنظم: {event.organizers.description_ar}</li>}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
              {event.venues && (
                <AccordionItem value="directions" className="border border-[hsl(var(--wujha-border))] rounded-xl mb-3 px-4 overflow-hidden">
                  <AccordionTrigger className="hover:no-underline text-base font-bold">كيفية الوصول</AccordionTrigger>
                  <AccordionContent>
                    <div className="text-sm text-[hsl(var(--wujha-text-muted))] space-y-2">
                      <p>{event.venues.address_ar}</p>
                      <a href={`https://www.google.com/maps?q=${event.venues.latitude},${event.venues.longitude}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[hsl(var(--wujha-accent))] hover:underline">
                        <MapPin className="h-4 w-4" /> فتح في خرائط غوغل
                      </a>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>

            {/* ── Location Section ── */}
            {event.venues && (
              <div className="mb-8">
                <h2 className="text-lg font-bold mb-4">الموقع</h2>
                <div className="space-y-3">
                  <p className="font-semibold">{event.venues.name_ar}</p>
                  <p className="text-sm text-[hsl(var(--wujha-text-muted))] flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> {event.venues.address_ar}
                  </p>
                  {event.venues.latitude && event.venues.longitude && (
                    <div className="rounded-xl overflow-hidden border border-[hsl(var(--wujha-border))]">
                      <iframe title="الموقع على الخريطة" src={`https://www.google.com/maps?q=${event.venues.latitude},${event.venues.longitude}&z=15&output=embed`} className="w-full h-[250px]" loading="lazy" allowFullScreen />
                    </div>
                  )}
                  {event.venues.phone && (
                    <a href={`tel:${event.venues.phone}`} className="text-[hsl(var(--wujha-accent))] text-sm flex items-center gap-1.5 hover:underline">
                      <Phone className="h-4 w-4" /> {event.venues.phone}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* ── Related Events ── */}
            {relatedEvents.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">قد يعجبك أيضاً</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => scrollRelated("right")} className="w-8 h-8 rounded-full border border-[hsl(var(--wujha-border))] flex items-center justify-center hover:bg-gray-50 transition"><ChevronRight className="h-4 w-4" /></button>
                    <button onClick={() => scrollRelated("left")} className="w-8 h-8 rounded-full border border-[hsl(var(--wujha-border))] flex items-center justify-center hover:bg-gray-50 transition"><ChevronLeft className="h-4 w-4" /></button>
                  </div>
                </div>
                <div ref={relatedScrollRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollBehavior: "smooth" }}>
                  {relatedEvents.map(ev => (
                    <Link key={ev.id} to={`/events/${ev.slug || ev.id}`}
                      className="shrink-0 w-[260px] rounded-xl overflow-hidden bg-white border border-[hsl(var(--wujha-border))] hover:shadow-md transition-all group">
                      <div className="relative aspect-[16/9] overflow-hidden">
                        <img src={thumbnailUrl(ev.cover_image || "") || "/placeholder.svg"} alt={ev.title_ar} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      </div>
                      <div className="p-3">
                        <h3 className="font-bold text-sm mb-1 line-clamp-1">{ev.title_ar}</h3>
                        <p className="text-[hsl(var(--wujha-text-muted))] text-xs flex items-center gap-1 mb-1"><Calendar className="h-3 w-3" />{fmtDate(ev.start_date)}</p>
                        <p className="text-xs font-bold text-[hsl(var(--wujha-accent))]">
                          {ev.is_free ? "مجاني" : ev.min_price ? `ابتداءً من ${ev.min_price.toLocaleString()} ${ev.currency === "SYP" ? "ل.س" : ev.currency}` : ""}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── Trust Bar ── */}
            <div className="mb-8">
              <h2 className="text-lg font-bold mb-4">لماذا وجهة؟</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Shield, title: "حجز آمن", desc: "بياناتك محمية بالكامل" },
                  { icon: Zap, title: "تأكيد فوري", desc: "تذكرتك جاهزة فوراً" },
                  { icon: CheckCircle, title: "فعاليات موثّقة", desc: "نتحقق من كل منظم" },
                  { icon: Headphones, title: "دعم العملاء", desc: "فريق جاهز لمساعدتك" },
                ].map((item, i) => (
                  <div key={i} className="text-center p-4 rounded-xl bg-gray-50">
                    <item.icon className="h-6 w-6 mx-auto mb-2 text-[hsl(var(--wujha-accent))]" />
                    <p className="text-sm font-bold mb-1">{item.title}</p>
                    <p className="text-xs text-[hsl(var(--wujha-text-muted))]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Payment Methods ── */}
            {!isFree && !event.is_invitation_only && (
              <div className="mb-8">
                <h2 className="text-lg font-bold mb-4">طرق الدفع</h2>
                <div className="flex flex-wrap gap-3">
                  {["شام كاش", "سيرياتيل كاش", "MTN Cash", "نقداً"].map((method, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-[hsl(var(--wujha-border))] px-4 py-2.5 text-sm"><span>{method}</span></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ═══ LEFT COLUMN — Sticky Booking Card (35%) ═══ */}
          <div className="hidden lg:block lg:w-[35%] shrink-0">
            <div className="sticky top-[80px] space-y-4">
              <div className="rounded-2xl border border-[hsl(var(--wujha-border))] p-6 bg-white shadow-sm"><BookingCardContent /></div>
              <div className="rounded-2xl border border-[hsl(var(--wujha-border))] p-4 bg-gray-50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(var(--wujha-accent))]/10 flex items-center justify-center shrink-0">
                  <Share2 className="h-5 w-5 text-[hsl(var(--wujha-accent))]" />
                </div>
                <p className="text-sm text-[hsl(var(--wujha-text-muted))]">يمكنك مشاركة التذكرة مع صديق بعد الحجز</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MOBILE STICKY BOTTOM BAR ═══ */}
      {!isPast && !event.is_invitation_only && (
        <div className="fixed bottom-0 right-0 left-0 z-40 border-t border-[hsl(var(--wujha-border))] bg-white/95 backdrop-blur-lg p-3 safe-bottom lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => setMobileDrawerOpen(true)} className="flex-1 min-w-0 text-right">
              {isFree ? (
                <span className="text-base font-bold text-[hsl(var(--wujha-accent))]">مجاني</span>
              ) : minPriceLabel ? (
                <div><span className="text-base font-bold">{minPriceLabel}</span></div>
              ) : null}
            </button>
            <button onClick={handleBookNow} className="rounded-xl bg-[hsl(var(--wujha-accent))] px-8 py-3 text-sm font-bold text-white transition hover:opacity-90">احجز الآن</button>
          </div>
        </div>
      )}

      {event.is_invitation_only && (
        <div className="fixed bottom-0 right-0 left-0 z-40 border-t border-[hsl(var(--wujha-border))] bg-white/95 backdrop-blur-lg p-3 safe-bottom lg:hidden">
          <span className="block w-full text-center rounded-xl bg-gray-100 px-6 py-3 text-sm font-bold text-gray-400">بدعوة فقط</span>
        </div>
      )}

      {/* ═══ MOBILE DRAWER ═══ */}
      <Drawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <DrawerContent>
          <DrawerHeader><DrawerTitle className="text-right">تفاصيل الحجز</DrawerTitle></DrawerHeader>
          <div className="p-4"><BookingCardContent /></div>
        </DrawerContent>
      </Drawer>

      <div className="h-20 lg:hidden" />

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} context={loginContext} />
      <TicketSelectionModal open={ticketModalOpen} onClose={() => setTicketModalOpen(false)} event={event} ticketTypes={ticketTypes} isLoggedIn={isLoggedIn} publicUser={publicUser} guestUser={guestUser} />
    </div>
  );
}
