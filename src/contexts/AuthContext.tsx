import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "buyer" | "seller" | "admin";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  role: AppRole | null;
  roleLoading: boolean;
  language: string;
  setLanguage: (lang: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  role: null,
  roleLoading: true,
  language: "en",
  setLanguage: async () => { },
  signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [language, setLanguageState] = useState("en");

  const fetchProfile = async (userId: string) => {
    setRoleLoading(true);

    // Try fetching role from profiles table first (new schema)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, language_preference")
      .eq("user_id", userId)
      .maybeSingle();

    if (profile && profile.role) {
      setRole(profile.role as AppRole);
      setLanguageState(profile.language_preference || "en");
    } else {
      // Fallback: read from user_roles table (old schema)
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (data && data.length > 0) {
        const roles = data.map((r) => r.role);
        if (roles.includes("admin")) setRole("admin");
        else if (roles.includes("seller")) setRole("seller");
        else setRole("buyer");
      } else {
        setRole("buyer");
      }
    }
    setRoleLoading(false);
  };

  const setLanguage = async (lang: string) => {
    setLanguageState(lang);
    if (user) {
      await supabase
        .from("profiles")
        .update({ language_preference: lang })
        .eq("user_id", user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setRole(null);
          setRoleLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setRoleLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, role, roleLoading, language, setLanguage, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
