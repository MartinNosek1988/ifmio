import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../core/api/client';
import {
  Building2, Users, TrendingUp, Shield, Search,
  ChevronLeft, ExternalLink, ToggleLeft, ToggleRight,
  Clock, Activity, Eye, UserCog, Crown,
} from 'lucide-react';

/* ─── types ──────────────────────────────────────────────────────── */

interface Stats {
  tenants: number; activeTenants: number; trialTenants: number; paidTenants: number;
  users: number; properties: number; reg7: number; reg30: number;
  planDistribution: { plan: string; count: number }[];
}

interface TenantRow {
  id: string; name: string; slug: string; plan: string;
  isActive: boolean; trialEndsAt: string | null; createdAt: string;
  maxUsers: number; maxProperties: number; notes: string | null;
  _count: { users: number; properties: number };
  users: { email: string; name: string }[];
}

interface TenantDetail extends TenantRow {
  _count: { users: number; properties: number; residents: number; workOrders: number };
  users: { id: string; email: string; name: string; role: string; isActive: boolean; lastLoginAt: string | null; createdAt: string }[];
  settings: Record<string, unknown> | null;
}

interface UserRow {
  id: string; email: string; name: string; role: string;
  isActive: boolean; lastLoginAt: string | null; createdAt: string;
  tenant: { id: string; name: string; plan: string };
}

interface AuditRow {
  id: string; action: string; entity: string; entityId: string | null;
  createdAt: string; ipAddress: string | null;
  user: { name: string; email: string } | null;
  tenant: { name: string } | null;
}

type Tab = 'dashboard' | 'tenants' | 'users' | 'audit';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Přehled', icon: <TrendingUp size={16} /> },
  { key: 'tenants', label: 'Tenanti', icon: <Building2 size={16} /> },
  { key: 'users', label: 'Uživatelé', icon: <Users size={16} /> },
  { key: 'audit', label: 'Audit log', icon: <Activity size={16} /> },
];

const PLAN_COLORS: Record<string, string> = {
  free: '#22c55e', starter: '#3b82f6', pro: '#6366f1', enterprise: '#f59e0b',
};

const ROLE_COLORS: Record<string, string> = {
  owner: '#ef4444', admin: '#f59e0b', manager: '#3b82f6', technician: '#22c55e', viewer: '#6b7280',
};

/* ─── main ───────────────────────────────────────────────────────── */

export default function SuperAdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  // Check access
  const { data: check, isLoading: checking } = useQuery({
    queryKey: ['super-admin', 'check'],
    queryFn: () => apiClient.get('/super-admin/check').then((r) => r.data),
    retry: false,
  });

  useEffect(() => {
    if (!checking && check && !check.isSuperAdmin) {
      navigate('/dashboard', { replace: true });
    }
  }, [check, checking, navigate]);

  if (checking) return <div style={{ padding: 40, color: '#9ca3af' }}>Ověřuji přístup...</div>;
  if (!check?.isSuperAdmin) return null;

  if (selectedTenantId) {
    return <TenantDetailView id={selectedTenantId} onBack={() => setSelectedTenantId(null)} />;
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Shield size={22} style={{ color: '#ef4444' }} />
        <h1 style={{ color: '#f3f4f6', fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>Super Admin</h1>
      </div>

      <div className="profile-tabs" style={{ marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t.key} className={`profile-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'tenants' && <TenantsTab onSelect={setSelectedTenantId} />}
      {tab === 'users' && <UsersTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  );
}

/* ─── Dashboard Tab ──────────────────────────────────────────────── */

function DashboardTab() {
  const { data: stats } = useQuery<Stats>({
    queryKey: ['super-admin', 'stats'],
    queryFn: () => apiClient.get('/super-admin/stats').then((r) => r.data),
  });

  if (!stats) return <div style={{ color: '#9ca3af' }}>Načítání...</div>;

  return (
    <div>
      <div className="sa-kpi-grid">
        <KpiCard label="Celkem tenantů" value={stats.tenants} sub={`Aktivních: ${stats.activeTenants}`} />
        <KpiCard label="V trialu" value={stats.trialTenants} color="#f59e0b" />
        <KpiCard label="Placených" value={stats.paidTenants} color="#22c55e" />
        <KpiCard label="Uživatelů" value={stats.users} />
        <KpiCard label="Nemovitostí" value={stats.properties} />
        <KpiCard label="Nové (7 dní)" value={stats.reg7} color="#3b82f6" />
        <KpiCard label="Nové (30 dní)" value={stats.reg30} color="#3b82f6" />
      </div>

      <div className="sa-card" style={{ marginTop: 20 }}>
        <h3 className="sa-card-title">Distribuce plánů</h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {stats.planDistribution.map((p) => (
            <div key={p.plan} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: PLAN_COLORS[p.plan] ?? '#6b7280',
              }} />
              <span style={{ color: '#d1d5db', fontSize: '.85rem' }}>
                {p.plan}: <strong>{p.count}</strong>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color?: string }) {
  return (
    <div className="sa-card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: color ?? '#f3f4f6' }}>{value}</div>
      <div style={{ fontSize: '.82rem', color: '#9ca3af', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: '.72rem', color: '#6b7280', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ─── Tenants Tab ────────────────────────────────────────────────── */

function TenantsTab({ onSelect }: { onSelect: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data } = useQuery({
    queryKey: ['super-admin', 'tenants', debouncedSearch],
    queryFn: () => apiClient.get('/super-admin/tenants', {
      params: { limit: 100, search: debouncedSearch || undefined },
    }).then((r) => r.data),
  });

  const tenants: TenantRow[] = data?.data ?? [];

  return (
    <div>
      <div className="sa-search-bar">
        <Search size={16} style={{ color: '#6b7280' }} />
        <input placeholder="Hledat tenant..." value={search}
          onChange={(e) => setSearch(e.target.value)} className="sa-search-input" />
        <span style={{ color: '#6b7280', fontSize: '.78rem' }}>{data?.total ?? 0} tenantů</span>
      </div>

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>Tenant</th><th>Owner</th><th>Plán</th>
              <th>Uživatelé</th><th>Nemov.</th><th>Trial do</th>
              <th>Status</th><th>Registrace</th><th></th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id}>
                <td>
                  <div style={{ fontWeight: 600, color: '#f3f4f6' }}>{t.name}</div>
                  <div style={{ fontSize: '.72rem', color: '#6b7280' }}>{t.slug}</div>
                </td>
                <td style={{ fontSize: '.82rem', color: '#9ca3af' }}>
                  {t.users[0]?.email ?? '—'}
                </td>
                <td>
                  <span className="sa-badge" style={{ background: `${PLAN_COLORS[t.plan] ?? '#6b7280'}20`, color: PLAN_COLORS[t.plan] ?? '#6b7280' }}>
                    {t.plan}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>{t._count.users}</td>
                <td style={{ textAlign: 'center' }}>{t._count.properties}</td>
                <td style={{ fontSize: '.82rem', color: '#9ca3af' }}>
                  {t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString('cs-CZ') : '—'}
                </td>
                <td>
                  <span className="sa-badge" style={{
                    background: t.isActive ? '#22c55e20' : '#ef444420',
                    color: t.isActive ? '#22c55e' : '#ef4444',
                  }}>
                    {t.isActive ? 'Aktivní' : 'Neaktivní'}
                  </span>
                </td>
                <td style={{ fontSize: '.82rem', color: '#6b7280' }}>
                  {new Date(t.createdAt).toLocaleDateString('cs-CZ')}
                </td>
                <td>
                  <button className="sa-btn-sm" onClick={() => onSelect(t.id)} title="Detail">
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: '#6b7280', padding: 24 }}>Žádní tenanti</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Tenant Detail View ─────────────────────────────────────────── */

function TenantDetailView({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const { data: tenant } = useQuery<TenantDetail>({
    queryKey: ['super-admin', 'tenants', id],
    queryFn: () => apiClient.get(`/super-admin/tenants/${id}`).then((r) => r.data),
  });

  const updateMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiClient.patch(`/super-admin/tenants/${id}`, body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-admin', 'tenants', id] });
      qc.invalidateQueries({ queryKey: ['super-admin', 'stats'] });
    },
  });

  const impersonateMut = useMutation({
    mutationFn: () => apiClient.post(`/super-admin/tenants/${id}/impersonate`).then((r) => r.data),
    onSuccess: (data) => {
      // Open new window with impersonation token
      const url = `${window.location.origin}/dashboard?sa_token=${data.accessToken}`;
      window.open(url, '_blank');
    },
  });

  if (!tenant) return <div style={{ padding: 40, color: '#9ca3af' }}>Načítání...</div>;

  const trialDays = tenant.trialEndsAt
    ? Math.ceil((new Date(tenant.trialEndsAt).getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <button onClick={onBack} className="sa-back-btn">
        <ChevronLeft size={16} /> Zpět na seznam
      </button>

      {/* Header */}
      <div className="sa-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ color: '#f3f4f6', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{tenant.name}</h2>
            <div style={{ color: '#6b7280', fontSize: '.82rem', marginTop: 4 }}>
              Slug: {tenant.slug} &middot; ID: <code style={{ fontSize: '.75rem' }}>{tenant.id}</code>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="sa-badge" style={{ background: `${PLAN_COLORS[tenant.plan]}20`, color: PLAN_COLORS[tenant.plan] }}>
              {tenant.plan}
            </span>
            <span className="sa-badge" style={{
              background: tenant.isActive ? '#22c55e20' : '#ef444420',
              color: tenant.isActive ? '#22c55e' : '#ef4444',
            }}>
              {tenant.isActive ? 'Aktivní' : 'Neaktivní'}
            </span>
            {trialDays !== null && trialDays > 0 && (
              <span className="sa-badge" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
                Trial: {trialDays} dní
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="sa-kpi-grid" style={{ marginBottom: 16 }}>
        <KpiCard label="Uživatelé" value={tenant._count.users} />
        <KpiCard label="Nemovitosti" value={tenant._count.properties} />
        <KpiCard label="Bydlící" value={tenant._count.residents} />
        <KpiCard label="Work Orders" value={tenant._count.workOrders} />
      </div>

      {/* Actions */}
      <div className="sa-card" style={{ marginBottom: 16 }}>
        <h3 className="sa-card-title">Akce</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* Plan change */}
          <select
            value={tenant.plan}
            onChange={(e) => updateMut.mutate({ plan: e.target.value })}
            className="sa-select"
          >
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>

          {/* Extend trial */}
          <button className="sa-btn" onClick={() => {
            const d = new Date();
            d.setDate(d.getDate() + 14);
            updateMut.mutate({ trialEndsAt: d.toISOString() });
          }}>
            <Clock size={14} /> +14 dní trial
          </button>

          {/* Toggle active */}
          <button className="sa-btn" onClick={() => updateMut.mutate({ isActive: !tenant.isActive })}
            style={{ color: tenant.isActive ? '#ef4444' : '#22c55e' }}>
            {tenant.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            {tenant.isActive ? 'Deaktivovat' : 'Aktivovat'}
          </button>

          {/* Impersonate */}
          <button className="sa-btn" onClick={() => impersonateMut.mutate()}
            disabled={impersonateMut.isPending}
            style={{ color: '#f59e0b' }}>
            <ExternalLink size={14} /> Přihlásit se jako tenant
          </button>
        </div>

        {/* Info row */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 16, fontSize: '.82rem', color: '#6b7280' }}>
          <span>Registrace: <strong style={{ color: '#d1d5db' }}>{new Date(tenant.createdAt).toLocaleDateString('cs-CZ')}</strong></span>
          <span>Max uživatelů: <strong style={{ color: '#d1d5db' }}>{tenant.maxUsers}</strong></span>
          <span>Max nemovitostí: <strong style={{ color: '#d1d5db' }}>{tenant.maxProperties}</strong></span>
          {tenant.notes && <span>Poznámka: <strong style={{ color: '#d1d5db' }}>{tenant.notes}</strong></span>}
        </div>
      </div>

      {/* Users */}
      <div className="sa-card">
        <h3 className="sa-card-title">Uživatelé ({tenant.users.length})</h3>
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr><th>Jméno</th><th>Email</th><th>Role</th><th>Aktivní</th><th>Poslední login</th><th>Registrace</th></tr>
            </thead>
            <tbody>
              {tenant.users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600, color: '#f3f4f6' }}>{u.name}</td>
                  <td style={{ color: '#9ca3af', fontSize: '.85rem' }}>{u.email}</td>
                  <td>
                    <span className="sa-badge" style={{ background: `${ROLE_COLORS[u.role] ?? '#6b7280'}20`, color: ROLE_COLORS[u.role] ?? '#6b7280' }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ color: u.isActive ? '#22c55e' : '#ef4444' }}>{u.isActive ? 'Ano' : 'Ne'}</span>
                  </td>
                  <td style={{ fontSize: '.82rem', color: '#6b7280' }}>
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('cs-CZ') : '—'}
                  </td>
                  <td style={{ fontSize: '.82rem', color: '#6b7280' }}>
                    {new Date(u.createdAt).toLocaleDateString('cs-CZ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Users Tab ──────────────────────────────────────────────────── */

function UsersTab() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data } = useQuery({
    queryKey: ['super-admin', 'users', debouncedSearch, roleFilter],
    queryFn: () => apiClient.get('/super-admin/users', {
      params: { limit: 100, search: debouncedSearch || undefined, role: roleFilter || undefined },
    }).then((r) => r.data),
  });

  const users: UserRow[] = data?.data ?? [];

  return (
    <div>
      <div className="sa-search-bar">
        <Search size={16} style={{ color: '#6b7280' }} />
        <input placeholder="Hledat uživatele..." value={search}
          onChange={(e) => setSearch(e.target.value)} className="sa-search-input" />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="sa-select" style={{ width: 'auto' }}>
          <option value="">Všechny role</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="technician">Technik</option>
          <option value="viewer">Viewer</option>
        </select>
        <span style={{ color: '#6b7280', fontSize: '.78rem' }}>{data?.total ?? 0} uživatelů</span>
      </div>

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr><th>Jméno</th><th>Email</th><th>Tenant</th><th>Role</th><th>Plán</th><th>Aktivní</th><th>Poslední login</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600, color: '#f3f4f6' }}>{u.name}</td>
                <td style={{ color: '#9ca3af', fontSize: '.85rem' }}>{u.email}</td>
                <td style={{ color: '#9ca3af', fontSize: '.85rem' }}>{u.tenant.name}</td>
                <td>
                  <span className="sa-badge" style={{ background: `${ROLE_COLORS[u.role] ?? '#6b7280'}20`, color: ROLE_COLORS[u.role] ?? '#6b7280' }}>
                    {u.role}
                  </span>
                </td>
                <td>
                  <span className="sa-badge" style={{ background: `${PLAN_COLORS[u.tenant.plan] ?? '#6b7280'}20`, color: PLAN_COLORS[u.tenant.plan] ?? '#6b7280' }}>
                    {u.tenant.plan}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ color: u.isActive ? '#22c55e' : '#ef4444' }}>{u.isActive ? 'Ano' : 'Ne'}</span>
                </td>
                <td style={{ fontSize: '.82rem', color: '#6b7280' }}>
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('cs-CZ') : '—'}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#6b7280', padding: 24 }}>Žádní uživatelé</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Audit Tab ──────────────────────────────────────────────────── */

function AuditTab() {
  const { data } = useQuery({
    queryKey: ['super-admin', 'audit'],
    queryFn: () => apiClient.get('/super-admin/audit', { params: { limit: 100 } }).then((r) => r.data),
  });

  const rows: AuditRow[] = data?.data ?? [];

  return (
    <div>
      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr><th>Čas</th><th>Tenant</th><th>Uživatel</th><th>Akce</th><th>Entita</th><th>IP</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ fontSize: '.82rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                  {new Date(r.createdAt).toLocaleString('cs-CZ')}
                </td>
                <td style={{ fontSize: '.85rem', color: '#9ca3af' }}>{r.tenant?.name ?? '—'}</td>
                <td style={{ fontSize: '.85rem', color: '#d1d5db' }}>
                  {r.user?.name ?? '—'}
                  <div style={{ fontSize: '.72rem', color: '#6b7280' }}>{r.user?.email ?? ''}</div>
                </td>
                <td>
                  <span className="sa-badge" style={{ background: '#6366f120', color: '#818cf8' }}>
                    {r.action}
                  </span>
                </td>
                <td style={{ color: '#9ca3af', fontSize: '.85rem' }}>
                  {r.entity}{r.entityId ? ` #${r.entityId.slice(0, 8)}` : ''}
                </td>
                <td style={{ fontSize: '.78rem', color: '#6b7280' }}>{r.ipAddress ?? '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6b7280', padding: 24 }}>Žádné záznamy</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
