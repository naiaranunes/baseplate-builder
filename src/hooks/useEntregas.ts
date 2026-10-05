import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EntregaStatus } from "@/lib/entregas";

export type Entrega = {
  id: string;
  titulo: string;
  descricao: string | null;
  lider_id: string;
  liderado_id: string;
  prazo: string;
  status: EntregaStatus;
  created_at: string;
};

export type Historico = {
  id: string;
  entrega_id: string;
  autor_id: string | null;
  status_anterior: string | null;
  status_novo: string | null;
  comentario: string | null;
  created_at: string;
};

export function useMembros() {
  return useQuery({
    queryKey: ["membros"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_members");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string }[];
    },
  });
}

export function useEntregas() {
  return useQuery({
    queryKey: ["entregas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("entregas").select("*").order("prazo");
      if (error) throw error;
      return (data ?? []) as Entrega[];
    },
  });
}

export function useHistorico(entregaId?: string) {
  return useQuery({
    queryKey: ["entrega_historico", entregaId],
    enabled: !!entregaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entrega_historico").select("*").eq("entrega_id", entregaId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Historico[];
    },
  });
}

export function useCreateEntrega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { titulo: string; descricao?: string; lider_id: string; liderado_id: string; prazo: string }) => {
      const { error } = await supabase.from("entregas").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregas"] }),
  });
}

export function useUpdateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EntregaStatus }) => {
      const { error } = await supabase.from("entregas").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["entregas"] });
      qc.invalidateQueries({ queryKey: ["entrega_historico", v.id] });
    },
  });
}

export function useAddComentario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entrega_id, comentario, autor_id }: { entrega_id: string; comentario: string; autor_id: string }) => {
      const { error } = await supabase.from("entrega_historico").insert({ entrega_id, comentario, autor_id });
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["entrega_historico", v.entrega_id] }),
  });
}
