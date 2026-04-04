import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft } from "lucide-react";

type Category = { id: string; name_ar: string; slug: string };

interface CategoryNavProps {
  selected?: string;
  onSelect?: (id: string) => void;
}

export default function CategoryNav({ selected = "all", onSelect }: CategoryNavProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(false);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, name_ar, slug")
      .eq("is_active", true)
      .eq("type", "event")
      .order("sort_order")
      .then(({ data }) => {
        if (data) setCategories(data);
      });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const checkScroll = () => {
      // In RTL, scrollLeft is negative in some browsers
      const hasMore = el.scrollWidth > el.clientWidth;
      setShowFade(hasMore);
    };
    checkScroll();
    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [categories]);

  const allCategories = [{ id: "all", name_ar: "الكل", slug: "all" }, ...categories];

  return (
    <div className="relative bg-white border-b border-wujha-border">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <div ref={scrollRef} className="flex gap-1 overflow-x-auto scrollbar-hide py-2.5">
          {allCategories.map(cat => {
            const isActive = selected === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelect?.(cat.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition whitespace-nowrap ${
                  isActive
                    ? "bg-wujha-text text-white"
                    : "text-wujha-text-muted hover:bg-wujha-surface hover:text-wujha-text"
                }`}
              >
                {cat.name_ar}
              </button>
            );
          })}
        </div>
      </div>
      {/* Fade indicator on the left edge (RTL: means more content to scroll) */}
      {showFade && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none flex items-center justify-center">
          <ChevronLeft className="h-4 w-4 text-wujha-text-muted" />
        </div>
      )}
    </div>
  );
}
