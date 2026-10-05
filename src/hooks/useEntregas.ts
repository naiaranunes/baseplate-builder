import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { proximoPrazo, type EntregaStatus, type Periodicidade } from "@/lib/entregas";

export type Liderado = { id: string; gestor_id: string; nome: string; cargo: string | null; email: string | null; area: string | null; ativo: boolean };

export type Entrega = {
  id: string;
  titulo: string;
  descricao: string | null;
  lider_id: string;
  liderado_cadastro_id: string | null;
  prazo: string;
  status: EntregaStatus;
  periodicidade: Periodicidade;
  data_realizacao: string | null;
  observacao_realizacao: string | null;
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

export function useLiderados() {
  return useQuery({
    queryKey: ["liderados"],
    queryFn: async () => {
      const { data, error } = await supabase.from("liderados").select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as Liderado[];
    },
  });
}

export function useLideres() {
  return useQuery({
    queryKey: ["lideres"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_leaders");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string }[];
    },
  });
}

export function useSalvarLiderado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; nome: string; cargo?: string | null; email?: string | null; area?: string | null; gestor_id?: string; ativo?: boolean }) => {
      const { id, ...rest } = input;
      const { error } = id
        ? await supabase.from("liderados").update(rest).eq("id", id)
        : await supabase.from("liderados").insert(rest);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["liderados"] }),
  });
}

/** Exclui só se não houver entregas; caso contrário, inativa (preserva histórico). Retorna "inativado" | "excluido". */
export function useExcluirLiderado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { count, error: e1 } = await supabase.from("entregas").select("id", { count: "exact", head: true }).eq("liderado_cadastro_id", id);
      if (e1) throw e1;
      if ((count ?? 0) > 0) {
        const { error } = await supabase.from("liderados").update({ ativo: false }).eq("id", id);
        if (error) throw error;
        return "inativado" as const;
      }
      const { error } = await supabase.from("liderados").delete().eq("id", id);
      if (error) throw error;
      return "excluido" as const;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["liderados"] });
      qc.invalidateQueries({ queryKey: ["entregas"] });
    },
  });
}

export function useEntregas() {
  return useQuery({
    queryKey: ["entregas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("entregas").select("*").order("prazo");
      if (error) throw error;
      return (data ?? []) as unknown as Entrega[];
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
    mutationFn: async (input: { titulo: string; descricao?: string; liderado_cadastro_id: string; prazo: string; periodicidade: Periodicidade }) => {
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

/** Registra a realização e, se for recorrente, agenda a próxima ocorrência. */
export function useRegistrarRealizacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entrega, data, observacao }: { entrega: Entrega; data: string; observacao?: string }) => {
      const { error } = await supabase.from("entregas")
        .update({ status: "entregue", data_realizacao: data, observacao_realizacao: observacao || null })
        .eq("id", entrega.id);
      if (error) throw error;
      const prox = proximoPrazo(entrega.prazo, entrega.periodicidade);
      if (prox) {
        const { error: e2 } = await supabase.from("entregas").insert({
          titulo: entrega.titulo, descricao: entrega.descricao, liderado_cadastro_id: entrega.liderado_cadastro_id,
          prazo: prox, periodicidade: entrega.periodicidade,
        });
        if (e2) throw e2;
      }
      return prox;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["entregas"] });
      qc.invalidateQueries({ queryKey: ["entrega_historico", v.entrega.id] });
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

export function useExcluirEntrega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("entregas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregas"] }),
  });
}
