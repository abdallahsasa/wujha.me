import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, ArrowRight } from "lucide-react";
import { usePublicAuth } from "@/contexts/PublicAuthContext";
import LoginModal from "@/components/auth/LoginModal";
import StarRating from "@/components/StarRating";

type Category = { id: string; name_ar: string; slug: string; icon: string | null };
type Place = {
  id: string; slug: string; name_ar: string; cover_image: string | null; address_ar: string;
  average_rating: number | null; total_reviews: number;
  categories: { name_ar: string } | null;
  cities: { name_ar: string } | null;
};

export default function PlacesListing() {
  const { authUser, guestUser } = usePublicAuth();
  const isLoggedIn = !!authUser || !!guestUser;
  const [loginOpen, setLoginOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    supabase.from("categories").select("id, name_ar, slug, icon").eq("is_active", true).eq("type", "place").order("sort_order")
      .then(({ data }) => { if (data) setCategories(data); });
  }, []);

  useEffect(() => {
    setLoading(true);
    let query = supabase.from("places")
      .select("id, slug, name_ar, cover_image, address_ar, average_rating, total_reviews, categories(name_ar), cities(name_ar)")
      .eq("is_active", true).order("is_featured", { ascending: false }).order("sort_order");
    if (selectedCategory !== "all") query = query.eq("category_id", selectedCategory);
    query.then(({ data }) => { if (data) setPlaces(data as unknown as Place[]); setLoading(false); });
  }, [selectedCategory]);

  const filtered = searchQuery
    ? places.filter(p => p.name_ar.includes(searchQuery) || p.address_ar.includes(searchQuery))
    : places;

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-wujha-border">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-2.5">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button onClick={() => setSelectedCategory("all")}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${selectedCategory === "all" ? "bg-wujha-text text-white" : "text-wujha-text-muted hover:bg-wujha-surface hover:text-wujha-text"}`}>الكل</button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${selectedCategory === cat.id ? "bg-wujha-text text-white" : "text-wujha-text-muted hover:bg-wujha-surface hover:text-wujha-text"}`}>{cat.name_ar}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-wujha-text-muted">
          <Link to="/" className="hover:text-wujha-accent transition">الرئيسية</Link>
          <ArrowRight className="h-3 w-3 rotate-180" />
          <span className="text-wujha-text">أماكن</span>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 pb-12">
        <h1 className="text-3xl font-bold mb-6">اكتشف أماكن</h1>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl bg-wujha-surface border border-wujha-border animate-pulse">
                <div className="aspect-[4/3] bg-wujha-surface-hover rounded-t-xl" />
                <div className="p-4 space-y-2"><div className="h-4 bg-wujha-surface-hover rounded w-3/4" /><div className="h-3 bg-wujha-surface-hover rounded w-1/2" /></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-wujha-text-muted text-center py-12">لا توجد أماكن حالياً</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(pl => (
              <Link key={pl.id} to={`/places/${(pl as any).slug || pl.id}`}
                className="group rounded-xl overflow-hidden bg-wujha-surface border border-wujha-border hover:border-wujha-gold/30 transition-all">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={pl.cover_image || "/placeholder.svg"} alt={pl.name_ar}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-base mb-1 line-clamp-1">{pl.name_ar}</h3>
                  {pl.categories && (
                    <span className="inline-block rounded-full bg-wujha-gold/10 px-3 py-0.5 text-xs font-medium text-wujha-gold mb-2">{(pl.categories as any).name_ar}</span>
                  )}
                  {pl.total_reviews > 0 && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <StarRating rating={pl.average_rating || 0} />
                      <span className="text-xs text-wujha-text-muted">{pl.average_rating?.toFixed(1)} ({pl.total_reviews})</span>
                    </div>
                  )}
                  <p className="text-wujha-text-muted text-xs flex items-center gap-1 line-clamp-1"><MapPin className="h-3 w-3 shrink-0" />{pl.address_ar}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} context="general" />
    </div>
  );
}
