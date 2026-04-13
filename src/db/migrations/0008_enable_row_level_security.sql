-- Row Level Security + funções SECURITY DEFINER para caminhos sem GUC (Stripe webhook, crons, auditoria).
-- RLS por tabela só se a relação existir (bases antigas sem 0003, etc.); volte a correr após criar tabelas em falta.
-- Requer que o app defina app.current_user_id nas rotas autenticadas (runWithAppUserId).
-- Idempotente: pode reexecutar após falhas parciais.

CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid;
$$;

-- ---------------------------------------------------------------------------
-- Funções privilegiadas (SECURITY DEFINER) — chamadas só pelo backend (pool global).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION copilote_fn_ride_owner_id(p_ride_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT user_id FROM rides WHERE id = p_ride_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION copilote_fn_expense_owner_id(p_expense_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT user_id FROM expenses WHERE id = p_expense_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION copilote_fn_maintenance_item_owner_id(p_item_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT user_id FROM maintenance_items WHERE id = p_item_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION copilote_fn_subscription_by_stripe_subscription_id(p_stripe text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  plan varchar,
  stripe_customer_id varchar,
  stripe_subscription_id varchar,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    s.id,
    s.user_id,
    s.plan,
    s.stripe_customer_id,
    s.stripe_subscription_id,
    s.current_period_end,
    s.cancel_at_period_end,
    s.created_at
  FROM subscriptions s
  WHERE s.stripe_subscription_id = p_stripe
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION copilote_fn_cron_web_push_subscriptions()
RETURNS SETOF web_push_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF to_regclass('public.web_push_subscriptions') IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT * FROM web_push_subscriptions;
END;
$$;

CREATE OR REPLACE FUNCTION copilote_fn_cron_data_retention_candidates(
  p_cutoff timestamptz,
  p_email_exclude text,
  p_limit int
)
RETURNS TABLE (
  user_id uuid,
  email varchar,
  plan varchar,
  current_period_end timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    u.id AS user_id,
    u.email,
    s.plan,
    s.current_period_end
  FROM users u
  LEFT JOIN subscriptions s ON s.user_id = u.id
  WHERE u.created_at < p_cutoff
    AND u.updated_at < p_cutoff
    AND coalesce(u.email, '') NOT ILIKE p_email_exclude
  LIMIT p_limit;
$$;

-- ---------------------------------------------------------------------------
-- RLS nas tabelas tenant (não inclui users/sessions/accounts/verifications).
-- Só afecta tabelas que existem (evita falha se migração 0003+ nunca correu nesta base).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION copilote_internal_apply_tenant_rls(
  p_table text,
  p_policy text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF to_regclass('public.' || p_table) IS NULL THEN
    RAISE NOTICE 'copilote RLS: tabela % ignorada (ainda não existe)', p_table;
    RETURN;
  END IF;
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_policy, p_table);
  EXECUTE format(
    'CREATE POLICY %I ON %I FOR ALL USING (user_id = current_app_user_id()) WITH CHECK (user_id = current_app_user_id())',
    p_policy,
    p_table
  );
END;
$$;

SELECT copilote_internal_apply_tenant_rls('rides', 'rides_user_isolation');
SELECT copilote_internal_apply_tenant_rls('expenses', 'expenses_user_isolation');
SELECT copilote_internal_apply_tenant_rls('goals', 'goals_user_isolation');
SELECT copilote_internal_apply_tenant_rls('vehicles', 'vehicles_user_isolation');
SELECT copilote_internal_apply_tenant_rls('platforms_used', 'platforms_used_user_isolation');
SELECT copilote_internal_apply_tenant_rls('maintenance_items', 'maintenance_items_user_isolation');
SELECT copilote_internal_apply_tenant_rls('subscriptions', 'subscriptions_user_isolation');
SELECT copilote_internal_apply_tenant_rls('report_downloads', 'report_downloads_user_isolation');
SELECT copilote_internal_apply_tenant_rls('web_push_subscriptions', 'web_push_subscriptions_user_isolation');
SELECT copilote_internal_apply_tenant_rls('maintenance_push_log', 'maintenance_push_log_user_isolation');

DROP FUNCTION IF EXISTS copilote_internal_apply_tenant_rls(text, text);
