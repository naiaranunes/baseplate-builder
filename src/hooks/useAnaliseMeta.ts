import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Lancamento, MetaWithResponsavel } from "@/lib/metas";

export type AnaliseIA = {
  diagnostico: string;
  acoes: { titulo: string; contexto: string }[];
  previsao_final: number;
  vai_bater: boolean;
};

export function useAnaliseMeta() {
  return useMutation({
    mutationFn: async ({
      meta,
      lancamentos,
    }: {
      meta: MetaWithResponsavel;
      lancamentos: Lancamento[];
    }): Promise<AnaliseIA> => {
      const { data, error } = await supabase.functions.invoke("analise-meta", {
        body: {
          meta_id: meta.id,
          meta_nome: meta.nome,
          area: meta.area,
          unidade: meta.unidade,
          periodicidade: meta.periodicidade,
          valor_atual: meta.valor_atual,
          valor_alvo: meta.valor_alvo,
          data_inicio: meta.data_inicio,
          data_fim: meta.data_fim,
          is_inverse: meta.is_inverse,
          historico: lancamentos.map((l) => ({
            data: l.data_lancamento,
            valor: l.valor,
          })),
        },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) {
        throw new Error((data as { error: string }).error);
      }
      return data as AnaliseIA;
    },
  });
}
