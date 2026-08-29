import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  roleChecked: boolean;
  signUp: (email: string, password: string, displayName: string, username?: string, referredByCode?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  const checkAdminRole = async (userId: string, email?: string) => {
    const normalized = email?.toLowerCase();
    if (
      normalized === "bethelincovibetv@gmail.com" ||
      normalized === "bethelgoodgift3@gmail.com" ||
      normalized === "goodgiftdigital@gmail.com" ||
      normalized === "bethelchukwunyere1@gmail.com"
    ) {
      setIsAdmin(true);
      setRoleChecked(true);
      return;
    }
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    } catch {
      setIsAdmin(false);
    } finally {
      setRoleChecked(true);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => checkAdminRole(session.user.id, session.user.email), 0);
        } else {
          setIsAdmin(false);
          setRoleChecked(true);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          checkAdminRole(session.user.id, session.user.email);
        } else {
          setRoleChecked(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Auth getSession fallback:", err?.message || err);
        setRoleChecked(true);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const ensureProfile = async (userId: string, email: string, displayName: string, username?: string) => {
    try {
      const cleanUsername = username?.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") || null;
      const { data: existing } = await supabase.from("profiles").select("id, username").eq("user_id", userId).maybeSingle();
      if (!existing) {
        await supabase.from("profiles").insert({
          user_id: userId,
          email,
          display_name: displayName,
          username: cleanUsername,
          is_public: true,
        });
      } else if (cleanUsername && (!existing.username || existing.username !== cleanUsername)) {
        await supabase.from("profiles").update({
          username: cleanUsername,
          is_public: true,
        }).eq("user_id", userId);
      }
    } catch (e) {
      console.warn("Profile sync warning:", e);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    username?: string,
    referredByCode?: string
  ) => {
    const cleanUsername = username?.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          username: cleanUsername,
          ...(referredByCode ? { referred_by_code: referredByCode } : {}),
        },
        emailRedirectTo: window.location.origin,
      },
    });

    if (!error && authData?.user) {
      await ensureProfile(authData.user.id, email, displayName, cleanUsername);
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, roleChecked, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
