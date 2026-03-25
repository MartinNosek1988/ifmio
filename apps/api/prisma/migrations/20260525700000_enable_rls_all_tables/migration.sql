-- Migration: enable RLS on all public tables flagged by Supabase linter
-- No row-level policies are defined here.
-- RLS is bypassed because DATABASE_URL uses the Postgres role that owns the tables
-- (mapped to Supabase's service_role, which has BYPASSRLS privilege).
-- Application-level tenant isolation is enforced in NestJS services via tenantId filters.

ALTER TABLE public.user_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendee_keypad_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revoked_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_risk_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_cost_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sipo_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sipo_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sipo_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initial_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assembly_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assembly_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assembly_agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mio_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.per_rollam_ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.per_rollam_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.per_rollam_votings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.per_rollam_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hardware_voting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mio_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_quantities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_management_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_plan_zones ENABLE ROW LEVEL SECURITY;
