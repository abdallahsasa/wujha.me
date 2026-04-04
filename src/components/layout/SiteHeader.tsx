import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Search, ChevronDown, Menu, X, DollarSign } from "lucide-react";
import { usePublicAuth } from "@/contexts/PublicAuthContext";
import { useCurrency, type CurrencyKey } from "@/contexts/CurrencyContext";
import UserMenu from "@/components/auth/UserMenu";
import LoginModal from "@/components/auth/LoginModal";
import wujhaLogo from "@/assets/wujha-logo.png";
import { supabase } from "@/integrations/supabase/client";

type City = { id: string; name_ar: string; slug: string };
type Category = { id: string; name_ar: string; slug: string };

export default function SiteHeader() {
  const { authUser, guestUser } = usePublicAuth();
  const isLoggedIn = !!authUser || !!guestUser;
  const { currency, setCurrency } = useCurrency();

  const currencyOptions: { key: CurrencyKey; label: string }[] = [
    { key: "new_syp", label: "ل.س" },
    { key: "usd", label: "$" },
    { key: "old_syp", label: "ل.س قديمة" },
  ];
  const [loginOpen, setLoginOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Read filters from URL
  const selectedCity = searchParams.get("city") || "all";
  const selectedCategory = searchParams.get("category") || "all";

  const setFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const qs = params.toString();
    // Always navigate to homepage with filters
    navigate(qs ? `/?${qs}` : "/", { replace: location.pathname === "/" });
  }, [searchParams, navigate, location.pathname]);

  // Data
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // UI state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const cityRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setMobileMenuOpen(false);
    }
  };

  useEffect(() => {
    Promise.all([
      supabase.from("cities").select("id, name_ar, slug").eq("is_active", true).order("sort_order"),
      supabase.from("categories").select("id, name_ar, slug").eq("is_active", true).eq("type", "event").order("sort_order"),
    ]).then(([cityRes, catRes]) => {
      if (cityRes.data) setCities(cityRes.data);
      if (catRes.data) setCategories(catRes.data);
    });
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityDropdownOpen(false);
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const selectedCityName = selectedCity === "all" ? "كل المدن" : cities.find(c => c.id === selectedCity)?.name_ar || "كل المدن";
  const selectedCatName = selectedCategory === "all" ? "كل الفئات" : categories.find(c => c.id === selectedCategory)?.name_ar || "كل الفئات";

  return (
    <>
      <header className="fixed top-0 right-0 left-0 z-50 bg-white" style={{ boxShadow: "0 1px 3px 0 rgba(0,0,0,0.06)" }}>
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 md:px-6 h-[60px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={wujhaLogo} alt="Wujha" className="h-8 w-8 rounded-lg" />
            <span className="text-xl font-bold tracking-tight text-wujha-text">وجهة</span>
          </Link>

          {/* City selector — desktop */}
          <div ref={cityRef} className="relative hidden md:block">
            <button
              onClick={() => { setCityDropdownOpen(!cityDropdownOpen); setCatDropdownOpen(false); }}
              className="flex items-center gap-1.5 rounded-full border border-wujha-border px-4 py-1.5 text-sm font-medium text-wujha-text hover:bg-wujha-surface transition"
            >
              {selectedCityName}
              <ChevronDown className="h-3.5 w-3.5 text-wujha-text-muted" />
            </button>
            {cityDropdownOpen && (
              <div className="absolute top-full mt-1 right-0 w-48 rounded-xl bg-white border border-wujha-border shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
                <button onClick={() => { setFilter("city", "all"); setCityDropdownOpen(false); }} className={`block w-full text-right px-4 py-2.5 text-sm hover:bg-wujha-surface transition ${selectedCity === "all" ? "font-bold text-wujha-accent" : "text-wujha-text"}`}>
                  كل المدن
                </button>
                {cities.map(c => (
                  <button key={c.id} onClick={() => { setFilter("city", c.id); setCityDropdownOpen(false); }} className={`block w-full text-right px-4 py-2.5 text-sm hover:bg-wujha-surface transition ${selectedCity === c.id ? "font-bold text-wujha-accent" : "text-wujha-text"}`}>
                    {c.name_ar}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category selector — desktop */}
          <div ref={catRef} className="relative hidden md:block">
            <button
              onClick={() => { setCatDropdownOpen(!catDropdownOpen); setCityDropdownOpen(false); }}
              className="flex items-center gap-1.5 rounded-full border border-wujha-border px-4 py-1.5 text-sm font-medium text-wujha-text hover:bg-wujha-surface transition"
            >
              {selectedCatName}
              <ChevronDown className="h-3.5 w-3.5 text-wujha-text-muted" />
            </button>
            {catDropdownOpen && (
              <div className="absolute top-full mt-1 right-0 w-48 rounded-xl bg-white border border-wujha-border shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
                <button onClick={() => { setFilter("category", "all"); setCatDropdownOpen(false); }} className={`block w-full text-right px-4 py-2.5 text-sm hover:bg-wujha-surface transition ${selectedCategory === "all" ? "font-bold text-wujha-accent" : "text-wujha-text"}`}>
                  كل الفئات
                </button>
                {categories.map(c => (
                  <button key={c.id} onClick={() => { setFilter("category", c.id); setCatDropdownOpen(false); }} className={`block w-full text-right px-4 py-2.5 text-sm hover:bg-wujha-surface transition ${selectedCategory === c.id ? "font-bold text-wujha-accent" : "text-wujha-text"}`}>
                    {c.name_ar}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search bar — desktop */}
          <form onSubmit={handleSearch} className="relative flex-1 min-w-0 hidden md:block">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-wujha-text-muted" />
            <input
              type="text"
              placeholder="ابحث عن فعالية أو مكان..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-wujha-border bg-white pr-10 pl-4 text-sm text-wujha-text placeholder:text-wujha-text-muted focus:outline-none focus:ring-2 focus:ring-wujha-accent/20 focus:border-wujha-accent transition"
            />
          </form>

          {/* Search icon — mobile */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="md:hidden flex items-center justify-center h-9 w-9 rounded-xl hover:bg-wujha-surface transition mr-auto"
          >
            <Search className="h-5 w-5 text-wujha-text" />
          </button>

          {/* Currency selector — desktop */}
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value as CurrencyKey)}
            className="hidden md:block h-8 rounded-lg border border-wujha-border bg-white px-2 text-xs font-medium text-wujha-text focus:outline-none focus:ring-1 focus:ring-wujha-accent/30 cursor-pointer"
          >
            {currencyOptions.map(o => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>

          {/* User area */}
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                className="shrink-0 text-sm font-medium text-wujha-text hover:text-wujha-accent transition hidden md:inline-block"
              >
                تسجيل الدخول
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center justify-center h-9 w-9 rounded-xl hover:bg-wujha-surface transition"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile search bar — expanded */}
        {searchOpen && (
          <div className="md:hidden px-4 pb-3">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-wujha-text-muted" />
              <input
                type="text"
                placeholder="ابحث عن فعالية أو مكان..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                className="h-10 w-full rounded-xl border border-wujha-border bg-white pr-10 pl-4 text-sm text-wujha-text placeholder:text-wujha-text-muted focus:outline-none focus:ring-2 focus:ring-wujha-accent/20 focus:border-wujha-accent transition"
              />
            </form>
          </div>
        )}

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-wujha-border bg-white px-4 py-4 space-y-4">
            {/* City selector */}
            <div>
              <label className="text-xs font-medium text-wujha-text-muted mb-1.5 block">المدينة</label>
              <select
                value={selectedCity}
                onChange={e => { setFilter("city", e.target.value); setMobileMenuOpen(false); }}
                className="h-10 w-full rounded-xl border border-wujha-border bg-white px-3 text-sm text-wujha-text focus:outline-none focus:ring-2 focus:ring-wujha-accent/20"
              >
                <option value="all">كل المدن</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
            </div>
            {/* Category selector */}
            <div>
              <label className="text-xs font-medium text-wujha-text-muted mb-1.5 block">الفئة</label>
              <select
                value={selectedCategory}
                onChange={e => { setFilter("category", e.target.value); setMobileMenuOpen(false); }}
                className="h-10 w-full rounded-xl border border-wujha-border bg-white px-3 text-sm text-wujha-text focus:outline-none focus:ring-2 focus:ring-wujha-accent/20"
              >
                <option value="all">كل الفئات</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
            </div>
            {/* Currency selector on mobile */}
            <div>
              <label className="text-xs font-medium text-wujha-text-muted mb-1.5 block">العملة</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value as CurrencyKey)}
                className="h-10 w-full rounded-xl border border-wujha-border bg-white px-3 text-sm text-wujha-text focus:outline-none focus:ring-2 focus:ring-wujha-accent/20"
              >
                {currencyOptions.map(o => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </div>
            {/* Login on mobile */}
            {!isLoggedIn && (
              <button
                onClick={() => { setLoginOpen(true); setMobileMenuOpen(false); }}
                className="w-full rounded-xl bg-wujha-accent text-wujha-accent-foreground font-medium py-2.5 text-sm transition hover:opacity-90"
              >
                تسجيل الدخول
              </button>
            )}
          </div>
        )}
      </header>

      {/* Spacer */}
      <div className="h-[60px]" />

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} context="general" />
    </>
  );
}
