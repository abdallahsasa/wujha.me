import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function Privacy() {
  const [content, setContent] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("page_content")
      .select("content_ar, updated_at")
      .eq("page_key", "privacy")
      .single()
      .then(({ data }) => {
        setContent(data?.content_ar ?? null);
        setUpdatedAt(data?.updated_at ?? null);
        setLoading(false);
      });
  }, []);

  return (
    <>
      <Helmet>
        <title>سياسة الخصوصية | وجهة</title>
        <meta name="description" content="سياسة الخصوصية لمنصة وجهة" />
      </Helmet>

      <div className="mx-auto max-w-[800px] px-4 md:px-6 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-wujha-text mb-3">سياسة الخصوصية</h1>
        {loading ? (
          <div className="space-y-3 mt-6">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <>
            {updatedAt && (
              <p className="text-sm text-wujha-text-muted mb-8">
                آخر تحديث: {format(new Date(updatedAt), "d MMMM yyyy", { locale: ar })}
              </p>
            )}
            <div className="prose prose-neutral max-w-none text-wujha-text leading-relaxed whitespace-pre-line">
              {content || "لا يوجد محتوى بعد."}
            </div>
          </>
        )}
      </div>
    </>
  );
}
