import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, AuthContextValue, Profile } from "@/types/auth";
import { AuthContext } from "@/contexts/auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadedFor = useRef<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  const loadProfileAndRole = useCallback(async (uid: string) => {
    const [profileResult, roleResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid).order("role").maybeSingle(),
    ]);
    if (profileResult.error) console.error("[Auth] Falha ao carregar perfil:", profileResult.error);
    if (roleResult.error) console.error("[Auth] Falha ao carregar papel:", roleResult.error);
    setProfile((profileResult.data as Profile) ?? null);
    setRole((roleResult.data?.role as AppRole) ?? null);
    if (roleResult.data?.role === "agent") {
      const { error } = await supabase.rpc("claim_my_liderado");
      if (error) console.error("[Auth] Falha ao vincular colaborador ao perfil:", error);
    }
  }, []);

  const checkActiveStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-user-active");
      if (error) {
        console.warn("[Auth] Falha ao verificar o status da conta:", error);
        return;
      }
      // Only sign out when explicitly inactive. Unapproved users go to /pending-approval.
      if (data && data.active === false) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.warn("[Auth] Falha ao verificar o status da conta:", error);
    }
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      const nextUser = sess?.user ?? null;
      accessTokenRef.current = sess?.access_token ?? null;
      // Keep context stable on TOKEN_REFRESHED / tab-focus when the user has not changed.
      setSession((prev) => (prev?.user?.id === nextUser?.id ? prev : sess));
      setUser((prev) => (prev?.id === nextUser?.id ? prev : nextUser));

      if (!nextUser) {
        setProfile(null); setRole(null); loadedFor.current = null;
      } else if (loadedFor.current !== nextUser.id) {
        loadedFor.current = nextUser.id;
        setIsLoading(true);
        setTimeout(() => {
          void loadProfileAndRole(nextUser.id)
            .catch((error) => console.error("[Auth] Falha ao carregar perfil:", error))
            .finally(() => setIsLoading(false));
          checkActiveStatus();
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      accessTokenRef.current = s?.access_token ?? null;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadedFor.current = s.user.id;
        void loadProfileAndRole(s.user.id)
          .finally(() => setIsLoading(false))
          .catch((error) => console.error("[Auth] Falha ao carregar perfil:", error));
        checkActiveStatus();
      } else {
        setIsLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfileAndRole, checkActiveStatus]);

  // Mark offline on unload
  useEffect(() => {
    const handler = () => {
      if (!user) return;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`;
      const body = JSON.stringify({ status: "offline" });
      void fetch(url, {
        method: "PATCH",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessTokenRef.current ?? ""}`,
        },
        body,
      }).catch((error) => console.warn("[Auth] Falha ao atualizar presença:", error));
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [user]);

  const signIn = useCallback<AuthContextValue["signIn"]>(async (email, password) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Falha no login." };

    // Fetch approval/active state immediately so caller can route correctly.
    const [{ data: prof, error: profileError }, { data: roleData, error: roleError }] = await Promise.all([
      supabase.from("profiles").select("is_approved, is_active").eq("id", data.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", data.user.id).maybeSingle(),
    ]);
    if (profileError) {
      console.error("[Auth] Falha ao validar o perfil durante o login:", profileError);
      return { error: "Não foi possível verificar o status da sua conta." };
    }
    if (roleError) {
      console.error("[Auth] Falha ao validar o papel durante o login:", roleError);
      return { error: "Não foi possível verificar o perfil de acesso da sua conta." };
    }

    const isActive = prof ? !!prof.is_active : true;
    const isApproved = prof ? !!prof.is_approved : false;

    if (!isActive) {
      await supabase.auth.signOut();
      return { error: "Sua conta foi desativada." };
    }

    const { error: presenceError } = await supabase.from("profiles").update({ status: "online" }).eq("id", data.user.id);
    if (presenceError) console.warn("[Auth] Falha ao atualizar presença:", presenceError);
    const userRole = roleData?.role as AppRole | undefined;
    if (userRole === "agent") {
      const { error } = await supabase.rpc("claim_my_liderado");
      if (error) console.error("[Auth] Falha ao vincular colaborador ao perfil:", error);
    }
    return { isApproved, isActive, role: userRole };
  }, []);

  const signUp = useCallback<AuthContextValue["signUp"]>(async (fullName, email, password) => {
    const { data: vd, error: vErr } = await supabase.functions.invoke("validate-signup", { body: { email } });
    if (vErr) return { error: "Falha ao validar cadastro." };
    if (vd && vd.allowed === false) return { error: vd.message ?? "Cadastro não permitido." };

    const redirectUrl = `${window.location.origin}/`;
    const { data: signUpData, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: redirectUrl, data: { full_name: fullName } },
    });
    if (error) return { error: error.message };

    // Determine approval status; if the on_auth_user_created trigger did not run
    // (common after a remix), fall back to the bootstrap-profile edge function.
    let isApproved: boolean | undefined = undefined;
    let userRole: AppRole | undefined;
    const newUserId = signUpData.user?.id;
    const hasSession = !!signUpData.session;

    if (newUserId) {
      const { data: prof } = await supabase
        .from("profiles").select("is_approved").eq("id", newUserId).maybeSingle();
      if (prof) {
        isApproved = !!prof.is_approved;
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", newUserId)
          .maybeSingle();
        if (roleError) console.warn("[Auth] Falha ao carregar o perfil criado:", roleError);
        else userRole = roleData?.role as AppRole | undefined;
      } else if (hasSession) {
        // Profile missing — invoke fallback to recreate it idempotently.
        try {
          const { data: boot } = await supabase.functions.invoke("bootstrap-profile");
          if (boot && typeof boot.isApproved === "boolean") {
            isApproved = boot.isApproved;
            if (boot.role === "admin" || boot.role === "supervisor" || boot.role === "agent") {
              userRole = boot.role;
            }
            // Refresh local profile/role caches.
            await loadProfileAndRole(newUserId);
          }
        } catch (error) {
          console.warn("[Auth] Falha ao recriar perfil após o cadastro:", error);
        }
      }
    }
    return { pending: true, isApproved, role: userRole };
  }, [loadProfileAndRole]);

  const signOut = useCallback(async () => {
    if (user) {
      try {
        const { error } = await supabase.from("profiles").update({ status: "offline" }).eq("id", user.id);
        if (error) console.warn("[Auth] Falha ao atualizar presença ao sair:", error);
      } catch (error) {
        console.warn("[Auth] Falha ao atualizar presença ao sair:", error);
      }
    }
    await supabase.auth.signOut();
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfileAndRole(user.id);
  }, [user, loadProfileAndRole]);

  const value = useMemo<AuthContextValue>(() => ({
    user, session, profile, role, isLoading,
    isAdmin: role === "admin",
    isSupervisor: role === "supervisor",
    isAgent: role === "agent",
    isApproved: !!profile?.is_approved,
    isActive: profile ? profile.is_active : true,
    isPendingApproval: !!profile && profile.is_active && !profile.is_approved,
    signIn, signUp, signOut, refreshProfile,
  }), [user, session, profile, role, isLoading, signIn, signUp, signOut, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
