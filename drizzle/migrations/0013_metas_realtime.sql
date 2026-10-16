DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'metas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.metas;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'meta_lancamentos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meta_lancamentos;
  END IF;
END
$$;
