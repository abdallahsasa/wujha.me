import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type PublicUser = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  auth_id?: string | null;
};

type PublicAuthContextType = {
  authUser: User | null;
  publicUser: PublicUser | null;
  guestUser: PublicUser | null;
  loading: boolean;
  setGuestUser: (user: PublicUser | null) => void;
  signOut: () => Promise<void>;
};

const PublicAuthContext = createContext<PublicAuthContextType>({
  authUser: null,
  publicUser: null,
  guestUser: null,
  loading: true,
  setGuestUser: () => {},
  signOut: async () => {},
});

export const usePublicAuth = () => useContext(PublicAuthContext);

export function PublicAuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [publicUser, setPublicUser] = useState<PublicUser | null>(null);
  const [guestUser, setGuestUser] = useState<PublicUser | null>(() => {
    try {
      const stored = localStorage.getItem("wujha_guest");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const linkedRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  // Sync auth state without blocking — never flip loading back to true after initial resolution
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setAuthUser(u);
      if (!u) {
        setPublicUser(null);
        linkedRef.current = null;
      }
      // Only clear loading on first resolution
      if (!initializedRef.current) {
        initializedRef.current = true;
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
      if (!initializedRef.current) {
        initializedRef.current = true;
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Link profile as a side effect when authUser changes (fire-and-forget)
  useEffect(() => {
    if (!authUser) return;
    if (linkedRef.current === authUser.id) return;
    linkedRef.current = authUser.id;

    supabase.functions.invoke("link-user-profile", {
      body: { name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User" },
    }).then(({ data }) => {
      if (data?.user) {
        setPublicUser(data.user);
        if (localStorage.getItem("wujha_guest")) {
          setGuestUser(null);
          localStorage.removeItem("wujha_guest");
        }
      }
    }).catch((err) => {
      console.error("Failed to link profile:", err);
    });
  }, [authUser]);

  const handleSetGuestUser = (user: PublicUser | null) => {
    setGuestUser(user);
    if (user) {
      localStorage.setItem("wujha_guest", JSON.stringify(user));
    } else {
      localStorage.removeItem("wujha_guest");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setPublicUser(null);
    setGuestUser(null);
    linkedRef.current = null;
    localStorage.removeItem("wujha_guest");
  };

  return (
    <PublicAuthContext.Provider value={{ authUser, publicUser, guestUser, loading, setGuestUser: handleSetGuestUser, signOut }}>
      {children}
    </PublicAuthContext.Provider>
  );
}
