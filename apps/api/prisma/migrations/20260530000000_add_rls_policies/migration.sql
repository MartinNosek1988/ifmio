-- ============================================================================
-- Migration: Add RLS policies for tenant isolation
-- ============================================================================
--
-- CONTEXT:
--   RLS was enabled on 33 tables in migration 20260525700000 but with ZERO
--   policies defined. The API connects via service_role (BYPASSRLS), so these
--   policies are defense-in-depth for any non-service connections:
--   - Analytics / read replicas using anon or authenticated roles
--   - Supabase Dashboard SQL editor when not using service_role
--   - Future migration to non-bypass connection pooler
--
-- MECHANISM:
--   Policies check: "tenant_id" = current_setting('app.current_tenant_id', true)
--   The second arg (true) means return NULL instead of error if not set.
--   When the setting is NULL, the policy evaluates to FALSE → deny all.
--   This is safe: no setting = no access (deny-by-default).
--
-- ROLLBACK:
--   Each policy has a unique name. To roll back:
--   DROP POLICY IF EXISTS "tenant_isolation_<table>" ON public.<table>;
--
-- NOTE: Tables already have RLS ENABLED from migration 20260525700000.
--   Tables NOT in that migration get ALTER TABLE ... ENABLE ROW LEVEL SECURITY here.
-- ============================================================================

-- ─── TIER 1: Core tables with direct tenant_id ────────────────────────────
-- These are the highest-value targets for cross-tenant isolation.

-- Enable RLS on tables that weren't covered by the original migration
DO $$ BEGIN
  EXECUTE 'ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.helpdesk_tickets ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.meters ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.lease_agreements ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.owner_accounts ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.billing_periods ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.tenancies ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.unit_ownerships ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.principals ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.management_contracts ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Some tables may already have RLS enabled: %', SQLERRM;
END $$;

-- ── Properties ──────────────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_properties" ON public.properties
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Users ───────────────────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_users" ON public.users
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Invoices ────────────────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_invoices" ON public.invoices
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Documents ───────────────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_documents" ON public.documents
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Helpdesk Tickets ────────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_helpdesk_tickets" ON public.helpdesk_tickets
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Work Orders ─────────────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_work_orders" ON public.work_orders
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Bank Accounts ───────────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_bank_accounts" ON public.bank_accounts
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Bank Transactions ───────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_bank_transactions" ON public.bank_transactions
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Parties (residents, owners, contacts) ───────────────────────────────────
CREATE POLICY "tenant_isolation_parties" ON public.parties
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Finance Transactions ────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_finance_transactions" ON public.finance_transactions
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Prescriptions ───────────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_prescriptions" ON public.prescriptions
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Meters ──────────────────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_meters" ON public.meters
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Assets ──────────────────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_assets" ON public.assets
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Audit Logs ──────────────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_audit_logs" ON public.audit_logs
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Notifications ───────────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_notifications" ON public.notifications
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Lease Agreements ────────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_lease_agreements" ON public.lease_agreements
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Protocols ───────────────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_protocols" ON public.protocols
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Calendar Events ─────────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_calendar_events" ON public.calendar_events
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Owner Accounts ──────────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_owner_accounts" ON public.owner_accounts
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Billing Periods ─────────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_billing_periods" ON public.billing_periods
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Residents ───────────────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_residents" ON public.residents
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Tenancies ───────────────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_tenancies" ON public.tenancies
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Unit Ownerships ─────────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_unit_ownerships" ON public.unit_ownerships
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Principals ──────────────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_principals" ON public.principals
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ── Management Contracts ────────────────────────────────────────────────────
CREATE POLICY "tenant_isolation_management_contracts" ON public.management_contracts
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ─── TIER 2: Tables from original migration (already have RLS enabled) ────
-- Add policies to the 33 tables that had RLS enabled but no policies.

CREATE POLICY "tenant_isolation_mio_conversations" ON public.mio_conversations
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "tenant_isolation_api_keys" ON public.api_keys
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "tenant_isolation_portal_access" ON public.portal_access
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "tenant_isolation_portal_messages" ON public.portal_messages
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "tenant_isolation_assemblies" ON public.assemblies
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "tenant_isolation_per_rollam_votings" ON public.per_rollam_votings
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "tenant_isolation_sipo_configs" ON public.sipo_configs
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "tenant_isolation_sipo_exports" ON public.sipo_exports
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "tenant_isolation_floor_plans" ON public.floor_plans
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "tenant_isolation_kanban_tasks" ON public.kanban_tasks
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "tenant_isolation_initial_balances" ON public.initial_balances
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "tenant_isolation_accounting_presets" ON public.accounting_presets
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "tenant_isolation_login_risk_logs" ON public.login_risk_logs
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY "tenant_isolation_hardware_voting_sessions" ON public.hardware_voting_sessions
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- ─── TIER 2b: Tables from original migration WITHOUT direct tenantId ──────
-- These inherit via FK. Policies use subquery to parent's tenantId.

-- Units → Property.tenantId
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_units" ON public.units
  FOR ALL
  USING (
    "propertyId" IN (
      SELECT id FROM public.properties
      WHERE "tenantId" = current_setting('app.current_tenant_id', true)::text
    )
  )
  WITH CHECK (
    "propertyId" IN (
      SELECT id FROM public.properties
      WHERE "tenantId" = current_setting('app.current_tenant_id', true)::text
    )
  );

-- Mio Messages → MioConversation.tenantId
CREATE POLICY "tenant_isolation_mio_messages" ON public.mio_messages
  FOR ALL
  USING (
    "conversationId" IN (
      SELECT id FROM public.mio_conversations
      WHERE "tenantId" = current_setting('app.current_tenant_id', true)::text
    )
  )
  WITH CHECK (
    "conversationId" IN (
      SELECT id FROM public.mio_conversations
      WHERE "tenantId" = current_setting('app.current_tenant_id', true)::text
    )
  );

-- Unit Rooms → Unit → Property.tenantId
CREATE POLICY "tenant_isolation_unit_rooms" ON public.unit_rooms
  FOR ALL
  USING (
    "unitId" IN (
      SELECT u.id FROM public.units u
      JOIN public.properties p ON u."propertyId" = p.id
      WHERE p."tenantId" = current_setting('app.current_tenant_id', true)::text
    )
  );

-- Unit Quantities → same chain
CREATE POLICY "tenant_isolation_unit_quantities" ON public.unit_quantities
  FOR ALL
  USING (
    "unitId" IN (
      SELECT u.id FROM public.units u
      JOIN public.properties p ON u."propertyId" = p.id
      WHERE p."tenantId" = current_setting('app.current_tenant_id', true)::text
    )
  );

-- Unit Equipment → same chain
CREATE POLICY "tenant_isolation_unit_equipment" ON public.unit_equipment
  FOR ALL
  USING (
    "unitId" IN (
      SELECT u.id FROM public.units u
      JOIN public.properties p ON u."propertyId" = p.id
      WHERE p."tenantId" = current_setting('app.current_tenant_id', true)::text
    )
  );

-- Unit Management Fees → same chain
CREATE POLICY "tenant_isolation_unit_management_fees" ON public.unit_management_fees
  FOR ALL
  USING (
    "unitId" IN (
      SELECT u.id FROM public.units u
      JOIN public.properties p ON u."propertyId" = p.id
      WHERE p."tenantId" = current_setting('app.current_tenant_id', true)::text
    )
  );

-- Unit Groups (has direct tenantId)
CREATE POLICY "tenant_isolation_unit_groups" ON public.unit_groups
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- Unit Group Memberships → UnitGroup.tenantId
CREATE POLICY "tenant_isolation_unit_group_memberships" ON public.unit_group_memberships
  FOR ALL
  USING (
    "unitGroupId" IN (
      SELECT id FROM public.unit_groups
      WHERE "tenantId" = current_setting('app.current_tenant_id', true)::text
    )
  );

-- User Features → User.tenantId
CREATE POLICY "tenant_isolation_user_features" ON public.user_features
  FOR ALL
  USING (
    "userId" IN (
      SELECT id FROM public.users
      WHERE "tenantId" = current_setting('app.current_tenant_id', true)::text
    )
  );

-- Invoice Cost Allocations → Invoice.tenantId
CREATE POLICY "tenant_isolation_invoice_cost_allocations" ON public.invoice_cost_allocations
  FOR ALL
  USING (
    "invoiceId" IN (
      SELECT id FROM public.invoices
      WHERE "tenantId" = current_setting('app.current_tenant_id', true)::text
    )
  );

-- Sipo Payments (has direct tenantId)
CREATE POLICY "tenant_isolation_sipo_payments" ON public.sipo_payments
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- Assembly-related (inherited from Assembly.tenantId)
CREATE POLICY "tenant_isolation_assembly_attendees" ON public.assembly_attendees
  FOR ALL
  USING (
    "assemblyId" IN (
      SELECT id FROM public.assemblies
      WHERE "tenantId" = current_setting('app.current_tenant_id', true)::text
    )
  );

CREATE POLICY "tenant_isolation_assembly_agenda_items" ON public.assembly_agenda_items
  FOR ALL
  USING (
    "assemblyId" IN (
      SELECT id FROM public.assemblies
      WHERE "tenantId" = current_setting('app.current_tenant_id', true)::text
    )
  );

CREATE POLICY "tenant_isolation_assembly_votes" ON public.assembly_votes
  FOR ALL
  USING (
    "agendaItemId" IN (
      SELECT ai.id FROM public.assembly_agenda_items ai
      JOIN public.assemblies a ON ai."assemblyId" = a.id
      WHERE a."tenantId" = current_setting('app.current_tenant_id', true)::text
    )
  );

-- Per-rollam (inherited from PerRollamVoting.tenantId)
CREATE POLICY "tenant_isolation_per_rollam_items" ON public.per_rollam_items
  FOR ALL
  USING (
    "votingId" IN (
      SELECT id FROM public.per_rollam_votings
      WHERE "tenantId" = current_setting('app.current_tenant_id', true)::text
    )
  );

CREATE POLICY "tenant_isolation_per_rollam_ballots" ON public.per_rollam_ballots
  FOR ALL
  USING (
    "votingId" IN (
      SELECT id FROM public.per_rollam_votings
      WHERE "tenantId" = current_setting('app.current_tenant_id', true)::text
    )
  );

CREATE POLICY "tenant_isolation_per_rollam_responses" ON public.per_rollam_responses
  FOR ALL
  USING (
    "ballotId" IN (
      SELECT b.id FROM public.per_rollam_ballots b
      JOIN public.per_rollam_votings v ON b."votingId" = v.id
      WHERE v."tenantId" = current_setting('app.current_tenant_id', true)::text
    )
  );

-- Floor Plan Zones → FloorPlan.tenantId
CREATE POLICY "tenant_isolation_floor_plan_zones" ON public.floor_plan_zones
  FOR ALL
  USING (
    "floorPlanId" IN (
      SELECT id FROM public.floor_plans
      WHERE "tenantId" = current_setting('app.current_tenant_id', true)::text
    )
  );

-- ─── TIER 3: System tables (no tenantId, RLS but open or special) ─────────

-- Revoked tokens: system-wide, no tenantId. Allow all (already BYPASSRLS for service).
-- Only impacts non-service roles — safe to deny all (tokens verified server-side).
CREATE POLICY "deny_all_revoked_tokens" ON public.revoked_tokens
  FOR ALL
  USING (false);

-- Attendee keypad assignments: rare, deny for non-service roles
CREATE POLICY "deny_all_attendee_keypad" ON public.attendee_keypad_assignments
  FOR ALL
  USING (false);

-- ─── INDEX: Help subquery performance ──────────────────────────────────────
-- Properties.tenantId is already indexed (compound index).
-- Ensure units.propertyId → properties lookup is fast.
CREATE INDEX IF NOT EXISTS "idx_units_propertyId" ON public.units ("propertyId");
CREATE INDEX IF NOT EXISTS "idx_mio_messages_conversationId" ON public.mio_messages ("conversationId");
