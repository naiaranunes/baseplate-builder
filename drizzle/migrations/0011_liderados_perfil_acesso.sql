ALTER TABLE public.liderados
  ADD COLUMN IF NOT EXISTS perfil_acesso public.app_role NOT NULL DEFAULT 'agent'::public.app_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.liderados'::regclass
      AND conname = 'liderados_perfil_acesso_check'
  ) THEN
    ALTER TABLE public.liderados
      ADD CONSTRAINT liderados_perfil_acesso_check
      CHECK (perfil_acesso IN ('agent'::public.app_role, 'supervisor'::public.app_role));
  END IF;
END;
$$;

DROP POLICY IF EXISTS "leaders create their own team" ON public.liderados;
CREATE POLICY "leaders create their own team"
  ON public.liderados FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_member()
    AND (
      (
        public.has_role(auth.uid(), 'supervisor'::public.app_role)
        AND gestor_id = auth.uid()
        AND perfil_acesso = 'agent'::public.app_role
      )
      OR (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        AND (
          gestor_id = auth.uid()
          OR public.has_role(gestor_id, 'supervisor'::public.app_role)
        )
      )
    )
  );

DROP POLICY IF EXISTS "leaders update their own team" ON public.liderados;
CREATE POLICY "leaders update their own team"
  ON public.liderados FOR UPDATE TO authenticated
  USING (
    gestor_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      AND (
        gestor_id = auth.uid()
        OR public.has_role(gestor_id, 'supervisor'::public.app_role)
      )
    )
    OR (
      public.has_role(auth.uid(), 'supervisor'::public.app_role)
      AND gestor_id = auth.uid()
      AND perfil_acesso = 'agent'::public.app_role
    )
  );

GRANT INSERT (gestor_id, nome, cargo, email, ativo, area, perfil_acesso)
  ON public.liderados TO authenticated;
GRANT UPDATE (gestor_id, nome, cargo, email, ativo, area, perfil_acesso)
  ON public.liderados TO authenticated;

NOTIFY pgrst, 'reload schema';
