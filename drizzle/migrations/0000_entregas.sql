CREATE TABLE public.entregas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  lider_id uuid NOT NULL,
  liderado_id uuid NOT NULL,
  prazo date NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  criado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entregas TO authenticated;
GRANT ALL ON public.entregas TO service_role;
ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read entregas" ON public.entregas FOR SELECT TO authenticated USING (public.is_active_member());
CREATE POLICY "members insert entregas" ON public.entregas FOR INSERT TO authenticated WITH CHECK (public.is_active_member());
CREATE POLICY "involved update entregas" ON public.entregas FOR UPDATE TO authenticated
  USING (public.is_active_member() AND (auth.uid() IN (lider_id, liderado_id, criado_por) OR public.has_role(auth.uid(),'admin')))
  WITH CHECK (public.is_active_member());
CREATE POLICY "leader or admin delete entregas" ON public.entregas FOR DELETE TO authenticated
  USING (auth.uid() IN (lider_id, criado_por) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER entregas_set_updated_at BEFORE UPDATE ON public.entregas FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.entrega_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id uuid NOT NULL REFERENCES public.entregas(id) ON DELETE CASCADE,
  autor_id uuid DEFAULT auth.uid(),
  status_anterior text,
  status_novo text,
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.entrega_historico TO authenticated;
GRANT ALL ON public.entrega_historico TO service_role;
ALTER TABLE public.entrega_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read historico" ON public.entrega_historico FOR SELECT TO authenticated USING (public.is_active_member());
CREATE POLICY "members insert historico" ON public.entrega_historico FOR INSERT TO authenticated WITH CHECK (public.is_active_member() AND autor_id = auth.uid());

CREATE OR REPLACE FUNCTION public.tg_entrega_historico()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.entrega_historico (entrega_id, autor_id, status_novo, comentario)
    VALUES (NEW.id, auth.uid(), NEW.status, 'Entrega criada');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.entrega_historico (entrega_id, autor_id, status_anterior, status_novo)
    VALUES (NEW.id, auth.uid(), OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER entregas_historico AFTER INSERT OR UPDATE ON public.entregas FOR EACH ROW EXECUTE FUNCTION public.tg_entrega_historico();

CREATE OR REPLACE FUNCTION public.list_members()
RETURNS TABLE (id uuid, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name FROM public.profiles p
  WHERE public.is_active_member() AND p.is_active AND p.is_approved
  ORDER BY p.full_name;
$$;
GRANT EXECUTE ON FUNCTION public.list_members() TO authenticated;