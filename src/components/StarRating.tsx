import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  size?: "sm" | "md";
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

export default function StarRating({ rating, size = "sm", interactive = false, onRate }: StarRatingProps) {
  const starSize = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";

  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onRate?.(i)}
          className={interactive ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"}
        >
          <Star
            className={`${starSize} ${
              i <= Math.round(rating)
                ? "fill-wujha-gold text-wujha-gold"
                : "text-wujha-border fill-none"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
