import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "admin" | "supervisor" | "agent";

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  supervisor: "Líder",
  agent: "Colaborador",
};

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  avatar_url: string | null;
  status: "online" | "offline" | "away" | "busy" | null;
  is_active: boolean;
  is_approved: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  isAdmin: boolean;
  isSupervisor: boolean;
  isAgent: boolean;
  isApproved: boolean;
  isActive: boolean;
  isPendingApproval: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string; isApproved?: boolean; isActive?: boolean; role?: AppRole }>;
  signUp: (fullName: string, email: string, password: string) => Promise<{ error?: string; pending?: boolean; isApproved?: boolean; role?: AppRole }>;
  signOut: () => Promise<void>;
  clearPasswordRecovery: () => void;
  refreshProfile: () => Promise<void>;
}
