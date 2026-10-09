import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { proximoPrazo, type EntregaStatus, type Periodicidade } from "@/lib/entregas";

export type Liderado = { id: string; gestor_id: string; usuario_id: string | null; nome: string; cargo: string | null; email: string | null; area: string | null; ativo: boolean };

export type Entrega = {
  id: string;
  titulo: string;
  descricao: string | null;
  lider_id: string;
  liderado_cadastro_id: string | null;
  prazo: string;
  prazo_hora: string | null;
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
  const { user } = useAuth();
  return useQuery({
    queryKey: ["membros", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_members");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string }[];
    },
  });
}

export function useLiderados() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["liderados", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("liderados").select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as Liderado[];
    },
  });
}

export function useLideres() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lideres", user?.id],
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
      if (id) {
        const { error } = await supabase.from("liderados").update(rest).eq("id", id);
        if (error) throw error;
        return id;
      }

      const { data, error } = await supabase.from("liderados").insert(rest).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["liderados"] });
      qc.invalidateQueries({ queryKey: ["colaboradores-responsaveis"] });
    },
  });
}

export function useConvidarColaborador() {
  return useMutation({
    mutationFn: async (lideradoId: string): Promise<"sent" | "already_registered"> => {
      const { data, error } = await supabase.functions.invoke("convidar-colaborador", {
        body: { liderado_id: lideradoId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.status === "convidado") return "sent";
      if (data?.status === "ja_cadastrado") return "already_registered";
      if (data?.status !== "sent" && data?.status !== "already_registered") {
        throw new Error("Resposta inesperada ao enviar o convite.");
      }
      return data.status;
    },
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
      qc.invalidateQueries({ queryKey: ["colaboradores-responsaveis"] });
      qc.invalidateQueries({ queryKey: ["entregas"] });
    },
  });
}

export function useEntregas() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    // Nome único por instância: vários componentes usam este hook ao mesmo tempo,
    // e reutilizar o mesmo nome devolve um canal já inscrito (erro do realtime).
    const channel = supabase
      .channel(`entregas:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "entregas" },
        () => {
          void qc.invalidateQueries({ queryKey: ["entregas"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, user?.id]);

  return useQuery({
    queryKey: ["entregas", user?.id],
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
    mutationFn: async (input: { titulo: string; descricao?: string; liderado_cadastro_id: string; prazo: string; prazo_hora?: string | null; periodicidade: Periodicidade }) => {
      const { error } = await supabase.from("entregas").insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entregas"] });
      qc.invalidateQueries({ queryKey: ["notifications", "deliveries"] });
    },
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
      qc.invalidateQueries({ queryKey: ["notifications", "deliveries"] });
    },
  });
}

/** Registra a realização e, se for recorrente, agenda a próxima ocorrência. */
export function useRegistrarRealizacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entrega, data, observacao }: { entrega: Entrega; data: string; observacao?: string }) => {
      const { error } = await supabase.rpc("registrar_realizacao_entrega", {
        p_entrega_id: entrega.id,
        p_data: data,
        p_observacao: observacao || null,
      });
      if (error) throw error;
      const prox = proximoPrazo(entrega.prazo, entrega.periodicidade);
      if (prox) {
        const { error: e2 } = await supabase.from("entregas").insert({
          titulo: entrega.titulo, descricao: entrega.descricao, liderado_cadastro_id: entrega.liderado_cadastro_id,
          prazo: prox, prazo_hora: entrega.prazo_hora, periodicidade: entrega.periodicidade,
        });
        if (e2) throw e2;
      }
      return prox;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["entregas"] });
      qc.invalidateQueries({ queryKey: ["entrega_historico", v.entrega.id] });
      qc.invalidateQueries({ queryKey: ["notifications", "deliveries"] });
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

export function useExcluirUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("excluir-usuario", { body: { user_id: userId } });
      if (error || data?.error) throw new Error(data?.error ?? error?.message ?? "Erro ao excluir");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["team-members"] }); qc.invalidateQueries({ queryKey: ["lideres"] }); },
  });
}

export function useExcluirEntrega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("entregas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entregas"] });
      qc.invalidateQueries({ queryKey: ["notifications", "deliveries"] });
    },
  });
}
