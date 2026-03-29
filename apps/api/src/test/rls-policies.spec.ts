/**
 * RLS Policy Smoke Tests
 *
 * These tests verify that RLS policies are correctly defined in the database.
 * They do NOT test actual row filtering (service_role bypasses RLS).
 * For actual isolation testing, see: docs/runbooks/rls-verification.md
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tables that MUST have tenant_isolation policies
const TIER1_TABLES_WITH_DIRECT_TENANT_ID = [
  'properties', 'users', 'invoices', 'documents',
  'helpdesk_tickets', 'work_orders', 'bank_accounts', 'bank_transactions',
  'parties', 'finance_transactions', 'prescriptions', 'meters', 'assets',
  'audit_logs', 'notifications', 'lease_agreements', 'protocols',
  'calendar_events', 'owner_accounts', 'billing_periods', 'residents',
  'tenancies', 'unit_ownerships', 'principals', 'management_contracts',
  'mio_conversations', 'api_keys', 'portal_access', 'portal_messages',
  'assemblies', 'per_rollam_votings', 'sipo_configs', 'sipo_exports',
  'floor_plans', 'kanban_tasks', 'initial_balances', 'accounting_presets',
  'login_risk_logs', 'hardware_voting_sessions', 'unit_groups', 'sipo_payments',
];

const TIER2_INHERITED_TABLES = [
  'units', 'mio_messages', 'unit_rooms', 'unit_quantities',
  'unit_equipment', 'unit_management_fees', 'unit_group_memberships',
  'user_features', 'invoice_cost_allocations',
  'assembly_attendees', 'assembly_agenda_items', 'assembly_votes',
  'per_rollam_items', 'per_rollam_ballots', 'per_rollam_responses',
  'floor_plan_zones',
];

const ALL_POLICY_TABLES = [...TIER1_TABLES_WITH_DIRECT_TENANT_ID, ...TIER2_INHERITED_TABLES];

afterAll(async () => {
  await prisma.$disconnect();
});

describe('RLS Policies — Schema Verification', () => {
  let rlsStatus: { tablename: string; rowsecurity: boolean }[];
  let policies: { tablename: string; policyname: string; cmd: string; qual: string }[];

  beforeAll(async () => {
    // Query RLS status for all tables
    rlsStatus = await prisma.$queryRaw<{ tablename: string; rowsecurity: boolean }[]>`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    // Query all policies
    policies = await prisma.$queryRaw<{ tablename: string; policyname: string; cmd: string; qual: string }[]>`
      SELECT
        schemaname || '.' || tablename as tablename,
        policyname,
        cmd,
        qual::text
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `;
  });

  it('all tier-1 tables have RLS enabled', () => {
    const rlsMap = new Map(rlsStatus.map(r => [r.tablename, r.rowsecurity]));

    const missing: string[] = [];
    for (const table of TIER1_TABLES_WITH_DIRECT_TENANT_ID) {
      if (!rlsMap.get(table)) missing.push(table);
    }

    expect(missing).toEqual([]);
  });

  it('all tier-2 inherited tables have RLS enabled', () => {
    const rlsMap = new Map(rlsStatus.map(r => [r.tablename, r.rowsecurity]));

    const missing: string[] = [];
    for (const table of TIER2_INHERITED_TABLES) {
      if (!rlsMap.get(table)) missing.push(table);
    }

    expect(missing).toEqual([]);
  });

  it('every policy table has a tenant_isolation policy', () => {
    const policyTables = new Set(policies.map(p => p.tablename.replace('public.', '')));

    const missing: string[] = [];
    for (const table of ALL_POLICY_TABLES) {
      if (!policyTables.has(table)) missing.push(table);
    }

    expect(missing).toEqual([]);
  });

  it('policies reference app.current_tenant_id setting', () => {
    const badPolicies: string[] = [];

    for (const p of policies) {
      if (p.policyname.startsWith('tenant_isolation_')) {
        if (!p.qual.includes('app.current_tenant_id')) {
          badPolicies.push(`${p.tablename}.${p.policyname}`);
        }
      }
    }

    expect(badPolicies).toEqual([]);
  });

  it('deny-all policies exist for system tables', () => {
    const denyPolicies = policies.filter(p => p.policyname.startsWith('deny_all_'));
    expect(denyPolicies.length).toBeGreaterThanOrEqual(2);
  });

  it('no table has RLS enabled without a policy (dangerous: denies all)', () => {
    const policyTables = new Set(policies.map(p => p.tablename.replace('public.', '')));
    const rlsEnabled = rlsStatus.filter(r => r.rowsecurity);

    const danglingRls: string[] = [];
    for (const r of rlsEnabled) {
      if (!policyTables.has(r.tablename)) {
        danglingRls.push(r.tablename);
      }
    }

    // These would block ALL access for non-service roles
    expect(danglingRls).toEqual([]);
  });
});

describe('RLS Cross-Tenant Isolation — Logic Verification', () => {
  it('tenant_id column exists on all tier-1 tables', async () => {
    const columns = await prisma.$queryRaw<{ table_name: string; column_name: string }[]>`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'tenantId'
      ORDER BY table_name
    `;

    const tablesWithTenantId = new Set(columns.map(c => c.table_name));

    const missing: string[] = [];
    for (const table of TIER1_TABLES_WITH_DIRECT_TENANT_ID) {
      if (!tablesWithTenantId.has(table)) missing.push(table);
    }

    expect(missing).toEqual([]);
  });

  it('units table has propertyId for FK-based isolation', async () => {
    const columns = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'units'
        AND column_name = 'propertyId'
    `;
    expect(columns.length).toBe(1);
  });

  it('mio_messages table has conversationId for FK-based isolation', async () => {
    const columns = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'mio_messages'
        AND column_name = 'conversationId'
    `;
    expect(columns.length).toBe(1);
  });
});
