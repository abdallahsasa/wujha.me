import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Ticket, Heart, User, LogOut } from "lucide-react";
import { usePublicAuth } from "@/contexts/PublicAuthContext";

export default function UserMenu() {
  const { authUser, publicUser, guestUser, signOut } = usePublicAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentUser = publicUser || guestUser;
  const displayName = currentUser?.name || authUser?.user_metadata?.full_name || authUser?.email?.split("@")[0] || "مستخدم";
  const firstLetter = displayName.charAt(0);
  const isGuest = !authUser && !!guestUser;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg bg-wujha-surface border border-wujha-border px-3 py-1.5 text-sm hover:bg-wujha-surface-hover transition"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-wujha-gold text-wujha-gold-foreground text-xs font-bold">
          {firstLetter}
        </div>
        <span className="hidden sm:inline max-w-[100px] truncate">{displayName}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-48 rounded-xl bg-wujha-bg border border-wujha-border shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-wujha-border">
            <p className="font-bold text-sm truncate">{displayName}</p>
            {isGuest && <p className="text-wujha-text-muted text-xs">زائر</p>}
          </div>

          {!isGuest && (
            <div className="py-1">
              <Link to="/my-tickets" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-wujha-surface transition">
                <Ticket className="h-4 w-4 text-wujha-text-muted" />
                تذاكري
              </Link>
              <Link to="/favorites" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-wujha-surface transition">
                <Heart className="h-4 w-4 text-wujha-text-muted" />
                المفضلة
              </Link>
              <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-wujha-surface transition">
                <User className="h-4 w-4 text-wujha-text-muted" />
                الملف الشخصي
              </Link>
            </div>
          )}

          <div className="border-t border-wujha-border py-1">
            <button
              onClick={() => { signOut(); setOpen(false); }}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-wujha-surface transition w-full"
            >
              <LogOut className="h-4 w-4" />
              تسجيل خروج
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
