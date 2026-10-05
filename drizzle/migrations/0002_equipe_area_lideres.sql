ALTER TABLE public.liderados ADD COLUMN IF NOT EXISTS area text;
ALTER TABLE public.liderados ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE TRIGGER liderados_set_updated_at BEFORE UPDATE ON public.liderados FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX IF NOT EXISTS liderados_gestor_idx ON public.liderados(gestor_id);

CREATE OR REPLACE FUNCTION public.list_leaders()
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT DISTINCT p.id, p.full_name FROM public.profiles p
  JOIN public.user_roles r ON r.user_id = p.id AND r.role IN ('admin','supervisor')
  WHERE public.is_active_member() AND p.is_active AND p.is_approved
  ORDER BY p.full_name;
$$;
GRANT EXECUTE ON FUNCTION public.list_leaders() TO authenticated;