ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS prazo_hora time;

CREATE OR REPLACE FUNCTION public.gerencia_liderado(_lid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.liderados l WHERE l.id = _lid AND (l.gestor_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
$$;
CREATE OR REPLACE FUNCTION public.e_meu_cadastro(_lid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.liderados l WHERE l.id = _lid AND l.email IS NOT NULL
    AND lower(l.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
$$;
CREATE OR REPLACE FUNCTION public.pode_ver_entrega(_lider uuid, _criador uuid, _lid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR auth.uid() = _lider OR auth.uid() = _criador
    OR public.gerencia_liderado(_lid) OR public.e_meu_cadastro(_lid)
$$;
GRANT EXECUTE ON FUNCTION public.gerencia_liderado(uuid), public.e_meu_cadastro(uuid), public.pode_ver_entrega(uuid, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.tg_entrega_lider() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.liderado_cadastro_id IS NOT NULL THEN
    SELECT gestor_id INTO NEW.lider_id FROM public.liderados WHERE id = NEW.liderado_cadastro_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS entregas_set_lider ON public.entregas;
CREATE TRIGGER entregas_set_lider BEFORE INSERT ON public.entregas FOR EACH ROW EXECUTE FUNCTION public.tg_entrega_lider();

DROP POLICY IF EXISTS "members read entregas" ON public.entregas;
DROP POLICY IF EXISTS "members insert entregas" ON public.entregas;
DROP POLICY IF EXISTS "involved update entregas" ON public.entregas;
DROP POLICY IF EXISTS "leader or admin delete entregas" ON public.entregas;
CREATE POLICY "involved read entregas" ON public.entregas FOR SELECT TO authenticated
  USING (public.is_active_member() AND public.pode_ver_entrega(lider_id, criado_por, liderado_cadastro_id));
CREATE POLICY "leader or self insert entregas" ON public.entregas FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member() AND (public.gerencia_liderado(liderado_cadastro_id) OR public.e_meu_cadastro(liderado_cadastro_id)));
CREATE POLICY "involved update entregas" ON public.entregas FOR UPDATE TO authenticated
  USING (public.is_active_member() AND public.pode_ver_entrega(lider_id, criado_por, liderado_cadastro_id))
  WITH CHECK (public.is_active_member());
CREATE POLICY "involved delete entregas" ON public.entregas FOR DELETE TO authenticated
  USING (public.is_active_member() AND public.pode_ver_entrega(lider_id, criado_por, liderado_cadastro_id));

DROP POLICY IF EXISTS "members read historico" ON public.entrega_historico;
CREATE POLICY "involved read historico" ON public.entrega_historico FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.entregas e WHERE e.id = entrega_id));