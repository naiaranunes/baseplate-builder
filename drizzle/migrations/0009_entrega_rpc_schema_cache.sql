CREATE OR REPLACE FUNCTION public.registrar_realizacao_entrega(
  p_entrega_id uuid,
  p_data date,
  p_observacao text DEFAULT NULL
)
RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tarefa public.entregas%ROWTYPE;
  proximo_prazo date;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_member() THEN
    RAISE EXCEPTION 'Usuário não autorizado.';
  END IF;

  IF p_data IS NULL THEN
    RAISE EXCEPTION 'Informe a data em que a entrega foi realizada.';
  END IF;

  SELECT e.*
    INTO tarefa
    FROM public.entregas e
    LEFT JOIN public.liderados l ON l.id = e.liderado_cadastro_id
    WHERE e.id = p_entrega_id
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR (
          public.has_role(auth.uid(), 'supervisor'::public.app_role)
          AND (e.lider_id = auth.uid() OR l.gestor_id = auth.uid())
        )
        OR l.usuario_id = auth.uid()
      )
    FOR UPDATE OF e;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrega não encontrada ou sem permissão para alterá-la.';
  END IF;

  IF tarefa.status IN ('entregue', 'aprovada') THEN
    RAISE EXCEPTION 'Esta entrega já foi concluída.';
  END IF;

  UPDATE public.entregas
    SET status = 'entregue',
        data_realizacao = p_data,
        observacao_realizacao = NULLIF(trim(p_observacao), '')
    WHERE id = p_entrega_id;

  IF tarefa.periodicidade <> 'unica' THEN
    proximo_prazo := CASE tarefa.periodicidade
      WHEN 'diaria' THEN tarefa.prazo + 1
      WHEN 'semanal' THEN tarefa.prazo + 7
      WHEN 'quinzenal' THEN tarefa.prazo + 14
      WHEN 'mensal' THEN (tarefa.prazo + interval '1 month')::date
      WHEN 'trimestral' THEN (tarefa.prazo + interval '3 months')::date
      ELSE NULL
    END;

    IF proximo_prazo IS NOT NULL THEN
      INSERT INTO public.entregas (
        titulo, descricao, lider_id, liderado_cadastro_id, prazo, periodicidade, criado_por
      )
      VALUES (
        tarefa.titulo, tarefa.descricao, tarefa.lider_id, tarefa.liderado_cadastro_id,
        proximo_prazo, tarefa.periodicidade, tarefa.criado_por
      );
    END IF;
  END IF;

  RETURN proximo_prazo;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_realizacao_entrega(uuid, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_realizacao_entrega(uuid, date, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
