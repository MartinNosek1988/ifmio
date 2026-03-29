-- ============================================================
-- RLS: Deny-all policies pro anon + authenticated role
-- ============================================================
-- Účel: Defense-in-depth druhá vrstva.
-- API používá service_role (BYPASSRLS) — těchto policies se netýká.
-- Policies blokují přímý přístup přes Supabase dashboard,
-- analytics nástroje nebo Supabase client s anon klíčem.
--
-- Audit stav (2026-03-29):
--   RLS enabled na všech tabulkách (77+)
--   Tier 1-3 policies existují z migrace 20260530000000
--   Chybí: deny_all pro anon + authenticated role
--
-- Spustit ručně v Supabase SQL Editoru (ne přes prisma migrate).
-- ============================================================

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'accounting_presets',
    'activities', 'activity_types',
    'ai_extraction_batch_items', 'ai_extraction_batches', 'ai_extraction_logs',
    'api_keys',
    'assemblies', 'assembly_agenda_items', 'assembly_attendees', 'assembly_votes',
    'asset_field_check_executions', 'asset_field_check_signals',
    'asset_qr_codes', 'asset_qr_scan_events', 'asset_service_records',
    'asset_type_revision_types', 'asset_types', 'assets',
    'attendee_keypad_assignments',
    'audit_logs',
    'bank_accounts', 'bank_transactions', 'billing_periods',
    'calendar_events',
    'chat_attachments', 'chat_mentions', 'chat_messages',
    'component_assignments',
    'document_links', 'document_tags', 'documents',
    'email_verification_tokens',
    'evidence_folder_allocations', 'evidence_folders',
    'finance_transactions', 'financial_contexts',
    'floor_plan_zones', 'floor_plans',
    'hardware_voting_sessions',
    'helpdesk_items', 'helpdesk_protocols', 'helpdesk_tickets',
    'import_logs', 'initial_balances',
    'invoice_comments', 'invoice_cost_allocations', 'invoice_training_samples', 'invoices',
    'kanban_tasks', 'konto_reminders',
    'lease_agreements', 'ledger_entries',
    'login_risk_logs',
    'management_contract_units', 'management_contracts',
    'meter_readings', 'meters',
    'mio_conversations', 'mio_messages',
    'mio_digest_logs', 'mio_findings', 'mio_job_run_logs',
    'mio_webhook_delivery_logs', 'mio_webhook_outbox', 'mio_webhook_subscriptions',
    'notifications',
    'occupancies', 'outbox_logs', 'owner_accounts',
    'parties',
    'payment_order_items', 'payment_orders',
    'per_rollam_ballots', 'per_rollam_items', 'per_rollam_responses', 'per_rollam_votings',
    'portal_access', 'portal_messages',
    'prescription_components', 'prescription_items', 'prescriptions',
    'principal_owners', 'principals',
    'properties', 'property_ownerships',
    'protocol_lines', 'protocols',
    'recurring_activity_plans', 'refresh_tokens',
    'reminder_templates', 'reminders', 'residents',
    'revision_events', 'revision_plans', 'revision_subjects', 'revision_types',
    'revoked_tokens',
    'scheduled_report_subscriptions',
    'settlement_costs', 'settlement_items', 'settlements',
    'sipo_configs', 'sipo_exports', 'sipo_payments',
    'sla_policies',
    'supplier_extraction_patterns',
    'tenancies', 'tenant_invitations', 'tenant_settings', 'tenants',
    'unit_equipment', 'unit_group_memberships', 'unit_groups',
    'unit_management_fees', 'unit_ownerships', 'unit_quantities', 'unit_rooms', 'units',
    'user_features', 'user_property_assignments', 'users',
    'work_order_comments', 'work_orders'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    -- Odstraň existující deny policies (idempotentní)
    EXECUTE format(
      'DROP POLICY IF EXISTS rls_deny_anon ON public.%I', tbl
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS rls_deny_authenticated ON public.%I', tbl
    );

    -- Deny ALL pro anon role (Supabase public key)
    EXECUTE format(
      'CREATE POLICY rls_deny_anon ON public.%I
       AS RESTRICTIVE TO anon
       USING (false)',
      tbl
    );

    -- Deny ALL pro authenticated role (Supabase user JWT)
    EXECUTE format(
      'CREATE POLICY rls_deny_authenticated ON public.%I
       AS RESTRICTIVE TO authenticated
       USING (false)',
      tbl
    );

    RAISE NOTICE 'deny_all policies added: %', tbl;
  END LOOP;
END $$;

-- ============================================================
-- Ověření: Výsledek má obsahovat 2 policies na každou tabulku
-- ============================================================
-- SELECT tablename, policyname, roles
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND policyname IN ('rls_deny_anon', 'rls_deny_authenticated')
-- ORDER BY tablename;
