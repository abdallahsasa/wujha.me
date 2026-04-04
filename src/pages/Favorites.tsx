import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePublicAuth } from "@/contexts/PublicAuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, MapPin, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { thumbnailUrl } from "@/lib/cloudinary";
import StarRating from "@/components/StarRating";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type FavEvent = {
  id: string; title_ar: string; slug: string; cover_image: string | null;
  start_date: string; is_free: boolean; min_price: number | null; currency: string;
  venues: { name_ar: string } | null;
};

type FavPlace = {
  id: string; name_ar: string; slug: string; cover_image: string | null; address_ar: string;
  average_rating: number | null; total_reviews: number;
  categories: { name_ar: string } | null;
};

export default function Favorites() {
  const { authUser, publicUser, loading: authLoading } = usePublicAuth();
  const [events, setEvents] = useState<FavEvent[]>([]);
  const [places, setPlaces] = useState<FavPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [favEventIds, setFavEventIds] = useState<Set<string>>(new Set());
  const [favPlaceIds, setFavPlaceIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!publicUser) { setLoading(false); return; }
    const fetchFavorites = async () => {
      setLoading(true);
      const [evFavs, plFavs] = await Promise.all([
        supabase.from("favorites").select("event_id, events(id, title_ar, slug, cover_image, start_date, is_free, min_price, currency, venues(name_ar))")
          .eq("user_id", publicUser.id).not("event_id", "is", null),
        supabase.from("favorites").select("place_id, places(id, name_ar, slug, cover_image, address_ar, average_rating, total_reviews, categories(name_ar))")
          .eq("user_id", publicUser.id).not("place_id", "is", null),
      ]);

      if (evFavs.data) {
        const evs = evFavs.data.map((f: any) => f.events).filter(Boolean) as FavEvent[];
        setEvents(evs);
        setFavEventIds(new Set(evs.map(e => e.id)));
      }
      if (plFavs.data) {
        const pls = plFavs.data.map((f: any) => f.places).filter(Boolean) as FavPlace[];
        setPlaces(pls);
        setFavPlaceIds(new Set(pls.map(p => p.id)));
      }
      setLoading(false);
    };
    fetchFavorites();
  }, [publicUser]);

  const toggleEventFav = async (e: React.MouseEvent, eventId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!publicUser) return;
    await supabase.from("favorites").delete().eq("user_id", publicUser.id).eq("event_id", eventId);
    setFavEventIds(prev => { const s = new Set(prev); s.delete(eventId); return s; });
    setEvents(prev => prev.filter(ev => ev.id !== eventId));
    toast.success("تمت الإزالة من المفضلة");
  };

  const togglePlaceFav = async (e: React.MouseEvent, placeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!publicUser) return;
    await supabase.from("favorites").delete().eq("user_id", publicUser.id).eq("place_id", placeId);
    setFavPlaceIds(prev => { const s = new Set(prev); s.delete(placeId); return s; });
    setPlaces(prev => prev.filter(pl => pl.id !== placeId));
    toast.success("تمت الإزالة من المفضلة");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-wujha-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authUser) {
    return <Navigate to="/" replace />;
  }

  const formatDate = (date: string) => {
    try { return format(new Date(date), "d MMMM yyyy", { locale: ar }); }
    catch { return date; }
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">المفضلة</h1>

        <Tabs defaultValue="events" dir="rtl">
          <TabsList className="mb-6">
            <TabsTrigger value="events">فعاليات</TabsTrigger>
            <TabsTrigger value="places">أماكن</TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden bg-white border border-wujha-border">
                    <Skeleton className="aspect-[16/9] w-full" />
                    <div className="p-4 space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/3" /></div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-16">
                <Heart className="h-12 w-12 text-wujha-text-muted mx-auto mb-4" />
                <p className="text-wujha-text-muted text-lg mb-2">لم تحفظ أي فعاليات بعد</p>
                <Link to="/" className="text-wujha-accent hover:underline text-sm">تصفح الفعاليات</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {events.map(ev => (
                  <Link
                    key={ev.id}
                    to={`/events/${(ev as any).slug || ev.id}`}
                    className="group rounded-2xl overflow-hidden bg-white border border-wujha-border hover:shadow-md transition-all"
                  >
                    <div className="relative aspect-[16/9] overflow-hidden">
                      <img src={thumbnailUrl(ev.cover_image || "") || "/placeholder.svg"} alt={ev.title_ar}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                      <button onClick={e => toggleEventFav(e, ev.id)}
                        className="absolute top-3 right-3 rounded-full bg-black/40 p-2 transition hover:bg-black/60 text-red-500">
                        <Heart className="h-4 w-4 fill-current" />
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-base mb-1.5 line-clamp-1">{ev.title_ar}</h3>
                      <span className={`inline-block text-sm font-bold mb-2 ${ev.is_free ? "text-green-600" : "text-wujha-text"}`}>
                        {ev.is_free ? "مجاني" : ev.min_price ? `${ev.min_price.toLocaleString()} ${ev.currency === "SYP" ? "ل.س" : ev.currency}` : ""}
                      </span>
                      <div className="flex items-center gap-1.5 text-wujha-text-muted text-xs">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        <span>{formatDate(ev.start_date)}</span>
                      </div>
                      {ev.venues && (
                        <div className="flex items-center gap-1.5 text-wujha-text-muted text-xs mt-1">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{(ev.venues as any).name_ar}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="places">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="rounded-xl bg-wujha-surface border border-wujha-border animate-pulse">
                    <div className="aspect-[4/3] bg-wujha-surface-hover rounded-t-xl" />
                    <div className="p-4 space-y-2"><div className="h-4 bg-wujha-surface-hover rounded w-3/4" /><div className="h-3 bg-wujha-surface-hover rounded w-1/2" /></div>
                  </div>
                ))}
              </div>
            ) : places.length === 0 ? (
              <div className="text-center py-16">
                <Heart className="h-12 w-12 text-wujha-text-muted mx-auto mb-4" />
                <p className="text-wujha-text-muted text-lg mb-2">لم تحفظ أي أماكن بعد</p>
                <Link to="/places" className="text-wujha-accent hover:underline text-sm">تصفح الأماكن</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {places.map(pl => (
                  <Link
                    key={pl.id}
                    to={`/places/${(pl as any).slug || pl.id}`}
                    className="group rounded-xl overflow-hidden bg-wujha-surface border border-wujha-border hover:border-wujha-gold/30 transition-all"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img src={thumbnailUrl(pl.cover_image || "") || "/placeholder.svg"} alt={pl.name_ar}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                      <button onClick={e => togglePlaceFav(e, pl.id)}
                        className="absolute top-3 right-3 rounded-full bg-black/40 p-2 transition hover:bg-black/60 text-red-500">
                        <Heart className="h-4 w-4 fill-current" />
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-base mb-1 line-clamp-1">{pl.name_ar}</h3>
                      {pl.categories && (
                        <span className="inline-block rounded-full bg-wujha-gold/10 px-3 py-0.5 text-xs font-medium text-wujha-gold mb-2">
                          {(pl.categories as any).name_ar}
                        </span>
                      )}
                      {pl.total_reviews > 0 && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <StarRating rating={pl.average_rating || 0} />
                          <span className="text-xs text-wujha-text-muted">{pl.average_rating?.toFixed(1)} ({pl.total_reviews})</span>
                        </div>
                      )}
                      <p className="text-wujha-text-muted text-xs flex items-center gap-1 line-clamp-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {pl.address_ar}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
