import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Phone, Clock, ArrowRight, Instagram, Globe, ExternalLink, Share2, Heart, Star, MessageCircle } from "lucide-react";
import { usePublicAuth } from "@/contexts/PublicAuthContext";
import LoginModal from "@/components/auth/LoginModal";
import { getPlaceShareUrl, getCanonicalPlaceUrl } from "@/lib/share-urls";
import { optimizeUrl, galleryUrl } from "@/lib/cloudinary";
import StarRating from "@/components/StarRating";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

type PlaceData = {
  id: string; slug: string; name_ar: string; description_ar: string; cover_image: string | null;
  address_ar: string; phone: string | null; whatsapp: string | null;
  instagram: string | null; website: string | null; latitude: number; longitude: number;
  opening_hours: Record<string, string> | null; images: string[] | null;
  tags: string[] | null; price_range: string | null;
  average_rating: number | null; total_reviews: number;
  categories: { name_ar: string } | null;
  cities: { name_ar: string } | null;
};

type Review = {
  id: string;
  reviewer_name: string;
  rating: number;
  review_text: string | null;
  created_at: string;
};

const DAY_NAMES: Record<string, string> = {
  sunday: "الأحد", monday: "الاثنين", tuesday: "الثلاثاء",
  wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة", saturday: "السبت",
};

export default function PlaceDetail() {
  const { placeId } = useParams<{ placeId: string }>();
  const { authUser, publicUser, guestUser } = usePublicAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [place, setPlace] = useState<PlaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newReviewText, setNewReviewText] = useState("");
  const [newReviewerName, setNewReviewerName] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!placeId) return;
    const fetchData = async () => {
      setLoading(true);
      const col = isUUID(placeId) ? "id" : "slug";
      const { data } = await supabase
        .from("places")
        .select("id, slug, name_ar, description_ar, cover_image, address_ar, phone, whatsapp, instagram, website, latitude, longitude, opening_hours, images, tags, price_range, average_rating, total_reviews, categories(name_ar), cities(name_ar)")
        .eq(col, placeId)
        .single();
      if (data) {
        const pl = data as any;
        if (isUUID(placeId) && pl.slug) {
          window.history.replaceState(null, '', `/places/${pl.slug}`);
        }
        setPlace(pl);
      }
      setLoading(false);
    };
    fetchData();
  }, [placeId]);

  // Fetch reviews
  useEffect(() => {
    if (!place) return;
    supabase
      .from("reviews")
      .select("id, reviewer_name, rating, review_text, created_at")
      .eq("place_id", place.id)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setReviews(data);
      });
  }, [place?.id]);

  // Pre-fill reviewer name
  useEffect(() => {
    const currentUser = publicUser || guestUser;
    if (currentUser?.name) setNewReviewerName(currentUser.name);
  }, [publicUser, guestUser]);

  // Check if place is favorited
  useEffect(() => {
    if (!publicUser || !place) return;
    supabase.from("favorites").select("id").eq("user_id", publicUser.id).eq("place_id", place.id).maybeSingle()
      .then(({ data }) => setIsFavorite(!!data));
  }, [publicUser, place?.id]);

  const toggleFavorite = async () => {
    if (!authUser || !publicUser) {
      setLoginOpen(true);
      return;
    }
    if (!place) return;
    if (isFavorite) {
      await supabase.from("favorites").delete().eq("user_id", publicUser.id).eq("place_id", place.id);
      setIsFavorite(false);
    } else {
      await supabase.from("favorites").insert({ user_id: publicUser.id, place_id: place.id });
      setIsFavorite(true);
    }
  };

  const handleSubmitReview = async () => {
    if (newRating === 0) { toast.error("الرجاء اختيار تقييم"); return; }
    if (!newReviewerName.trim()) { toast.error("الرجاء إدخال الاسم"); return; }
    if (!place) return;
    setSubmittingReview(true);
    const currentUser = publicUser || guestUser;
    const { error } = await supabase.from("reviews").insert({
      place_id: place.id,
      user_id: currentUser?.id || null,
      reviewer_name: newReviewerName.trim(),
      rating: newRating,
      review_text: newReviewText.trim() || null,
    });
    if (error) {
      toast.error("حدث خطأ أثناء إرسال التقييم");
    } else {
      toast.success("شكراً لتقييمك!");
      setReviewModalOpen(false);
      setNewRating(0);
      setNewReviewText("");
      const [revRes, placeRes] = await Promise.all([
        supabase.from("reviews").select("id, reviewer_name, rating, review_text, created_at")
          .eq("place_id", place.id).eq("is_approved", true).order("created_at", { ascending: false }),
        supabase.from("places").select("average_rating, total_reviews").eq("id", place.id).single(),
      ]);
      if (revRes.data) setReviews(revRes.data);
      if (placeRes.data) {
        setPlace({ ...place, average_rating: placeRes.data.average_rating, total_reviews: placeRes.data.total_reviews });
      }
    }
    setSubmittingReview(false);
  };

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-wujha-bg font-tajawal flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-wujha-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!place) {
    return (
      <div dir="rtl" className="min-h-screen bg-wujha-bg font-tajawal text-wujha-text flex flex-col items-center justify-center gap-4">
        <p className="text-xl">المكان غير موجود</p>
        <Link to="/places" className="text-wujha-gold hover:underline">العودة للأماكن</Link>
      </div>
    );
  }

  const images = Array.isArray(place.images) ? place.images as string[] : [];
  const tags = Array.isArray(place.tags) ? place.tags as string[] : [];
  const hours = place.opening_hours && typeof place.opening_hours === "object" ? place.opening_hours as Record<string, string> : null;
  const mapUrl = `https://www.google.com/maps?q=${place.latitude},${place.longitude}`;
  const placeSlug = place.slug || place.id;
  const placeShareUrl = getPlaceShareUrl(placeSlug);
  const shareText = `${place.name_ar} — ${place.address_ar} — شوفو هالمكان على وجهة: ${placeShareUrl}`;
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const canonicalUrl = getCanonicalPlaceUrl(placeSlug);
  const ogImage = place.cover_image || "";
  const ogDescription = place.description_ar?.slice(0, 150) || place.name_ar;
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);
  const isLoggedIn = !!authUser || !!guestUser;

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>{`${place.name_ar} — وجهة`}</title>
        <meta name="description" content={ogDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={place.name_ar} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="وجهة | Wujha" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={place.name_ar} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>

      {/* Hero */}
      <div className="relative w-full aspect-[21/9] md:aspect-[3/1] overflow-hidden">
        <img src={optimizeUrl(place.cover_image || "") || "/placeholder.svg"} alt={place.name_ar} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <button onClick={toggleFavorite}
          className={`absolute top-4 left-4 rounded-full p-2.5 transition ${isFavorite ? "bg-red-500/20 text-red-500" : "bg-black/50 text-white hover:text-red-400"}`}
          title={isFavorite ? "إزالة من المفضلة" : "حفظ المكان"}>
          <Heart className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
        </button>
        <div className="absolute bottom-0 right-0 left-0 p-6 md:p-10">
          {place.categories && (
            <span className="inline-block rounded-full bg-wujha-gold px-3 py-1 text-xs font-bold text-white mb-3">{(place.categories as any).name_ar}</span>
          )}
          <h1 className="text-3xl md:text-5xl font-bold drop-shadow-lg text-white">{place.name_ar}</h1>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-white/70 text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" /> {place.address_ar}
              {place.cities && <span>• {(place.cities as any).name_ar}</span>}
            </p>
          </div>
          {place.total_reviews > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <StarRating rating={place.average_rating || 0} />
              <span className="text-white/90 text-sm font-medium">{place.average_rating?.toFixed(1)}</span>
              <a href="#reviews" className="text-white/60 text-sm hover:text-white/90 transition">({place.total_reviews} تقييم)</a>
            </div>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex items-center gap-2 text-sm text-wujha-text-muted">
          <Link to="/" className="hover:text-wujha-gold transition">الرئيسية</Link>
          <ArrowRight className="h-3 w-3 rotate-180" />
          <Link to="/places" className="hover:text-wujha-gold transition">أماكن</Link>
          <ArrowRight className="h-3 w-3 rotate-180" />
          <span className="text-wujha-text">{place.name_ar}</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20 lg:pb-0">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-xl font-bold mb-4">عن المكان</h2>
              <p className="text-wujha-text-muted leading-relaxed whitespace-pre-line">{place.description_ar}</p>
            </section>

            {hours && Object.keys(hours).length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Clock className="h-5 w-5 text-wujha-gold" /> ساعات العمل</h2>
                <div className="rounded-xl bg-wujha-surface border border-wujha-border p-4 space-y-2">
                  {Object.entries(hours).map(([day, time]) => (
                    <div key={day} className="flex justify-between text-sm">
                      <span className="font-medium">{DAY_NAMES[day.toLowerCase()] || day}</span>
                      <span className="text-wujha-text-muted">{time as string}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {images.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4">صور</h2>
                {/* Mobile: horizontal swipeable carousel */}
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 lg:hidden">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setGalleryIndex(i)} className="shrink-0 w-64 aspect-square rounded-xl overflow-hidden">
                      <img src={galleryUrl(img)} alt={`${place.name_ar} ${i + 1}`} className="h-full w-full object-cover hover:scale-105 transition-transform duration-300" />
                    </button>
                  ))}
                </div>
                {/* Desktop: grid */}
                <div className="hidden lg:grid grid-cols-2 md:grid-cols-3 gap-3">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setGalleryIndex(i)} className="aspect-square rounded-xl overflow-hidden">
                      <img src={galleryUrl(img)} alt={`${place.name_ar} ${i + 1}`} className="h-full w-full object-cover hover:scale-105 transition-transform duration-300" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {tags.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4">وسوم</h2>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, i) => (
                    <span key={i} className="rounded-full bg-wujha-surface border border-wujha-border px-3 py-1 text-xs text-wujha-text-muted">{tag}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Reviews Section */}
            <section id="reviews">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Star className="h-5 w-5 text-wujha-gold" /> التقييمات
                  {place.total_reviews > 0 && <span className="text-sm font-normal text-wujha-text-muted">({place.total_reviews})</span>}
                </h2>
                <button onClick={() => setReviewModalOpen(true)} className="rounded-lg bg-wujha-gold px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition">أضف تقييم</button>
              </div>
              {reviews.length === 0 ? (
                <p className="text-wujha-text-muted text-sm py-6 text-center">لا توجد تقييمات بعد — كن أول من يقيّم!</p>
              ) : (
                <div className="space-y-4">
                  {displayedReviews.map((rev) => (
                    <div key={rev.id} className="rounded-xl bg-wujha-surface border border-wujha-border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{rev.reviewer_name || "زائر"}</span>
                          <StarRating rating={rev.rating} />
                        </div>
                        <span className="text-xs text-wujha-text-muted">
                          {(() => { try { return format(new Date(rev.created_at), "d MMMM yyyy", { locale: ar }); } catch { return ""; } })()}
                        </span>
                      </div>
                      {rev.review_text && <p className="text-sm text-wujha-text-muted leading-relaxed">{rev.review_text}</p>}
                    </div>
                  ))}
                  {reviews.length > 3 && !showAllReviews && (
                    <button onClick={() => setShowAllReviews(true)} className="w-full text-center text-sm text-wujha-gold hover:underline py-2">عرض الكل ({reviews.length})</button>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar — hidden on mobile, shown via bottom bar instead */}
          <div className="hidden lg:block space-y-4">
            <div className="rounded-xl bg-wujha-surface border border-wujha-border p-5 space-y-4">
              <h3 className="font-bold text-lg">معلومات التواصل</h3>
              {place.total_reviews > 0 && (
                <div className="flex items-center gap-2 pb-2 border-b border-wujha-border">
                  <StarRating rating={place.average_rating || 0} />
                  <span className="text-sm font-medium">{place.average_rating?.toFixed(1)}</span>
                  <span className="text-xs text-wujha-text-muted">({place.total_reviews} تقييم)</span>
                </div>
              )}
              <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-wujha-text-muted hover:text-wujha-gold transition">
                <MapPin className="h-5 w-5 shrink-0" /> <span>{place.address_ar}</span> <ExternalLink className="h-3 w-3 mr-auto" />
              </a>
              {place.phone && (
                <a href={`tel:${place.phone}`} className="flex items-center gap-3 text-sm text-wujha-text-muted hover:text-wujha-gold transition">
                  <Phone className="h-5 w-5 shrink-0" /> <span dir="ltr">{place.phone}</span>
                </a>
              )}
              {place.whatsapp && (
                <a href={`https://wa.me/${place.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90">واتساب</a>
              )}
              {place.instagram && (
                <a href={`https://instagram.com/${place.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm text-wujha-text-muted hover:text-wujha-gold transition">
                  <Instagram className="h-5 w-5 shrink-0" /> <span>{place.instagram}</span>
                </a>
              )}
              {place.website && (
                <a href={place.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm text-wujha-text-muted hover:text-wujha-gold transition">
                  <Globe className="h-5 w-5 shrink-0" /> <span>الموقع الإلكتروني</span>
                </a>
              )}
            </div>

            {place.latitude && place.longitude ? (
              <div className="rounded-xl border border-wujha-border overflow-hidden">
                <iframe title="الموقع على الخريطة" src={`https://www.google.com/maps?q=${place.latitude},${place.longitude}&z=15&output=embed`} className="w-full aspect-video" loading="lazy" allowFullScreen />
              </div>
            ) : (
              <a href={mapUrl} target="_blank" rel="noopener noreferrer"
                className="block rounded-xl bg-wujha-surface border border-wujha-border overflow-hidden hover:border-wujha-gold/30 transition">
                <div className="aspect-video bg-wujha-surface-hover flex items-center justify-center">
                  <div className="text-center"><MapPin className="h-8 w-8 text-wujha-gold mx-auto mb-2" /><span className="text-sm text-wujha-text-muted">عرض على الخريطة</span></div>
                </div>
              </a>
            )}

            {place.price_range && (
              <div className="rounded-xl bg-wujha-surface border border-wujha-border p-4 text-center">
                <p className="text-sm text-wujha-text-muted mb-1">نطاق الأسعار</p>
                <p className="text-lg font-bold text-wujha-gold">{place.price_range}</p>
              </div>
            )}

            <a href={whatsappShare} target="_blank" rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90">
              <Share2 className="h-4 w-4" /> مشاركة عبر واتساب
            </a>
          </div>
        </div>
      </div>

      {/* ═══ MOBILE BOTTOM BAR ═══ */}
      <div className="fixed bottom-0 right-0 left-0 z-40 border-t border-wujha-border bg-white/95 backdrop-blur-lg p-3 safe-bottom lg:hidden">
        <div className="flex items-center gap-3">
          {place.whatsapp && (
            <a href={`https://wa.me/${place.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white transition hover:opacity-90">
              <MessageCircle className="h-4 w-4" /> واتساب
            </a>
          )}
          {place.phone && (
            <a href={`tel:${place.phone}`}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-wujha-border py-3 text-sm font-bold text-wujha-text transition hover:bg-wujha-surface">
              <Phone className="h-4 w-4" /> اتصل
            </a>
          )}
        </div>
      </div>

      {/* Gallery lightbox */}
      {galleryIndex !== null && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setGalleryIndex(null)}>
          <img src={images[galleryIndex]} alt="" className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg" />
        </div>
      )}

      {/* Add Review Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={() => setReviewModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-center">أضف تقييمك</h3>
            <div className="flex justify-center"><StarRating rating={newRating} size="md" interactive onRate={setNewRating} /></div>
            {!isLoggedIn && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-wujha-text">الاسم <span className="text-destructive">*</span></label>
                <input value={newReviewerName} onChange={(e) => setNewReviewerName(e.target.value)} placeholder="اسمك"
                  className="w-full h-11 rounded-lg border border-wujha-border bg-wujha-surface px-3 text-sm text-wujha-text placeholder:text-wujha-text-muted focus:outline-none focus:border-wujha-accent/50 transition" />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium text-wujha-text">تقييمك (اختياري)</label>
              <textarea value={newReviewText} onChange={(e) => setNewReviewText(e.target.value)} placeholder="شاركنا تجربتك..." rows={4}
                className="w-full rounded-lg border border-wujha-border bg-wujha-surface px-3 py-2.5 text-sm text-wujha-text placeholder:text-wujha-text-muted focus:outline-none focus:border-wujha-accent/50 transition resize-none" />
            </div>
            <button onClick={handleSubmitReview} disabled={submittingReview || newRating === 0}
              className="w-full h-11 rounded-lg bg-wujha-gold text-white font-bold text-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {submittingReview ? "جاري الإرسال..." : "إرسال التقييم"}
            </button>
          </div>
        </div>
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} context="general" />
    </div>
  );
}
