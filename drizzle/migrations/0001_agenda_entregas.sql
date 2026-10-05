CREATE TABLE public.liderados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gestor_id uuid NOT NULL DEFAULT auth.uid(),
  nome text NOT NULL,
  cargo text,
  email text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.liderados TO authenticated;
GRANT ALL ON public.liderados TO service_role;
ALTER TABLE public.liderados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gestor read liderados" ON public.liderados FOR SELECT TO authenticated USING (gestor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "gestor insert liderados" ON public.liderados FOR INSERT TO authenticated WITH CHECK (public.is_active_member() AND gestor_id = auth.uid());
CREATE POLICY "gestor update liderados" ON public.liderados FOR UPDATE TO authenticated USING (gestor_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (gestor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "gestor delete liderados" ON public.liderados FOR DELETE TO authenticated USING (gestor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

ALTER TABLE public.entregas ALTER COLUMN liderado_id DROP NOT NULL;
ALTER TABLE public.entregas ALTER COLUMN lider_id SET DEFAULT auth.uid();
ALTER TABLE public.entregas ADD COLUMN liderado_cadastro_id uuid REFERENCES public.liderados(id) ON DELETE CASCADE;
ALTER TABLE public.entregas ADD COLUMN periodicidade text NOT NULL DEFAULT 'unica';
ALTER TABLE public.entregas ADD COLUMN data_realizacao date;
ALTER TABLE public.entregas ADD COLUMN observacao_realizacao text;
COMMENT ON COLUMN public.entregas.liderado_id IS 'DEPRECATED: replaced by liderado_cadastro_id';