DROP POLICY IF EXISTS "involved read entregas" ON public.entregas;
DROP POLICY IF EXISTS "team members read assigned deliveries" ON public.entregas;

CREATE POLICY "users read their assigned deliveries"
  ON public.entregas FOR SELECT TO authenticated
  USING (
    public.is_active_member()
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1
        FROM public.liderados l
        WHERE l.id = entregas.liderado_cadastro_id
          AND l.usuario_id = auth.uid()
      )
    )
  );

NOTIFY pgrst, 'reload schema';
