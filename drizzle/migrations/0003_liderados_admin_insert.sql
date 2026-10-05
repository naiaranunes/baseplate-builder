DROP POLICY IF EXISTS "gestor insert liderados" ON public.liderados;
CREATE POLICY "gestor insert liderados" ON public.liderados FOR INSERT TO authenticated
WITH CHECK (public.is_active_member() AND (gestor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)));