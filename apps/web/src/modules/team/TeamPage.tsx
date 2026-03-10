import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { KpiCard, Badge, SearchBar, Button, Modal } from '../../shared/components';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import type { BadgeVariant } from '../../shared/components';
import { formatCzDate } from '../../shared/utils/format';
import { useAuthStore } from '../../core/auth/auth.store';
import {
  useAdminUsers, useInviteUser, useUpdateUser, useDeactivateUser,
} from '../admin/api/admin.queries';

const ROLES = ['owner', 'admin', 'manager', 'technician', 'viewer'] as const;

const ROLE_LABELS: Record<string, string> = {
  owner: 'Vlastník',
  admin: 'Admin',
  manager: 'Manažer',
  technician: 'Technik',
  viewer: 'Čtenář',
};

const ROLE_COLOR: Record<string, BadgeVariant> = {
  owner: 'purple',
  admin: 'red',
  manager: 'blue',
  technician: 'yellow',
  viewer: 'muted',
};

interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function TeamPage() {
  const currentUser = useAuthStore(s => s.user);
  const { data: users, isLoading, isError, refetch } = useAdminUsers();

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [editUser, setEditUser] = useState<ApiUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiUser | null>(null);

  const items: ApiUser[] = users ?? [];

  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (filterRole) result = result.filter(u => u.role === filterRole);
    return result;
  }, [items, search, filterRole]);

  // Stats
  const total = items.length;
  const active = items.filter(u => u.isActive).length;
  const byRole = ROLES.reduce((acc, r) => {
    acc[r] = items.filter(u => u.role === r).length;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) return <LoadingState text="Nacitani uzivatelu..." />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Uzivatele & Tym</h1>
          <p className="page-subtitle">{total} uzivatelu, {active} aktivnich</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowInvite(true)}>Pozvat uzivatele</Button>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Celkem" value={String(total)} color="var(--accent-blue)" />
        <KpiCard label="Aktivni" value={String(active)} color="var(--accent-green)" />
        <KpiCard label="Admini" value={String((byRole.owner ?? 0) + (byRole.admin ?? 0))} color="var(--accent-purple, #8b5cf6)" />
        <KpiCard label="Technici" value={String(byRole.technician ?? 0)} color="var(--accent-orange)" />
        <KpiCard label="Neaktivni" value={String(total - active)} color={total - active > 0 ? 'var(--danger)' : 'var(--accent-green)'} />
      </div>

      {/* Toolbar */}
      <div className="flex-bar" style={{ marginBottom: 16 }}>
        <SearchBar placeholder="Hledat uzivatele..." onSearch={setSearch} />
        <select className="btn" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">Vsechny role</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>

      {/* Users table */}
      {filtered.length === 0 ? (
        <div className="text-muted" style={{ textAlign: 'center', padding: 40 }}>Zadni uzivatele</div>
      ) : (
        <div className="data-table" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Uzivatel', 'Email', 'Role', 'Status', 'Posledni prihlaseni', 'Vytvoren', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const isSelf = currentUser?.id === u.id;
                return (
                  <tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => !isSelf ? setEditUser(u) : undefined}>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: u.isActive ? 'var(--accent, #6366f1)' : 'var(--border)',
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
                        }}>
                          {u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {u.name}
                            {isSelf && <span style={{ fontSize: '0.72rem', color: 'var(--accent-green)', marginLeft: 6 }}>(vy)</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }} className="text-muted">{u.email}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                      <Badge variant={ROLE_COLOR[u.role] || 'muted'}>{ROLE_LABELS[u.role] || u.role}</Badge>
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                      {u.isActive
                        ? <Badge variant="green">Aktivni</Badge>
                        : <Badge variant="red">Neaktivni</Badge>}
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }} className="text-muted text-sm">
                      {u.lastLoginAt ? formatCzDate(u.lastLoginAt) : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }} className="text-muted text-sm">
                      {formatCzDate(u.createdAt)}
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                      {!isSelf && (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <Button size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setEditUser(u); }}>Upravit</Button>
                          <Button size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setDeleteTarget(u); }}
                            style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>Smazat</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && <InviteUserModal onClose={() => setShowInvite(false)} />}

      {/* Edit modal */}
      {editUser && (
        <EditUserModal
          user={editUser}
          isSelf={currentUser?.id === editUser.id}
          onClose={() => setEditUser(null)}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <DeleteUserModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ── Invite Modal ──

function InviteUserModal({ onClose }: { onClose: () => void }) {
  const inviteMutation = useInviteUser();
  const [form, setForm] = useState({ name: '', email: '', role: 'viewer', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const pwd = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    set('password', pwd);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Jmeno je povinne';
    if (!form.email.trim()) errs.email = 'Email je povinny';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Neplatny email';
    if (!form.password || form.password.length < 8) errs.password = 'Heslo min 8 znaku';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    inviteMutation.mutate(form, { onSuccess: () => onClose() });
  };

  const inputStyle = (field?: string) => ({
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box' as const,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  });

  return (
    <Modal open onClose={onClose} title="Pozvat uzivatele"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrusit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={inviteMutation.isPending}>Pozvat</Button>
        </div>
      }>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Jmeno a prijmeni *</label>
        <input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle('name')} placeholder="Jan Novak" />
        {errors.name && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.name}</div>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Email *</label>
        <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle('email')} placeholder="jan@firma.cz" />
        {errors.email && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.email}</div>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Role</label>
        <select value={form.role} onChange={e => set('role', e.target.value)} style={inputStyle()}>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Heslo *</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={form.password} onChange={e => set('password', e.target.value)} style={{ ...inputStyle('password'), flex: 1 }} placeholder="Min. 8 znaku" />
          <Button size="sm" onClick={generatePassword}>Generovat</Button>
        </div>
        {errors.password && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.password}</div>}
        {form.password && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Heslo bude odeslano na email uzivatele.
          </div>
        )}
      </div>

      {inviteMutation.isError && (
        <div style={{ color: 'var(--danger)', fontSize: '0.85rem', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 6 }}>
          {(inviteMutation.error as any)?.response?.data?.message || 'Chyba pri pozvani'}
        </div>
      )}
    </Modal>
  );
}

// ── Edit Modal ──

function EditUserModal({ user, isSelf, onClose }: { user: ApiUser; isSelf: boolean; onClose: () => void }) {
  const updateMutation = useUpdateUser();
  const [form, setForm] = useState({ name: user.name, role: user.role, isActive: user.isActive });

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    const dto: { name?: string; role?: string; isActive?: boolean } = {};
    if (form.name !== user.name) dto.name = form.name;
    if (form.role !== user.role && !isSelf) dto.role = form.role;
    if (form.isActive !== user.isActive && !isSelf) dto.isActive = form.isActive;
    if (Object.keys(dto).length === 0) { onClose(); return; }
    updateMutation.mutate({ id: user.id, dto }, { onSuccess: () => onClose() });
  };

  const inputStyle = () => ({
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box' as const,
    border: '1px solid var(--border)',
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  });

  return (
    <Modal open onClose={onClose} title={`Upravit: ${user.name}`}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrusit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={updateMutation.isPending}>Ulozit</Button>
        </div>
      }>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Jmeno</label>
        <input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle()} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Email</label>
        <input value={user.email} disabled style={{ ...inputStyle(), opacity: 0.6 }} />
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Email nelze zmenit</div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Role {isSelf && <span style={{ color: 'var(--text-muted)' }}>(nelze zmenit svou roli)</span>}</label>
        <select value={form.role} onChange={e => set('role', e.target.value)} style={inputStyle()} disabled={isSelf}>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Status {isSelf && <span style={{ color: 'var(--text-muted)' }}>(nelze deaktivovat sebe)</span>}</label>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: isSelf ? 'not-allowed' : 'pointer' }}>
            <input type="radio" checked={form.isActive} onChange={() => set('isActive', true)} disabled={isSelf} /> Aktivni
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: isSelf ? 'not-allowed' : 'pointer' }}>
            <input type="radio" checked={!form.isActive} onChange={() => set('isActive', false)} disabled={isSelf} /> Neaktivni
          </label>
        </div>
      </div>

      <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Vytvoren: {formatCzDate(user.createdAt)} · Posledni prihlaseni: {user.lastLoginAt ? formatCzDate(user.lastLoginAt) : 'nikdy'}
      </div>
    </Modal>
  );
}

// ── Delete Modal ──

function DeleteUserModal({ user, onClose }: { user: ApiUser; onClose: () => void }) {
  const deactivateMutation = useDeactivateUser();

  const handleDelete = () => {
    deactivateMutation.mutate(user.id, { onSuccess: () => onClose() });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 24, maxWidth: 420, width: '90%',
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: 8 }}>Smazat uzivatele?</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: '0.9rem' }}>
          Opravdu chcete deaktivovat uzivatele <strong>{user.name}</strong> ({user.email})?
          Uzivatel ztrati pristup do systemu.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrusit</Button>
          <Button variant="primary" onClick={handleDelete} disabled={deactivateMutation.isPending}
            style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}>
            Deaktivovat
          </Button>
        </div>
      </div>
    </div>
  );
}
