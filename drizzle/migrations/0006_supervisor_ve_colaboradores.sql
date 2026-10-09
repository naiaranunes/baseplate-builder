CREATE POLICY "supervisor read liderados" ON public.liderados FOR SELECT TO authenticated
USING (public.is_active_member() AND public.has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "supervisor insert entregas" ON public.entregas FOR INSERT TO authenticated
WITH CHECK (public.is_active_member() AND public.has_role(auth.uid(), 'supervisor'::app_role)
  AND EXISTS (SELECT 1 FROM public.liderados l WHERE l.id = liderado_cadastro_id AND l.ativo));