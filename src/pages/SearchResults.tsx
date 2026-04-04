import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

type Event = {
  id: string; slug: string; title_ar: string; cover_image: string | null;
  start_date: string; is_free: boolean; min_price: number | null; currency: string;
  venues: { name_ar: string } | null;
};
type Place = {
  id: string; slug: string; name_ar: string; cover_image: string | null; address_ar: string;
  categories: { name_ar: string } | null;
};

export default function SearchResults() {
  const [params] = useSearchParams();
  const query = params.get("q") || "";
  const [events, setEvents] = useState<Event[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query.trim()) { setLoading(false); return; }
    setLoading(true);
    const q = `%${query}%`;
    Promise.all([
      supabase.from("events")
        .select("id, slug, title_ar, cover_image, start_date, is_free, min_price, currency, venues(name_ar)")
        .eq("status", "published").ilike("title_ar", q).order("start_date", { ascending: true }).limit(20),
      supabase.from("places")
        .select("id, slug, name_ar, cover_image, address_ar, categories(name_ar)")
        .eq("is_active", true).or(`name_ar.ilike.${q},address_ar.ilike.${q}`).limit(20),
    ]).then(([evRes, plRes]) => {
      if (evRes.data) setEvents(evRes.data as unknown as Event[]);
      if (plRes.data) setPlaces(plRes.data as unknown as Place[]);
      setLoading(false);
    });
  }, [query]);

  const noResults = !loading && events.length === 0 && places.length === 0;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-wujha-text-muted">
          <Link to="/" className="hover:text-wujha-accent transition">الرئيسية</Link>
          <ArrowRight className="h-3 w-3 rotate-180" />
          <span className="text-wujha-text">نتائج البحث</span>
        </div>
      </div>

      <section className="mx-auto max-w-[1400px] px-4 md:px-6 pb-12">
        <h1 className="text-2xl font-bold mb-1">نتائج البحث عن "{query}"</h1>
        <p className="text-sm text-wujha-text-muted mb-6">{loading ? "جاري البحث..." : `${events.length + places.length} نتيجة`}</p>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-wujha-surface border border-wujha-border animate-pulse">
                <div className="aspect-[4/3] bg-wujha-surface-hover rounded-t-2xl" />
                <div className="p-4 space-y-2"><div className="h-4 bg-wujha-surface-hover rounded w-3/4" /><div className="h-3 bg-wujha-surface-hover rounded w-1/2" /></div>
              </div>
            ))}
          </div>
        )}

        {noResults && <p className="text-wujha-text-muted text-center py-16">لا توجد نتائج مطابقة</p>}

        {events.length > 0 && (
          <>
            <h2 className="text-lg font-bold mb-3">فعاليات</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
              {events.map(ev => (
                <Link key={ev.id} to={`/events/${(ev as any).slug || ev.id}`}
                  className="group rounded-2xl overflow-hidden bg-white border border-wujha-border hover:border-wujha-accent/30 transition-all hover:shadow-md">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img src={ev.cover_image || "/placeholder.svg"} alt={ev.title_ar}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-base mb-1 line-clamp-1">{ev.title_ar}</h3>
                    <p className="text-wujha-text-muted text-xs flex items-center gap-1">
                      <Calendar className="h-3 w-3 shrink-0" />{format(new Date(ev.start_date), "d MMMM yyyy", { locale: ar })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {places.length > 0 && (
          <>
            <h2 className="text-lg font-bold mb-3">أماكن</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {places.map(pl => (
                <Link key={pl.id} to={`/places/${(pl as any).slug || pl.id}`}
                  className="group rounded-2xl overflow-hidden bg-white border border-wujha-border hover:border-wujha-accent/30 transition-all hover:shadow-md">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img src={pl.cover_image || "/placeholder.svg"} alt={pl.name_ar}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-base mb-1 line-clamp-1">{pl.name_ar}</h3>
                    <p className="text-wujha-text-muted text-xs flex items-center gap-1 line-clamp-1"><MapPin className="h-3 w-3 shrink-0" />{pl.address_ar}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
