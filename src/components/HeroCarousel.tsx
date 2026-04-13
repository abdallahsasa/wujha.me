import { useEffect, useCallback, useState } from "react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { thumbnailUrl } from "@/lib/cloudinary";

type Event = {
  id: string;
  slug?: string;
  title_ar: string;
  cover_image: string | null;
  hero_video: string | null;
  hero_thumbnail: string | null;
  start_date: string;
};

interface HeroCarouselProps {
  events: Event[];
}

export default function HeroCarousel({ events }: HeroCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", direction: "rtl", slidesToScroll: 1 },
    [Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })]
  );

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  if (events.length === 0) return null;

  return (
    <div className="relative mx-auto max-w-[1030px]">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {events.map((ev) => (
            <div key={ev.id} className="relative shrink-0" style={{ flex: "0 0 100%", minWidth: 0 }}>
              <Link to={`/events/${ev.slug || ev.id}`} className="block w-full h-[200px] sm:h-[300px] md:h-[500px] lg:h-[500px] rounded-[18px] overflow-hidden">
                {ev.hero_video ? (
                  <video src={ev.hero_video} poster={thumbnailUrl(ev.hero_thumbnail || ev.cover_image || "") || "/placeholder.svg"}
                    autoPlay muted loop playsInline
                    onTimeUpdate={(e) => { if (e.currentTarget.currentTime >= 5) e.currentTarget.currentTime = 0; }}
                    className="h-full w-full object-cover" />
                ) : (
                  <img src={thumbnailUrl(ev.cover_image || "") || "/placeholder.svg"} alt={ev.title_ar}
                    className="h-full w-full object-cover" loading="lazy" />
                )}
              </Link>
            </div>
          ))}
        </div>
      </div>
      <button onClick={() => emblaApi?.scrollPrev()} disabled={!canScrollPrev}
        className="absolute top-1/2 -translate-y-1/2 -right-5 z-10 hidden md:flex h-11 w-11 items-center justify-center rounded-full bg-white text-wujha-text shadow-md border border-wujha-border hover:shadow-lg transition disabled:opacity-40">
        <ChevronRight className="h-5 w-5" />
      </button>
      <button onClick={() => emblaApi?.scrollNext()} disabled={!canScrollNext}
        className="absolute top-1/2 -translate-y-1/2 -left-5 z-10 hidden md:flex h-11 w-11 items-center justify-center rounded-full bg-white text-wujha-text shadow-md border border-wujha-border hover:shadow-lg transition disabled:opacity-40">
        <ChevronLeft className="h-5 w-5" />
      </button>
    </div>
  );
}
