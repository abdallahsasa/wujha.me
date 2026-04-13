import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Heart, ChevronLeft, ChevronDown, MapPin, Calendar as CalendarIcon, Shield, CheckCircle, Star, Headphones } from "lucide-react";
import StarRatingComponent from "@/components/StarRating";
import HeroCarousel from "@/components/HeroCarousel";
import CategoryNav from "@/components/layout/CategoryNav";
import { thumbnailUrl } from "@/lib/cloudinary";
import { format, isToday, isTomorrow, isThisWeek, isSameDay } from "date-fns";
import { ar } from "date-fns/locale";
import { usePublicAuth } from "@/contexts/PublicAuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import LoginModal from "@/components/auth/LoginModal";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Event = {
  id: string; slug: string; title_ar: string; cover_image: string | null; hero_video: string | null; hero_thumbnail: string | null; start_date: string;
  is_free: boolean; min_price: number | null; currency: string;
  venues: { name_ar: string } | null;
};
type Place = {
  id: string; slug: string; name_ar: string; cover_image: string | null; address_ar: string;
  average_rating: number | null; total_reviews: number;
  categories: { name_ar: string } | null;
};
type CityInfo = { id: string; name_ar: string };

type DateFilter = "all" | "today" | "tomorrow" | "this_week" | "custom";

export default function Index() {
  const { authUser, publicUser, guestUser } = usePublicAuth();
  const { formatMinPrice: fmtMinPrice, formatPrice: fmtTicketPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [favoriteEventIds, setFavoriteEventIds] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [cityName, setCityName] = useState("سوريا");

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCity = searchParams.get("city") || "all";
  const selectedCategory = searchParams.get("category") || "all";

  useEffect(() => {
    if (selectedCity === "all") { setCityName("سوريا"); return; }
    supabase.from("cities").select("id, name_ar").eq("id", selectedCity).single()
      .then(({ data }) => { if (data) setCityName(data.name_ar); });
  }, [selectedCity]);

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      let featQ = supabase.from("events")
        .select("id, slug, title_ar, cover_image, hero_video, hero_thumbnail, start_date, is_free, min_price, currency, venues(name_ar)")
        .eq("is_featured", true).eq("status", "published").order("start_date").limit(5);
      if (selectedCity !== "all") featQ = featQ.eq("city_id", selectedCity);
      if (selectedCategory !== "all") featQ = featQ.eq("category_id", selectedCategory);

      const now = new Date().toISOString();
      let upQ = supabase.from("events")
        .select("id, slug, title_ar, cover_image, start_date, is_free, min_price, currency, venues(name_ar)")
        .eq("status", "published")
        // Show if end_date is in the future OR (if no end_date) if start_date was within the last 4 hours or in the future
        .or(`end_date.gte.${now},and(end_date.is.null,start_date.gte.${new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()})`)
        .order("start_date").limit(12);
      if (selectedCity !== "all") upQ = upQ.eq("city_id", selectedCity);
      if (selectedCategory !== "all") upQ = upQ.eq("category_id", selectedCategory);

      let plQ = supabase.from("places")
        .select("id, slug, name_ar, cover_image, address_ar, average_rating, total_reviews, categories(name_ar)")
        .eq("is_active", true).order("is_featured", { ascending: false }).order("sort_order").limit(10);
      if (selectedCity !== "all") plQ = plQ.eq("city_id", selectedCity);

      const [featRes, upRes, plRes] = await Promise.all([featQ, upQ, plQ]);
      if (featRes.data) setFeaturedEvents(featRes.data as unknown as Event[]);
      if (upRes.data) setUpcomingEvents(upRes.data as unknown as Event[]);
      if (plRes.data) setPlaces(plRes.data as unknown as Place[]);
      setLoading(false);
    };
    fetchData();
  }, [selectedCity, selectedCategory]);

  useEffect(() => {
    if (!publicUser) { setFavoriteEventIds(new Set()); return; }
    supabase.from("favorites").select("event_id").eq("user_id", publicUser.id).not("event_id", "is", null)
      .then(({ data }) => {
        if (data) setFavoriteEventIds(new Set(data.map(f => f.event_id!)));
      });
  }, [publicUser]);

  const toggleFavorite = async (e: React.MouseEvent, eventId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!authUser || !publicUser) { setLoginOpen(true); return; }
    const isFav = favoriteEventIds.has(eventId);
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", publicUser.id).eq("event_id", eventId);
      setFavoriteEventIds(prev => { const s = new Set(prev); s.delete(eventId); return s; });
    } else {
      await supabase.from("favorites").insert({ user_id: publicUser.id, event_id: eventId });
      setFavoriteEventIds(prev => new Set(prev).add(eventId));
    }
  };

  const filteredEvents = useMemo(() => {
    if (dateFilter === "all") return upcomingEvents;
    return upcomingEvents.filter(ev => {
      const d = new Date(ev.start_date);
      if (dateFilter === "today") return isToday(d);
      if (dateFilter === "tomorrow") return isTomorrow(d);
      if (dateFilter === "this_week") return isThisWeek(d, { weekStartsOn: 6 });
      if (dateFilter === "custom" && customDate) return isSameDay(d, customDate);
      return true;
    });
  }, [upcomingEvents, dateFilter, customDate]);

  const [loginOpen, setLoginOpen] = useState(false);

  const formatPrice = (e: Event) => {
    if (e.is_free) return "مجاني";
    return fmtMinPrice([{ price_new_syp: e.min_price, price_usd: null, price_old_syp: e.min_price ? e.min_price * 100 : null }]);
  };

  const formatDate = (date: string) => {
    try { return format(new Date(date), "d MMMM yyyy", { locale: ar }); }
    catch { return date; }
  };

  return (
    <>
      <CategoryNav selected={selectedCategory} onSelect={(catId) => {
        const params = new URLSearchParams(searchParams);
        if (catId === "all") params.delete("category");
        else params.set("category", catId);
        setSearchParams(params);
      }} />

      {/* ─── HERO CAROUSEL ─── */}
      {loading ? (
        <section className="mx-auto max-w-[1400px] px-4 md:px-6 pt-6">
          <Skeleton className="h-8 w-64 mb-5" />
          <Skeleton className="h-[200px] sm:h-[300px] md:h-[500px] w-full rounded-2xl" />
        </section>
      ) : featuredEvents.length > 0 ? (
        <section className="mx-auto max-w-[1400px] px-4 md:px-6 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h2 className="text-xl sm:text-2xl font-bold text-wujha-text flex items-center gap-1.5">
              أشياء يمكنك فعلها في{" "}
              <span className="text-wujha-accent">{cityName}</span>
            </h2>
          </div>
          <HeroCarousel events={featuredEvents} />
        </section>
      ) : null}

      {/* ─── UPCOMING EVENTS ─── */}
      <section className="mx-auto max-w-[1400px] px-4 md:px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold">فعاليات قادمة</h2>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {dateFilter !== "all" && (
              <button onClick={() => { setDateFilter("all"); setCustomDate(undefined); }}
                className="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border border-wujha-accent bg-wujha-accent/10 text-wujha-accent hover:bg-wujha-accent/20 transition">الكل ✕</button>
            )}
            {[
              { key: "today" as DateFilter, label: "اليوم" },
              { key: "tomorrow" as DateFilter, label: "غداً" },
              { key: "this_week" as DateFilter, label: "هذا الأسبوع" },
            ].map(f => (
              <button key={f.key} onClick={() => { setDateFilter(f.key); setCustomDate(undefined); }}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition ${dateFilter === f.key ? "border-wujha-text bg-wujha-text text-white" : "border-wujha-border bg-transparent text-wujha-text-muted hover:border-wujha-text-muted"
                  }`}>{f.label}</button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <button className={`shrink-0 rounded-full p-2 border transition ${dateFilter === "custom" ? "border-wujha-text bg-wujha-text text-white" : "border-wujha-border bg-transparent text-wujha-text-muted hover:border-wujha-text-muted"
                  }`}><CalendarIcon className="h-4 w-4" /></button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={customDate} onSelect={(date) => { setCustomDate(date); if (date) setDateFilter("custom"); else setDateFilter("all"); }} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Link to="/events" className="shrink-0 text-sm text-wujha-accent hover:underline flex items-center gap-1">عرض الكل <ChevronLeft className="h-4 w-4" /></Link>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-white border border-wujha-border">
                <Skeleton className="aspect-[16/9] w-full" />
                <div className="p-4 space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/2" /></div>
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <p className="text-wujha-text-muted text-center py-12">لا توجد فعاليات قادمة حالياً</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredEvents.map(ev => (
              <Link key={ev.id} to={`/events/${(ev as any).slug || ev.id}`}
                className="group rounded-2xl overflow-hidden bg-white border border-wujha-border hover:shadow-md transition-all">
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img src={thumbnailUrl(ev.cover_image || "") || "/placeholder.svg"} alt={ev.title_ar}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                  <button onClick={e => toggleFavorite(e, ev.id)}
                    className={`absolute top-3 right-3 rounded-full bg-black/40 p-2 transition hover:bg-black/60 ${favoriteEventIds.has(ev.id) ? "text-red-500" : "text-white"}`}>
                    <Heart className={`h-4 w-4 ${favoriteEventIds.has(ev.id) ? "fill-current" : ""}`} />
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-base mb-1.5 line-clamp-1">{ev.title_ar}</h3>
                  {formatPrice(ev) && (
                    <span className={`inline-block text-sm font-bold mb-2 ${ev.is_free ? "text-green-600" : "text-wujha-text"}`}>{formatPrice(ev)}</span>
                  )}
                  <div className="flex items-center gap-1.5 text-wujha-text-muted text-xs">
                    <CalendarIcon className="h-3.5 w-3.5" /><span>{formatDate(ev.start_date)}</span>
                  </div>
                  {ev.venues && (
                    <div className="flex items-center gap-1.5 text-wujha-text-muted text-xs mt-1">
                      <MapPin className="h-3.5 w-3.5" /><span>{(ev.venues as any).name_ar}</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ─── PLACES ─── */}
      {loading ? (
        <section className="mx-auto max-w-[1400px] px-4 md:px-6 pb-12">
          <Skeleton className="h-7 w-40 mb-6" />
          <div className="flex gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="shrink-0 w-64 rounded-2xl overflow-hidden bg-white border border-wujha-border">
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-3 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
              </div>
            ))}
          </div>
        </section>
      ) : places.length > 0 && (
        <section className="mx-auto max-w-[1400px] px-4 md:px-6 pb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">اكتشف أماكن</h2>
            <Link to="/places" className="text-sm text-wujha-accent hover:underline flex items-center gap-1">عرض الكل <ChevronLeft className="h-4 w-4" /></Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {places.map(pl => (
              <Link key={pl.id} to={`/places/${(pl as any).slug || pl.id}`}
                className="shrink-0 w-64 rounded-2xl overflow-hidden bg-white border border-wujha-border hover:shadow-md transition-all group">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={thumbnailUrl(pl.cover_image || "") || "/placeholder.svg"} alt={pl.name_ar}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-sm mb-1 line-clamp-1">{pl.name_ar}</h3>
                  {pl.categories && <p className="text-wujha-text-muted text-xs">{(pl.categories as any).name_ar}</p>}
                  {pl.total_reviews > 0 && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StarRatingComponent rating={pl.average_rating || 0} />
                      <span className="text-xs text-wujha-text-muted">{pl.average_rating?.toFixed(1)}</span>
                    </div>
                  )}
                  <p className="text-wujha-text-muted text-xs mt-0.5 line-clamp-1 flex items-center gap-1"><MapPin className="h-3 w-3" />{pl.address_ar}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── TRUST ─── */}
      <section className="py-10">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: "حجز آمن", desc: "معاملات مشفرة وآمنة" },
              { icon: CheckCircle, title: "تأكيد فوري", desc: "تذكرتك جاهزة فوراً" },
              { icon: Star, title: "فعاليات موثوقة", desc: "محتوى مُراجع ومعتمد" },
              { icon: Headphones, title: "دعم العملاء", desc: "فريق دعم متاح دائماً" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-wujha-surface"><item.icon className="h-6 w-6 text-wujha-text" /></div>
                <h3 className="font-bold text-sm">{item.title}</h3>
                <p className="text-wujha-text-muted text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} context="general" />
    </>
  );
}
