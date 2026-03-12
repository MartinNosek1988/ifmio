import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table, Badge, EmptyState, KpiCard } from '../../shared/components';
import type { Column, BadgeVariant } from '../../shared/components';
import { loadFromStorage } from '../../core/storage';

type R = Record<string, unknown>;

const TABS = [
  { key: 'team', label: 'Tým' },
  { key: 'settings', label: 'Nastavení' },
  { key: 'roles', label: 'Role' },
] as const;

const ROLE_COLOR: Record<string, BadgeVariant> = { tenant_owner: 'purple', tenant_admin: 'red', property_manager: 'blue', finance_manager: 'green', operations: 'yellow', viewer: 'muted' };
const ROLE_LABELS: Record<string, string> = { tenant_owner: 'Vlastník', tenant_admin: 'Admin', property_manager: 'Správce', finance_manager: 'Finance', operations: 'Provoz', viewer: 'Čtenář' };

export default function AdminPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'team';
  const team = useMemo(() => loadFromStorage<R[]>('estateos_team', []), []);

  const stats = useMemo(() => ({
    total: team.length,
    active: team.filter((t) => t.accountEnabled).length,
    admins: team.filter((t) => t.role === 'tenant_admin' || t.role === 'tenant_owner').length,
  }), [team]);

  const teamColumns: Column<R>[] = [
    { key: 'jmeno', label: 'Jméno', render: (t) => <span style={{ fontWeight: 600 }}>{String(t.jmeno || '')}</span> },
    { key: 'email', label: 'Email', render: (t) => <span className="text-muted">{String(t.email || '')}</span> },
    { key: 'pozice', label: 'Pozice', render: (t) => String(t.pozice || '') },
    { key: 'telefon', label: 'Telefon', render: (t) => <span className="text-muted text-sm">{String(t.telefon || '')}</span> },
    { key: 'role', label: 'Role', render: (t) => <Badge variant={ROLE_COLOR[String(t.role)] || 'muted'}>{ROLE_LABELS[String(t.role)] || String(t.role || '')}</Badge> },
    { key: 'accountEnabled', label: 'Aktivní', render: (t) => <Badge variant={t.accountEnabled ? 'green' : 'red'}>{t.accountEnabled ? 'Ano' : 'Ne'}</Badge> },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Členů týmu" value={String(stats.total)} color="var(--accent-blue)" />
        <KpiCard label="Aktivních" value={String(stats.active)} color="var(--accent-green)" />
        <KpiCard label="Administrátorů" value={String(stats.admins)} color="var(--accent-red)" />
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => setParams({ tab: t.key })}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'team' && <Table data={team} columns={teamColumns} rowKey={(t) => String(t.id)} emptyText="Žádní členové týmu" />}
      {tab === 'settings' && <EmptyState title="Nastavení" description="Nastavení aplikace bude brzy k dispozici." />}
      {tab === 'roles' && <EmptyState title="Role a oprávnění" description="Správa rolí bude brzy k dispozici." />}
    </div>
  );
}
