import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import StarRating from "@/components/StarRating";

type ReviewRow = {
  id: string;
  reviewer_name: string;
  rating: number;
  review_text: string | null;
  is_approved: boolean;
  created_at: string;
  place_id: string;
  places: { name_ar: string } | null;
};

export default function AdminReviews() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reviews")
      .select("id, reviewer_name, rating, review_text, is_approved, created_at, place_id, places(name_ar)")
      .order("created_at", { ascending: false });
    if (data) setReviews(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchReviews(); }, []);

  const toggleApproval = async (id: string, current: boolean) => {
    await supabase.from("reviews").update({ is_approved: !current }).eq("id", id);
    setReviews(prev => prev.map(r => r.id === id ? { ...r, is_approved: !current } : r));
    toast.success(!current ? "تم اعتماد التقييم" : "تم إخفاء التقييم");
  };

  const deleteReview = async (id: string) => {
    if (!confirm("هل تريد حذف هذا التقييم؟")) return;
    await supabase.from("reviews").delete().eq("id", id);
    setReviews(prev => prev.filter(r => r.id !== id));
    toast.success("تم حذف التقييم");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">التقييمات</h1>
        <span className="text-sm text-muted-foreground">{reviews.length} تقييم</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">لا توجد تقييمات</p>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-right p-3 font-medium">المكان</th>
                  <th className="text-right p-3 font-medium">الاسم</th>
                  <th className="text-right p-3 font-medium">التقييم</th>
                  <th className="text-right p-3 font-medium">النص</th>
                  <th className="text-right p-3 font-medium">التاريخ</th>
                  <th className="text-right p-3 font-medium">الحالة</th>
                  <th className="text-right p-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((rev) => (
                  <tr key={rev.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium max-w-[150px] truncate">
                      {(rev.places as any)?.name_ar || "—"}
                    </td>
                    <td className="p-3">{rev.reviewer_name}</td>
                    <td className="p-3">
                      <StarRating rating={rev.rating} />
                    </td>
                    <td className="p-3 max-w-[200px] truncate text-muted-foreground">
                      {rev.review_text || "—"}
                    </td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {format(new Date(rev.created_at), "yyyy-MM-dd")}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleApproval(rev.id, rev.is_approved)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                          rev.is_approved
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        {rev.is_approved ? <><Check className="h-3 w-3" /> معتمد</> : <><X className="h-3 w-3" /> مخفي</>}
                      </button>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => deleteReview(rev.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
