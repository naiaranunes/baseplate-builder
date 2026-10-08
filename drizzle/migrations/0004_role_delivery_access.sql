ALTER TABLE public.liderados
  ADD COLUMN IF NOT EXISTS usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.liderados ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE UNIQUE INDEX IF NOT EXISTS liderados_usuario_id_unique
  ON public.liderados(usuario_id)
  WHERE usuario_id IS NOT NULL;

DROP POLICY IF EXISTS "gestor read liderados" ON public.liderados;
DROP POLICY IF EXISTS "gestor insert liderados" ON public.liderados;
DROP POLICY IF EXISTS "gestor update liderados" ON public.liderados;
DROP POLICY IF EXISTS "gestor delete liderados" ON public.liderados;

CREATE POLICY "team members read assigned profiles"
  ON public.liderados FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      public.has_role(auth.uid(), 'supervisor'::public.app_role)
      AND gestor_id = auth.uid()
    )
    OR usuario_id = auth.uid()
  );

CREATE POLICY "leaders create their own team"
  ON public.liderados FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_member()
    AND (
      (
        public.has_role(auth.uid(), 'supervisor'::public.app_role)
        AND gestor_id = auth.uid()
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

CREATE POLICY "leaders update their own team"
  ON public.liderados FOR UPDATE TO authenticated
  USING (
    gestor_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    gestor_id = auth.uid()
    OR (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      AND (
        gestor_id = auth.uid()
        OR public.has_role(gestor_id, 'supervisor'::public.app_role)
      )
    )
  );

CREATE POLICY "leaders delete their own team"
  ON public.liderados FOR DELETE TO authenticated
  USING (
    gestor_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

REVOKE INSERT ON public.liderados FROM authenticated;
GRANT INSERT (gestor_id, nome, cargo, email, ativo, area)
  ON public.liderados TO authenticated;
REVOKE UPDATE ON public.liderados FROM authenticated;
GRANT UPDATE (gestor_id, nome, cargo, email, ativo, area)
  ON public.liderados TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_my_liderado()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_email text;
  email_confirmed_at timestamptz;
  matching_count integer;
  matching_id uuid;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_role(auth.uid(), 'agent'::public.app_role) THEN
    RETURN false;
  END IF;

  SELECT lower(u.email), u.email_confirmed_at
    INTO caller_email, email_confirmed_at
    FROM auth.users u
    WHERE u.id = auth.uid();

  IF caller_email IS NULL OR email_confirmed_at IS NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.liderados l
    WHERE l.usuario_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;

  SELECT count(*)
    INTO matching_count
    FROM public.liderados l
    WHERE lower(l.email) = caller_email
      AND l.ativo;

  IF matching_count > 1 THEN
    RAISE EXCEPTION 'Mais de um colaborador está cadastrado com este e-mail.';
  END IF;

  IF matching_count = 0 THEN
    RETURN false;
  END IF;

  SELECT l.id
    INTO matching_id
    FROM public.liderados l
    WHERE lower(l.email) = caller_email
      AND l.ativo
      AND l.usuario_id IS NULL
    LIMIT 1;

  UPDATE public.liderados
    SET usuario_id = auth.uid()
    WHERE id = matching_id
      AND usuario_id IS NULL;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_my_liderado() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_my_liderado() TO authenticated;

CREATE OR REPLACE FUNCTION public.link_liderado_account_by_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.usuario_id IS NULL AND NEW.ativo AND NEW.email IS NOT NULL THEN
    SELECT u.id
      INTO NEW.usuario_id
      FROM auth.users u
      JOIN public.user_roles r
        ON r.user_id = u.id
       AND r.role = 'agent'::public.app_role
      WHERE lower(u.email) = lower(NEW.email)
        AND u.email_confirmed_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM public.liderados existing
          WHERE existing.usuario_id = u.id
            AND (TG_OP <> 'UPDATE' OR existing.id <> NEW.id)
        )
      LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER liderados_link_account_by_email
  BEFORE INSERT OR UPDATE OF email, ativo ON public.liderados
  FOR EACH ROW
  EXECUTE FUNCTION public.link_liderado_account_by_email();

CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  p_user_id uuid,
  p_role public.app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_is_admin boolean;
  admin_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(194823);

  IF auth.uid() IS NULL
    OR NOT public.is_active_member()
    OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas administradores ativos podem alterar perfis.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
      AND role = 'admin'::public.app_role
  )
  INTO target_is_admin;

  IF target_is_admin AND p_role <> 'admin'::public.app_role THEN
    SELECT count(*)
      INTO admin_count
      FROM public.user_roles
      WHERE role = 'admin'::public.app_role;

    IF admin_count <= 1 THEN
      RAISE EXCEPTION 'O último administrador não pode perder esse perfil.';
    END IF;
  END IF;

  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, p_role);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_status(
  p_user_id uuid,
  p_is_active boolean,
  p_is_approved boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_is_admin boolean;
  active_admin_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(194823);

  IF auth.uid() IS NULL
    OR NOT public.is_active_member()
    OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas administradores ativos podem alterar o status de usuários.';
  END IF;

  IF p_user_id = auth.uid() AND NOT p_is_active THEN
    RAISE EXCEPTION 'Você não pode desativar sua própria conta.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
      AND role = 'admin'::public.app_role
  )
  INTO target_is_admin;

  IF target_is_admin AND NOT p_is_active THEN
    SELECT count(*)
      INTO active_admin_count
      FROM public.user_roles r
      JOIN public.profiles p ON p.id = r.user_id
      WHERE r.role = 'admin'::public.app_role
        AND p.is_active
        AND p.is_approved;

    IF active_admin_count <= 1 THEN
      RAISE EXCEPTION 'O último administrador ativo não pode ser desativado.';
    END IF;
  END IF;

  UPDATE public.profiles
    SET is_active = p_is_active,
        is_approved = p_is_approved
    WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_status(uuid, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_status(uuid, boolean, boolean) TO authenticated;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;

CREATE POLICY "members read own roles and admins read all"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "admins assign user roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_member()
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "admins update user roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (
    public.is_active_member()
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    public.is_active_member()
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "admins delete user roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    public.is_active_member()
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "restrict user role insert to admins"
  ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_member()
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "restrict user role reads to owner or admin"
  ON public.user_roles AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "restrict user role update to admins"
  ON public.user_roles AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (
    public.is_active_member()
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    public.is_active_member()
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "restrict user role delete to admins"
  ON public.user_roles AS RESTRICTIVE FOR DELETE TO authenticated
  USING (
    public.is_active_member()
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE UPDATE (is_active, is_approved) ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone, company, status, updated_at)
  ON public.profiles TO authenticated;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restrict profile reads by team role"
  ON public.profiles AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      public.has_role(auth.uid(), 'supervisor'::public.app_role)
      AND EXISTS (
        SELECT 1 FROM public.liderados l
        WHERE l.gestor_id = auth.uid()
          AND l.usuario_id = profiles.id
      )
    )
    OR (
      public.has_role(auth.uid(), 'agent'::public.app_role)
      AND EXISTS (
        SELECT 1 FROM public.liderados l
        WHERE l.usuario_id = auth.uid()
          AND l.gestor_id = profiles.id
      )
    )
  );

CREATE POLICY "restrict profile updates to self"
  ON public.profiles AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entrega_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read entregas" ON public.entregas;
DROP POLICY IF EXISTS "members insert entregas" ON public.entregas;
DROP POLICY IF EXISTS "involved update entregas" ON public.entregas;
DROP POLICY IF EXISTS "leader or admin delete entregas" ON public.entregas;

CREATE POLICY "team members read assigned deliveries"
  ON public.entregas FOR SELECT TO authenticated
  USING (
    public.is_active_member()
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR (
        public.has_role(auth.uid(), 'supervisor'::public.app_role)
        AND (
          lider_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.liderados l
            WHERE l.id = entregas.liderado_cadastro_id
              AND l.gestor_id = auth.uid()
          )
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.liderados l
        WHERE l.id = entregas.liderado_cadastro_id
          AND l.usuario_id = auth.uid()
      )
    )
  );

CREATE POLICY "leaders assign deliveries to their team"
  ON public.entregas FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_member()
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR (
        public.has_role(auth.uid(), 'supervisor'::public.app_role)
        AND lider_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.liderados l
          WHERE l.id = entregas.liderado_cadastro_id
            AND l.gestor_id = auth.uid()
            AND l.ativo
        )
      )
    )
  );

CREATE POLICY "involved members update deliveries"
  ON public.entregas FOR UPDATE TO authenticated
  USING (
    public.is_active_member()
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR (
        public.has_role(auth.uid(), 'supervisor'::public.app_role)
        AND (
          lider_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.liderados l
            WHERE l.id = entregas.liderado_cadastro_id
              AND l.gestor_id = auth.uid()
          )
        )
      )
    )
  )
  WITH CHECK (
    public.is_active_member()
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR (
        public.has_role(auth.uid(), 'supervisor'::public.app_role)
        AND (
          lider_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.liderados l
            WHERE l.id = entregas.liderado_cadastro_id
              AND l.gestor_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "leaders delete their deliveries"
  ON public.entregas FOR DELETE TO authenticated
  USING (
    public.is_active_member()
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR (
        public.has_role(auth.uid(), 'supervisor'::public.app_role)
        AND (
          lider_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.liderados l
            WHERE l.id = entregas.liderado_cadastro_id
              AND l.gestor_id = auth.uid()
          )
        )
      )
    )
  );

REVOKE UPDATE ON public.entregas FROM authenticated;
GRANT UPDATE (status, data_realizacao, observacao_realizacao)
  ON public.entregas TO authenticated;

DROP POLICY IF EXISTS "members read historico" ON public.entrega_historico;
DROP POLICY IF EXISTS "members insert historico" ON public.entrega_historico;

REVOKE INSERT ON public.entrega_historico FROM authenticated;
GRANT INSERT (entrega_id, autor_id, comentario)
  ON public.entrega_historico TO authenticated;

CREATE POLICY "involved members read delivery history"
  ON public.entrega_historico FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.entregas e
      WHERE e.id = entrega_historico.entrega_id
    )
  );

CREATE POLICY "involved members comment on delivery history"
  ON public.entrega_historico FOR INSERT TO authenticated
  WITH CHECK (
    autor_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.entregas e
      WHERE e.id = entrega_historico.entrega_id
    )
  );

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

CREATE OR REPLACE FUNCTION public.list_members()
RETURNS TABLE (id uuid, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT p.id, p.full_name
  FROM public.profiles p
  WHERE public.is_active_member()
    AND p.is_active
    AND p.is_approved
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR p.id = auth.uid()
      OR (
        public.has_role(auth.uid(), 'supervisor'::public.app_role)
        AND EXISTS (
          SELECT 1 FROM public.liderados l
          WHERE l.gestor_id = auth.uid()
            AND l.usuario_id = p.id
        )
      )
      OR (
        public.has_role(auth.uid(), 'agent'::public.app_role)
        AND EXISTS (
          SELECT 1 FROM public.liderados l
          WHERE l.usuario_id = auth.uid()
            AND l.gestor_id = p.id
        )
      )
    )
  ORDER BY p.full_name;
$$;

CREATE OR REPLACE FUNCTION public.list_leaders()
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT DISTINCT p.id, p.full_name
  FROM public.profiles p
  JOIN public.user_roles r ON r.user_id = p.id
    AND r.role IN ('admin'::public.app_role, 'supervisor'::public.app_role)
  WHERE public.is_active_member()
    AND p.is_active
    AND p.is_approved
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR p.id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.liderados l
        WHERE l.usuario_id = auth.uid()
          AND l.gestor_id = p.id
      )
    )
  ORDER BY p.full_name;
$$;
