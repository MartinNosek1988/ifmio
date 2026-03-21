import { useState, useMemo } from 'react';
import { Plus, Key } from 'lucide-react';
import { KpiCard, Badge, SearchBar, Button, Modal } from '../../shared/components';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import type { BadgeVariant } from '../../shared/components';
import { formatCzDate } from '../../shared/utils/format';
import { useAuthStore } from '../../core/auth/auth.store';
import { apiClient } from '../../core/api/client';
import {
  useAdminUsers, useInviteUser, useUpdateUser, useDeactivateUser,
} from '../admin/api/admin.queries';

const ROLES = ['tenant_owner', 'tenant_admin', 'property_manager', 'finance_manager', 'operations', 'viewer'] as const;

const ROLE_LABELS: Record<string, string> = {
  tenant_owner: 'Vlastník',
  tenant_admin: 'Admin',
  property_manager: 'Správce',
  finance_manager: 'Finance',
  operations: 'Provoz',
  viewer: 'Čtenář',
};

const ROLE_COLOR: Record<string, BadgeVariant> = {
  tenant_owner: 'purple',
  tenant_admin: 'red',
  property_manager: 'blue',
  finance_manager: 'green',
  operations: 'yellow',
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

  if (isLoading) return <LoadingState text="Načítání uživatelů..." />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Uživatelé & Tým</h1>
          <p className="page-subtitle">{total} uživatelů, {active} aktivních</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowInvite(true)}>Pozvat uživatele</Button>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Celkem" value={String(total)} color="var(--accent-blue)" />
        <KpiCard label="Aktivní" value={String(active)} color="var(--accent-green)" />
        <KpiCard label="Admini" value={String((byRole.tenant_owner ?? 0) + (byRole.tenant_admin ?? 0))} color="var(--accent-purple, #8b5cf6)" />
        <KpiCard label="Provoz" value={String(byRole.operations ?? 0)} color="var(--accent-orange)" />
        <KpiCard label="Neaktivní" value={String(total - active)} color={total - active > 0 ? 'var(--danger)' : 'var(--accent-green)'} />
      </div>

      {/* Toolbar */}
      <div className="flex-bar" style={{ marginBottom: 16 }}>
        <SearchBar placeholder="Hledat uživatele..." onSearch={setSearch} />
        <select className="btn" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">Všechny role</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>

      {/* Users table */}
      {filtered.length === 0 ? (
        <div className="text-muted" style={{ textAlign: 'center', padding: 40 }}>Žádní uživatelé</div>
      ) : (
        <div className="data-table" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Uživatel', 'Email', 'Role', 'Status', 'Poslední přihlášení', 'Vytvořen', ''].map(h => (
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
                        ? <Badge variant="green">Aktivní</Badge>
                        : <Badge variant="red">Neaktivní</Badge>}
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
                          <Button size="sm" onClick={async (e: React.MouseEvent) => {
                            e.stopPropagation();
                            try {
                              await apiClient.post(`/admin/users/${u.id}/force-password-change`, { force: true });
                              alert('Uživatel bude vyzván ke změně hesla při příštím přihlášení.');
                            } catch { alert('Nepodařilo se nastavit.'); }
                          }} title="Vyžadovat změnu hesla"><Key size={13} /></Button>
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
    if (!form.name.trim()) errs.name = 'Jméno je povinné';
    if (!form.email.trim()) errs.email = 'Email je povinný';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Neplatný email';
    if (!form.password || form.password.length < 8) errs.password = 'Heslo min 8 znaků';
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
    <Modal open onClose={onClose} title="Pozvat uživatele"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={inviteMutation.isPending}>Pozvat</Button>
        </div>
      }>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Jméno a příjmení *</label>
        <input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle('name')} placeholder="Jan Novák" />
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
          <input value={form.password} onChange={e => set('password', e.target.value)} style={{ ...inputStyle('password'), flex: 1 }} placeholder="Min. 8 znaků" />
          <Button size="sm" onClick={generatePassword}>Generovat</Button>
        </div>
        {errors.password && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.password}</div>}
        {form.password && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Heslo bude odesláno na email uživatele.
          </div>
        )}
      </div>

      {inviteMutation.isError && (
        <div style={{ color: 'var(--danger)', fontSize: '0.85rem', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 6 }}>
          {(inviteMutation.error as any)?.response?.data?.message || 'Chyba při pozvání'}
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
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={updateMutation.isPending}>Uložit</Button>
        </div>
      }>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Jméno</label>
        <input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle()} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Email</label>
        <input value={user.email} disabled style={{ ...inputStyle(), opacity: 0.6 }} />
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Email nelze změnit</div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Role {isSelf && <span style={{ color: 'var(--text-muted)' }}>(nelze změnit svou roli)</span>}</label>
        <select value={form.role} onChange={e => set('role', e.target.value)} style={inputStyle()} disabled={isSelf}>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Status {isSelf && <span style={{ color: 'var(--text-muted)' }}>(nelze deaktivovat sebe)</span>}</label>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: isSelf ? 'not-allowed' : 'pointer' }}>
            <input type="radio" checked={form.isActive} onChange={() => set('isActive', true)} disabled={isSelf} /> Aktivní
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: isSelf ? 'not-allowed' : 'pointer' }}>
            <input type="radio" checked={!form.isActive} onChange={() => set('isActive', false)} disabled={isSelf} /> Neaktivní
          </label>
        </div>
      </div>

      <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Vytvořen: {formatCzDate(user.createdAt)} · Poslední přihlášení: {user.lastLoginAt ? formatCzDate(user.lastLoginAt) : 'nikdy'}
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
        <h3 style={{ marginBottom: 8 }}>Smazat uživatele?</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: '0.9rem' }}>
          Opravdu chcete deaktivovat uživatele <strong>{user.name}</strong> ({user.email})?
          Uživatel ztratí přístup do systému.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleDelete} disabled={deactivateMutation.isPending}
            style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}>
            Deaktivovat
          </Button>
        </div>
      </div>
    </div>
  );
}
