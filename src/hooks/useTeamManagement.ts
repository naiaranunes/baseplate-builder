import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Profile } from "@/types/auth";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export interface TeamMember extends Profile {
  role: AppRole | null;
}

async function functionErrorMessage(error: Error & { context?: unknown }): Promise<string> {
  if (error.context instanceof Response) {
    const response = error.context;
    const text = await response.text();
    try {
      const body: unknown = JSON.parse(text);
      if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
        return body.error;
      }
      if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
        return body.message;
      }
    } catch {
      if (text) return `Falha ao excluir usuário (HTTP ${response.status}): ${text}`;
    }
    return `Falha ao excluir usuário (HTTP ${response.status}).`;
  }
  return error.message || "Erro ao excluir usuário.";
}

export function useTeamManagement() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const membersQuery = useQuery({
    queryKey: ["team-members", user?.id],
    queryFn: async (): Promise<TeamMember[]> => {
      const { data: profiles, error } = await supabase
        .from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const { data: roles, error: rolesError } = await supabase.from("user_roles").select("user_id, role");
      if (rolesError) throw rolesError;
      const map = new Map<string, AppRole>((roles ?? []).map((r) => [r.user_id, r.role as AppRole]));
      return (profiles ?? []).map((profile) => ({ ...(profile as Profile), role: map.get(profile.id) ?? null }));
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["team-members"] });

  const approveMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("admin_set_user_status", {
        p_user_id: userId,
        p_is_active: true,
        p_is_approved: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Usuário aprovado"); invalidate(); },
    onError: (e: Error) => toast.error(e.message ?? "Erro ao aprovar"),
  });

  const rejectMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("admin_set_user_status", {
        p_user_id: userId,
        p_is_active: false,
        p_is_approved: false,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Usuário rejeitado"); invalidate(); },
    onError: (e: Error) => toast.error(e.message ?? "Erro"),
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { error } = await supabase.rpc("admin_set_user_role", {
        p_user_id: userId,
        p_role: newRole,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Perfil atualizado"); invalidate(); },
    onError: (e: Error) => toast.error(e.message ?? "Erro"),
  });

  const deactivateMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("admin_set_user_status", {
        p_user_id: userId,
        p_is_active: false,
        p_is_approved: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Usuário desativado"); invalidate(); },
    onError: (e: Error) => toast.error(e.message ?? "Erro"),
  });

  const reactivateMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("admin_set_user_status", {
        p_user_id: userId,
        p_is_active: true,
        p_is_approved: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Usuário reativado"); invalidate(); },
    onError: (e: Error) => toast.error(e.message ?? "Erro"),
  });

  const deleteMember = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: userId },
      });
      if (error) throw new Error(await functionErrorMessage(error));
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Usuário excluído");
      invalidate();
      qc.invalidateQueries({ queryKey: ["liderados"] });
      qc.invalidateQueries({ queryKey: ["entregas"] });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao excluir usuário"),
  });

  return {
    members: membersQuery.data ?? [],
    isLoading: membersQuery.isLoading,
    approveMember, rejectMember, changeRole, deactivateMember, reactivateMember, deleteMember,
  };
}
