-- ============================================================
-- RLS: Deny-all policies pro anon + authenticated role
-- ============================================================
-- Účel: Defense-in-depth druhá vrstva.
-- API používá service_role (BYPASSRLS) — těchto policies se netýká.
-- Policies blokují přímý přístup přes Supabase dashboard,
-- analytics nástroje nebo Supabase client s anon klíčem.
--
-- Spouštěj RUČNĚ v Supabase SQL Editoru.
-- ============================================================

DO $$
DECLARE
  tbl text;
  tables text[];
BEGIN
  -- Dynamicky načti všechny uživatelské tabulky ve schématu public
  -- (vynecháme systémové tabulky _prisma_migrations a pg_/sql_ prefix)
  SELECT array_agg(tablename::text ORDER BY tablename)
  INTO tables
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg\_%'
    AND tablename NOT LIKE 'sql\_%'
    AND tablename != '_prisma_migrations';

  FOREACH tbl IN ARRAY tables
  LOOP
    -- Ensure RLS is enabled (idempotentní)
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      tbl
    );

    -- Odstraň existující deny policies (idempotentní)
    EXECUTE format(
      'DROP POLICY IF EXISTS rls_deny_anon ON public.%I', tbl
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS rls_deny_authenticated ON public.%I', tbl
    );

    -- Deny ALL pro anon role (Supabase public/anon key)
    -- FOR ALL + WITH CHECK (false) blokuje i zápisy
    EXECUTE format(
      'CREATE POLICY rls_deny_anon ON public.%I
       AS RESTRICTIVE
       FOR ALL
       TO anon
       USING (false)
       WITH CHECK (false)',
      tbl
    );

    -- Deny ALL pro authenticated role (Supabase user JWT)
    EXECUTE format(
      'CREATE POLICY rls_deny_authenticated ON public.%I
       AS RESTRICTIVE
       FOR ALL
       TO authenticated
       USING (false)
       WITH CHECK (false)',
      tbl
    );

    RAISE NOTICE 'deny_all policies added: %', tbl;
  END LOOP;
END $$;

-- ============================================================
-- Ověření po spuštění:
-- ============================================================
-- SELECT tablename, policyname, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND policyname IN ('rls_deny_anon', 'rls_deny_authenticated')
-- ORDER BY tablename;
