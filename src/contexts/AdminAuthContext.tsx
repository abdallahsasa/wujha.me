import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  organizer_id: string | null;
}

interface AdminAuthContextType {
  session: Session | null;
  user: User | null;
  adminUser: AdminUser | null;
  loading: boolean;
  adminLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({} as AdminAuthContextType);

export const useAdminAuth = () => useContext(AdminAuthContext);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(true);
  const fetchedForRef = useRef<string | null>(null);

  // Sync auth state — never block on network calls here
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // If we detect a password recovery or invitation link, redirect to reset page
      if (event === "PASSWORD_RECOVERY") {
        window.location.href = "/admin/reset-password";
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        setAdminUser(null);
        fetchedForRef.current = null;
        setAdminLoading(false);
      }
      setSessionLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setSessionLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch admin profile as side effect — only when user actually changes
  useEffect(() => {
    if (sessionLoading) return;

    if (!user) {
      setAdminUser(null);
      setAdminLoading(false);
      fetchedForRef.current = null;
      return;
    }

    // Skip re-fetch if we already fetched for this user (tab switch / token refresh)
    if (fetchedForRef.current === user.id) {
      setAdminLoading(false);
      return;
    }

    const fetchAdmin = async () => {
      setAdminLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_admin_user_by_auth_id", { _auth_id: user.id });
        if (error) {
          console.error("Failed to fetch admin user:", error);
          setAdminUser(null);
        } else if (!data || data.length === 0) {
          setAdminUser(null);
        } else {
          setAdminUser(data[0] as AdminUser);
        }
        fetchedForRef.current = user.id;
      } catch (err) {
        console.error("Error fetching admin user:", err);
        setAdminUser(null);
      }
      setAdminLoading(false);
    };
    fetchAdmin();
  }, [user, sessionLoading]);

  const loading = sessionLoading || adminLoading;

  const signIn = async (email: string, password: string) => {
    fetchedForRef.current = null; // force re-fetch on new sign-in
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAdminUser(null);
    fetchedForRef.current = null;
  };

  return (
    <AdminAuthContext.Provider value={{ session, user, adminUser, loading, adminLoading, signIn, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
};
