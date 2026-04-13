-- Tabela `report_downloads` (histórico de PDFs gerados).
-- Canónico no repo: `src/db/migrations/0003_report_downloads.sql`
-- Use este ficheiro quando a base existir sem esta tabela (ex.: migração 0003 não aplicada).
--
-- psql:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/postgres/report-downloads-table-manual.sql

CREATE TABLE IF NOT EXISTS "report_downloads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "month" integer NOT NULL,
  "year" integer NOT NULL,
  "generated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $fk$
BEGIN
  ALTER TABLE "report_downloads"
    ADD CONSTRAINT "report_downloads_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$fk$;

-- Se a migração 0008 (RLS) já correu, isola esta tabela como as outras tenant.
DO $rls$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'current_app_user_id'
      AND p.pronargs = 0
  ) THEN
    ALTER TABLE report_downloads ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS report_downloads_user_isolation ON report_downloads';
    EXECUTE $pol$
      CREATE POLICY report_downloads_user_isolation ON report_downloads
        FOR ALL
        USING (user_id = current_app_user_id())
        WITH CHECK (user_id = current_app_user_id())
    $pol$;
  END IF;
END
$rls$;
