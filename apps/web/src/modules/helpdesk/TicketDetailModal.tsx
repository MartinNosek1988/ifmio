import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trash2, UserCheck, CheckCircle, Paperclip, Upload, Wrench } from 'lucide-react';
import { Modal, Badge, Button, LoadingState } from '../../shared/components';
import type { BadgeVariant } from '../../shared/components';
import { useTicket, useUpdateTicket, useAddTicketItem, useRemoveTicketItem, useClaimTicket, useResolveTicket } from './api/helpdesk.queries';
import type { ApiTicketItem } from './api/helpdesk.api';
import { useAuthStore } from '../../core/auth/auth.store';
import { apiClient } from '../../core/api/client';
import { documentsApi, formatFileSize } from '../documents/api/documents.api';
import { useWorkOrdersForTicket, useCreateFromTicket } from '../workorders/api/workorders.queries';
import type { ApiWorkOrder } from '../workorders/api/workorders.api';
import ProtocolPanel from '../protocols/ProtocolPanel';

interface Props {
  ticketId: string;
  onClose: () => void;
  onDelete?: () => void;
}

interface TenantUser { id: string; name: string; email: string; role: string; isActive: boolean }
interface AssetOption { id: string; name: string; location: string | null; property?: { name: string } | null }
interface DocItem { id: string; name: string; originalName: string; mimeType: string; size: number; url: string; createdAt: string }

const STATUS_LABELS: Record<string, string> = {
  open: 'Otevřený', in_progress: 'V řešení', resolved: 'Vyřešený', closed: 'Uzavřený',
};
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Nízká', medium: 'Normální', high: 'Vysoká', urgent: 'Urgentní',
};
const CATEGORY_LABELS: Record<string, string> = {
  general: 'Obecné', plumbing: 'Vodovod', electrical: 'Elektro',
  hvac: 'Vytápění/VZT', structural: 'Stavební', cleaning: 'Úklid', other: 'Ostatní',
};

const STATUS_COLOR: Record<string, BadgeVariant> = {
  open: 'blue', in_progress: 'yellow', resolved: 'green', closed: 'muted',
};
const PRIO_COLOR: Record<string, BadgeVariant> = {
  low: 'muted', medium: 'blue', high: 'yellow', urgent: 'red',
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  open: ['in_progress', 'resolved', 'closed'],
  in_progress: ['resolved', 'open', 'closed'],
  resolved: ['closed', 'open'],
  closed: [],
};

type TabKey = 'detail' | 'items' | 'attachments' | 'protocol';

export default function TicketDetailModal({ ticketId, onClose, onDelete }: Props) {
  const { data: ticket, isLoading, refetch } = useTicket(ticketId);
  const updateMutation = useUpdateTicket();
  const claimMutation = useClaimTicket();
  const resolveMutation = useResolveTicket();
  const addItemMutation = useAddTicketItem();
  const removeItemMutation = useRemoveTicketItem();
  const currentUser = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<TabKey>('detail');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    priority: '',
    assigneeId: '',
    dispatcherUserId: '',
    assetId: '',
  });

  // Item form
  const [itemDesc, setItemDesc] = useState('');
  const [itemUnit, setItemUnit] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemPrice, setItemPrice] = useState('0');

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Linked work orders
  const { data: linkedWOs = [], refetch: refetchWOs } = useWorkOrdersForTicket(ticketId);
  const createWOMutation = useCreateFromTicket();

  // Fetch users and assets for edit pickers
  const { data: users = [] } = useQuery<TenantUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => apiClient.get('/admin/users').then((r) => r.data),
    enabled: editing,
  });
  const { data: assetsData } = useQuery<{ data: AssetOption[] }>({
    queryKey: ['assets', 'list-picker'],
    queryFn: () => apiClient.get('/assets', { params: { limit: 500 } }).then((r) => r.data),
    enabled: editing,
  });
  const assets = assetsData?.data ?? [];
  const activeUsers = users.filter((u: TenantUser) => u.isActive);

  // Fetch linked documents
  const { data: docsData, refetch: refetchDocs } = useQuery<{ data: DocItem[] }>({
    queryKey: ['documents', 'ticket', ticketId],
    queryFn: () => apiClient.get('/documents', { params: { entityType: 'ticket', entityId: ticketId, limit: 50 } }).then((r) => r.data),
    enabled: !!ticketId,
  });
  const docs = docsData?.data ?? [];

  if (isLoading || !ticket) {
    return (
      <Modal open onClose={onClose} title="Načítání...">
        <LoadingState />
      </Modal>
    );
  }

  const ticketNum = `HD-${String(ticket.number).padStart(4, '0')}`;
  const items: ApiTicketItem[] = ticket.items ?? [];
  const itemsTotal = items.reduce((s, i) => s + i.totalPrice, 0);
  const allowed = ALLOWED_TRANSITIONS[ticket.status] ?? [];

  const handleStatusChange = (status: string) => {
    updateMutation.mutate({ id: ticket.id, dto: { status } });
  };

  const startEdit = () => {
    setEditForm({
      priority: ticket.priority,
      assigneeId: ticket.assigneeId ?? '',
      dispatcherUserId: ticket.dispatcherUserId ?? '',
      assetId: ticket.assetId ?? '',
    });
    setEditing(true);
  };

  const handleSaveEdit = () => {
    const dto: Record<string, string | undefined> = {};
    if (editForm.priority !== ticket.priority) dto.priority = editForm.priority;
    if (editForm.assigneeId !== (ticket.assigneeId ?? '')) dto.assigneeId = editForm.assigneeId || undefined;
    if (editForm.dispatcherUserId !== (ticket.dispatcherUserId ?? '')) dto.dispatcherUserId = editForm.dispatcherUserId || undefined;
    if (editForm.assetId !== (ticket.assetId ?? '')) dto.assetId = editForm.assetId || undefined;
    if (Object.keys(dto).length === 0) { setEditing(false); return; }
    updateMutation.mutate(
      { id: ticket.id, dto },
      { onSuccess: () => setEditing(false) },
    );
  };

  const handleAddItem = () => {
    if (!itemDesc.trim()) return;
    addItemMutation.mutate(
      {
        ticketId: ticket.id,
        dto: {
          description: itemDesc.trim(),
          unit: itemUnit || undefined,
          quantity: parseFloat(itemQty) || 1,
          unitPrice: parseFloat(itemPrice) || 0,
        },
      },
      {
        onSuccess: () => {
          setItemDesc(''); setItemUnit(''); setItemQty('1'); setItemPrice('0');
        },
      },
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await documentsApi.upload(file, {
          name: `${ticketNum} — ${file.name}`,
          category: file.type.startsWith('image/') ? 'photo' : 'other',
          entityType: 'ticket',
          entityId: ticket.id,
        });
      }
      refetchDocs();
      refetch();
    } catch {
      setUploadError('Nepodařilo se nahrát soubor.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))',
    color: 'var(--text)', boxSizing: 'border-box',
  };

  const tabItems: { key: TabKey; label: string }[] = [
    { key: 'detail', label: 'Detail' },
    { key: 'items', label: `Položky (${items.length})` },
    { key: 'attachments', label: `Přílohy (${docs.length})` },
    { key: 'protocol', label: 'Protokol' },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={`${ticketNum} ${ticket.title}`}
      subtitle={[ticket.property?.name, ticket.unit ? `Jednotka ${ticket.unit.name}` : null].filter(Boolean).join(' · ') || undefined}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>{onDelete && <Button variant="danger" onClick={onDelete}>Smazat</Button>}</div>
          <Button onClick={onClose}>Zavřít</Button>
        </div>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div className="tabs" style={{ flex: 1, marginBottom: 0 }}>
          {tabItems.map((t) => (
            <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <a
          href={`/documents?entityType=ticket&entityId=${ticket.id}`}
          onClick={(e) => { e.preventDefault(); window.open(`/documents?entityType=ticket&entityId=${ticket.id}`, '_blank'); }}
          style={{ fontSize: '0.78rem', color: 'var(--primary, #6366f1)', textDecoration: 'none', whiteSpace: 'nowrap' }}
          title="Otevřít spis v dokumentech"
        >
          📁 Otevřít spis
        </a>
      </div>

      {/* ── DETAIL TAB ───────────────────────────────────────────── */}
      {tab === 'detail' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <Badge variant={STATUS_COLOR[ticket.status] || 'muted'}>{STATUS_LABELS[ticket.status] || ticket.status}</Badge>
            <Badge variant={PRIO_COLOR[ticket.priority] || 'muted'}>{PRIORITY_LABELS[ticket.priority] || ticket.priority}</Badge>
            <Badge variant="blue">{CATEGORY_LABELS[ticket.category] || ticket.category}</Badge>
            {ticket.escalationLevel > 0 && (
              <Badge variant="red">Eskalace L{ticket.escalationLevel}</Badge>
            )}
            {ticket.resolutionDueAt && new Date(ticket.resolutionDueAt).getTime() < Date.now() &&
              (ticket.status === 'open' || ticket.status === 'in_progress') && (
              <Badge variant="red">Po termínu</Badge>
            )}
          </div>

          {/* Ownership actions */}
          {(ticket.status === 'open' || ticket.status === 'in_progress') && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {ticket.assigneeId !== currentUser?.id && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => claimMutation.mutate(ticket.id)}
                  disabled={claimMutation.isPending}
                >
                  <UserCheck size={14} style={{ marginRight: 4 }} />
                  {claimMutation.isPending ? 'Přebírám...' : 'Převzít'}
                </Button>
              )}
              <Button
                size="sm"
                variant="primary"
                onClick={() => resolveMutation.mutate(ticket.id)}
                disabled={resolveMutation.isPending}
              >
                <CheckCircle size={14} style={{ marginRight: 4 }} />
                {resolveMutation.isPending ? 'Vyřizuji...' : 'Rychle vyřešit'}
              </Button>
            </div>
          )}

          {allowed.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 6 }}>Změnit stav:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {allowed.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={s === 'resolved' || s === 'closed' ? 'primary' : undefined}
                    onClick={() => handleStatusChange(s)}
                    disabled={updateMutation.isPending}
                  >
                    {STATUS_LABELS[s] || s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Operational info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <InfoField label="Číslo požadavku" value={ticketNum} />
            <InfoField label="Nemovitost" value={ticket.property?.name ?? '—'} />
            <InfoField label="Jednotka" value={ticket.unit?.name ?? '—'} />
            <InfoField label="Zařízení" value={ticket.asset?.name ?? 'Požadavek není navázán na žádné zařízení.'} />
            <InfoField label="Datum zadání" value={new Date(ticket.createdAt).toLocaleDateString('cs-CZ')} />
            <InfoField label="Čas zadání" value={new Date(ticket.createdAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })} />
            <div>
              <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Vyřešit do
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                {ticket.resolutionDueAt ? fmtDateTime(ticket.resolutionDueAt) : '—'}
                {ticket.deadlineManuallySet && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 6 }}>(ručně nastaveno)</span>
                )}
              </div>
            </div>
            {ticket.resolvedAt && (
              <InfoField label="Vyřešeno" value={fmtDateTime(ticket.resolvedAt)} />
            )}
          </div>

          {/* Responsibility fields */}
          <div style={{
            marginBottom: 16, padding: 12, borderRadius: 8,
            background: 'var(--surface-2, var(--surface))', border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 10 }}>Odpovědnost</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <InfoField label="Zadavatel požadavku" value={ticket.requester?.name ?? '—'} />
              <InfoField label="Dispečer požadavku" value={ticket.dispatcher?.name ?? '—'} />
              <div>
                <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Řešitel požadavku</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{ticket.assignee?.name ?? 'Řešitel zatím není přiřazen.'}</div>
              </div>
            </div>
            <InfoField
              label="Nahlásil"
              value={ticket.resident ? `${ticket.resident.firstName} ${ticket.resident.lastName}` : '—'}
            />
          </div>

          {/* Recurring plan context */}
          {ticket.requestOrigin === 'recurring_plan' && ticket.recurringPlan && (
            <div style={{
              marginBottom: 16, padding: 12, borderRadius: 8,
              background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)',
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                Kontext opakované činnosti
                <Badge variant="purple">Automaticky vygenerováno</Badge>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.85rem' }}>
                <InfoField label="Zdrojový plán" value={ticket.recurringPlan.title} />
                <InfoField label="Plánováno na" value={ticket.plannedForDate ? new Date(ticket.plannedForDate).toLocaleDateString('cs-CZ') : '—'} />
              </div>
              {ticket.recurringPlan.assetId && (
                <div style={{ marginTop: 8 }}>
                  <Button size="sm" onClick={() => window.open(`/assets/${ticket.recurringPlan!.assetId}?tab=recurring`, '_blank')}>
                    Otevřít zdrojový plán
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Linked work orders */}
          <div style={{
            marginBottom: 16, padding: 12, borderRadius: 8,
            background: 'var(--surface-2, var(--surface))', border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Pracovní úkoly ({linkedWOs.length})</div>
              <Button size="sm" variant="primary" onClick={() => {
                createWOMutation.mutate({ ticketId: ticket.id, dto: {} }, {
                  onSuccess: () => refetchWOs(),
                });
              }} disabled={createWOMutation.isPending}>
                <Wrench size={14} style={{ marginRight: 4 }} />
                {createWOMutation.isPending ? 'Vytvářím...' : 'Vytvořit úkol'}
              </Button>
            </div>
            {linkedWOs.length === 0 ? (
              <div className="text-muted" style={{ fontSize: '0.85rem' }}>K požadavku zatím nejsou navázané žádné úkoly.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(linkedWOs as ApiWorkOrder[]).map((wo) => (
                  <div key={wo.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)',
                  }}>
                    <Badge variant={wo.status === 'vyresena' || wo.status === 'uzavrena' ? 'green' : wo.status === 'v_reseni' ? 'yellow' : 'blue'}>
                      {wo.status}
                    </Badge>
                    <div style={{ flex: 1, fontWeight: 500, fontSize: '0.9rem' }}>{wo.title}</div>
                    <span className="text-muted text-sm">{wo.assigneeUser?.name || wo.assignee || '—'}</span>
                    <span className="text-muted text-sm">{new Date(wo.createdAt).toLocaleDateString('cs-CZ')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SLA info */}
          {ticket.responseDueAt && (
            <div style={{
              marginBottom: 16, padding: 12, borderRadius: 8,
              background: 'var(--surface-2, var(--surface))', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 10 }}>SLA</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <InfoField label="Odezva do" value={fmtDateTime(ticket.responseDueAt)} />
                <InfoField label="Vyřešení do" value={fmtDateTime(ticket.resolutionDueAt)} />
                <InfoField label="První odezva" value={ticket.firstResponseAt ? fmtDateTime(ticket.firstResponseAt) : '—'} />
                <InfoField
                  label="Eskalace"
                  value={ticket.escalationLevel > 0
                    ? `Level ${ticket.escalationLevel} (${ticket.escalatedAt ? fmtDateTime(ticket.escalatedAt) : '—'})`
                    : 'Žádná'}
                />
              </div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            {editing ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label className="form-label">Priorita</label>
                    <select value={editForm.priority} onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))} style={inputStyle}>
                      {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Řešitel požadavku</label>
                    <select value={editForm.assigneeId} onChange={(e) => setEditForm((f) => ({ ...f, assigneeId: e.target.value }))} style={inputStyle}>
                      <option value="">— bez řešitele —</option>
                      {activeUsers.map((u: TenantUser) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Dispečer požadavku</label>
                    <select value={editForm.dispatcherUserId} onChange={(e) => setEditForm((f) => ({ ...f, dispatcherUserId: e.target.value }))} style={inputStyle}>
                      <option value="">— bez dispečera —</option>
                      {activeUsers.map((u: TenantUser) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Zařízení</label>
                    <select value={editForm.assetId} onChange={(e) => setEditForm((f) => ({ ...f, assetId: e.target.value }))} style={inputStyle}>
                      <option value="">— bez zařízení —</option>
                      {assets.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}{a.location ? ` (${a.location})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="primary" size="sm" onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Ukládám...' : 'Uložit'}
                  </Button>
                  <Button size="sm" onClick={() => setEditing(false)}>Zrušit</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" onClick={startEdit}>Upravit</Button>
            )}
          </div>

          {ticket.description && (
            <div style={{ padding: 12, borderRadius: 8, background: 'var(--surface-2, var(--surface))', border: '1px solid var(--border)' }}>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 4 }}>Popis</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{ticket.description}</div>
            </div>
          )}
        </div>
      )}

      {/* ── ITEMS TAB ────────────────────────────────────────────── */}
      {tab === 'items' && (
        <div>
          {items.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginBottom: 16 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 500 }} className="text-muted">Popis</th>
                  <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 500, width: 70 }} className="text-muted">MJ</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 500, width: 60 }} className="text-muted">Počet</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 500, width: 90 }} className="text-muted">Cena/MJ</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 500, width: 90 }} className="text-muted">Celkem</th>
                  <th style={{ width: 36 }} />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 0' }}>{item.description}</td>
                    <td style={{ padding: '8px 0' }}>{item.unit || '—'}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'monospace' }}>{item.quantity}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'monospace' }}>{item.unitPrice.toFixed(2)}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{item.totalPrice.toFixed(2)}</td>
                    <td style={{ padding: '8px 0', textAlign: 'center' }}>
                      <button
                        onClick={() => removeItemMutation.mutate({ ticketId: ticket.id, itemId: item.id })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}
                        title="Smazat"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)' }}>
                  <td colSpan={4} style={{ padding: '8px 0', fontWeight: 600, textAlign: 'right' }}>Celkem:</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{itemsTotal.toFixed(2)} Kč</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}

          <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 10 }}>Přidat položku</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <label className="form-label">Popis *</label>
                <input value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} style={inputStyle} placeholder="Popis práce / materiálu" />
              </div>
              <div>
                <label className="form-label">MJ</label>
                <input value={itemUnit} onChange={(e) => setItemUnit(e.target.value)} style={inputStyle} placeholder="ks, hod, m" />
              </div>
              <div>
                <label className="form-label">Počet</label>
                <input type="number" value={itemQty} onChange={(e) => setItemQty(e.target.value)} style={inputStyle} min="0" step="0.01" />
              </div>
              <div>
                <label className="form-label">Cena/MJ</label>
                <input type="number" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} style={inputStyle} min="0" step="0.01" />
              </div>
            </div>
            <Button size="sm" variant="primary" onClick={handleAddItem} disabled={addItemMutation.isPending || !itemDesc.trim()}>
              {addItemMutation.isPending ? 'Přidávám...' : 'Přidat'}
            </Button>
          </div>
        </div>
      )}

      {/* ── ATTACHMENTS TAB ──────────────────────────────────────── */}
      {tab === 'attachments' && (
        <div>
          {/* Upload zone */}
          <div style={{
            border: '2px dashed var(--border)', borderRadius: 10,
            padding: 20, textAlign: 'center', marginBottom: 16,
          }}>
            <Upload size={28} style={{ color: 'var(--text-muted)', marginBottom: 6 }} />
            <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 8 }}>
              {uploading ? 'Nahrávám...' : 'Přetáhněte soubory nebo klikněte'}
            </div>
            <label style={{ cursor: 'pointer' }}>
              <input
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.gif,.txt,.csv"
                disabled={uploading}
              />
              <Button size="sm" onClick={() => {}} disabled={uploading}>
                <Paperclip size={14} style={{ marginRight: 4 }} />
                Přidat přílohu
              </Button>
            </label>
            <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 6 }}>
              PDF, DOCX, XLSX, JPG, PNG (max 20 MB)
            </div>
            {uploadError && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 6 }}>{uploadError}</div>}
          </div>

          {/* List of attached documents */}
          {docs.length === 0 ? (
            <div className="text-muted" style={{ textAlign: 'center', padding: 24, fontSize: '0.9rem' }}>
              K požadavku zatím nejsou přiložené žádné soubory.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {docs.map((doc) => {
                const isImage = doc.mimeType.startsWith('image/');
                return (
                  <div key={doc.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--surface)',
                  }}>
                    {isImage && (
                      <img
                        src={doc.url}
                        alt={doc.name}
                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }}
                      />
                    )}
                    {!isImage && (
                      <Paperclip size={20} style={{ color: 'var(--text-muted)' }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.name}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                        {formatFileSize(doc.size)} · {new Date(doc.createdAt).toLocaleDateString('cs-CZ')}
                      </div>
                    </div>
                    <a
                      href={documentsApi.downloadUrl(doc.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: 'none' }}
                    >
                      <Button size="sm">Stáhnout</Button>
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PROTOCOL TAB ─────────────────────────────────────────── */}
      {tab === 'protocol' && (
        <ProtocolPanel sourceType="helpdesk" sourceId={ticket.id} />
      )}
    </Modal>
  );
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('cs-CZ')} ${d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{value}</div>
    </div>
  );
}
