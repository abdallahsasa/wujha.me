import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type CurrencyKey = "new_syp" | "usd" | "old_syp";

type TicketTypePrice = {
  price_new_syp?: number | null;
  price_usd?: number | null;
  price_old_syp?: number | null;
  is_free?: boolean;
};

type CurrencyContextValue = {
  currency: CurrencyKey;
  setCurrency: (c: CurrencyKey) => void;
  formatPrice: (ticket: TicketTypePrice) => string;
  formatMinPrice: (tickets: TicketTypePrice[]) => string;
  currencyLabel: string;
};

const LABELS: Record<CurrencyKey, string> = {
  new_syp: "ل.س",
  usd: "$",
  old_syp: "ل.س قديمة",
};

const STORAGE_KEY = "preferred_currency";

function getStored(): CurrencyKey {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "new_syp" || v === "usd" || v === "old_syp") return v;
  } catch {}
  return "new_syp";
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, _setCurrency] = useState<CurrencyKey>(getStored);

  const setCurrency = useCallback((c: CurrencyKey) => {
    _setCurrency(c);
    try { localStorage.setItem(STORAGE_KEY, c); } catch {}
  }, []);

  const formatPrice = useCallback((t: TicketTypePrice): string => {
    if (t.is_free) return "مجاني";
    let value: number | null | undefined;
    if (currency === "usd") value = t.price_usd;
    else if (currency === "old_syp") value = t.price_old_syp;
    else value = t.price_new_syp;
    if (value == null) {
      // fallback to any available price
      if (t.price_new_syp != null) return `${t.price_new_syp.toLocaleString()} ل.س`;
      if (t.price_usd != null) return `$${t.price_usd.toLocaleString()}`;
      if (t.price_old_syp != null) return `${t.price_old_syp.toLocaleString()} ل.س قديمة`;
      return "";
    }
    if (currency === "usd") return `$${value.toLocaleString()}`;
    return `${value.toLocaleString()} ${LABELS[currency]}`;
  }, [currency]);

  const formatMinPrice = useCallback((tickets: TicketTypePrice[]): string => {
    if (!tickets.length) return "";
    let min: number | null = null;
    for (const t of tickets) {
      let v: number | null | undefined;
      if (currency === "usd") v = t.price_usd;
      else if (currency === "old_syp") v = t.price_old_syp;
      else v = t.price_new_syp;
      if (v != null && (min === null || v < min)) min = v;
    }
    if (min === null) return "";
    if (currency === "usd") return `$${min.toLocaleString()}`;
    return `${min.toLocaleString()} ${LABELS[currency]}`;
  }, [currency]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, formatMinPrice, currencyLabel: LABELS[currency] }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
