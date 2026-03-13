import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal, Badge, Button, LoadingState } from '../../shared/components';
import type { BadgeVariant } from '../../shared/components';
import { useTicket, useUpdateTicket, useAddTicketItem, useRemoveTicketItem, useSaveProtocol } from './api/helpdesk.queries';
import type { ApiTicketItem } from './api/helpdesk.api';

interface Props {
  ticketId: string;
  onClose: () => void;
  onDelete?: () => void;
}

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

type TabKey = 'detail' | 'items' | 'protocol';

export default function TicketDetailModal({ ticketId, onClose, onDelete }: Props) {
  const { data: ticket, isLoading } = useTicket(ticketId);
  const updateMutation = useUpdateTicket();
  const addItemMutation = useAddTicketItem();
  const removeItemMutation = useRemoveTicketItem();
  const saveProtocolMutation = useSaveProtocol();

  const [tab, setTab] = useState<TabKey>('detail');
  const [editing, setEditing] = useState(false);
  const [editPriority, setEditPriority] = useState('');
  const [editAssignee, setEditAssignee] = useState('');

  // Item form
  const [itemDesc, setItemDesc] = useState('');
  const [itemUnit, setItemUnit] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemPrice, setItemPrice] = useState('0');

  // Protocol form
  const [protoWorker, setProtoWorker] = useState('');
  const [protoClient, setProtoClient] = useState('');
  const [protoNote, setProtoNote] = useState('');

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
    setEditPriority(ticket.priority);
    setEditAssignee(ticket.assigneeId ?? '');
    setEditing(true);
  };

  const handleSaveEdit = () => {
    updateMutation.mutate(
      { id: ticket.id, dto: { priority: editPriority, assigneeId: editAssignee || undefined } },
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

  const handleSaveProtocol = () => {
    saveProtocolMutation.mutate({
      ticketId: ticket.id,
      dto: {
        workerName: protoWorker || undefined,
        clientName: protoClient || undefined,
        note: protoNote || undefined,
      },
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))',
    color: 'var(--text)', boxSizing: 'border-box',
  };

  const tabItems: { key: TabKey; label: string }[] = [
    { key: 'detail', label: 'Detail' },
    { key: 'items', label: `Položky (${items.length})` },
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
      <div className="tabs" style={{ marginBottom: 16 }}>
        {tabItems.map((t) => (
          <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <InfoField label="Nemovitost" value={ticket.property?.name ?? '—'} />
            <InfoField label="Jednotka" value={ticket.unit?.name ?? '—'} />
            <InfoField
              label="Nahlásil"
              value={ticket.resident ? `${ticket.resident.firstName} ${ticket.resident.lastName}` : '—'}
            />
            <div>
              <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Řešitel</div>
              {editing ? (
                <input value={editAssignee} onChange={(e) => setEditAssignee(e.target.value)} style={inputStyle} placeholder="ID řešitele" />
              ) : (
                <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{ticket.assignee?.name ?? '—'}</div>
              )}
            </div>
            <InfoField label="Vytvořeno" value={new Date(ticket.createdAt).toLocaleDateString('cs-CZ')} />
            {ticket.resolvedAt && (
              <InfoField label="Vyřešeno" value={new Date(ticket.resolvedAt).toLocaleDateString('cs-CZ')} />
            )}
            <div>
              <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priorita</div>
              {editing ? (
                <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)} style={inputStyle}>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              ) : (
                <Badge variant={PRIO_COLOR[ticket.priority] || 'muted'}>{PRIORITY_LABELS[ticket.priority] || ticket.priority}</Badge>
              )}
            </div>
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
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="primary" size="sm" onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Ukládám...' : 'Uložit'}
                </Button>
                <Button size="sm" onClick={() => setEditing(false)}>Zrušit</Button>
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

      {/* ── PROTOCOL TAB ─────────────────────────────────────────── */}
      {tab === 'protocol' && (
        <div>
          {ticket.protocol ? (
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>{ticket.protocol.number}</span>
                <Badge variant="green">Vytvořen</Badge>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.85rem' }}>
                <InfoField label="Pracovník" value={ticket.protocol.workerName ?? '—'} />
                <InfoField label="Klient" value={ticket.protocol.clientName ?? '—'} />
                {ticket.protocol.note && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 2 }}>Poznámka</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{ticket.protocol.note}</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-muted" style={{ textAlign: 'center', padding: 16, marginBottom: 16 }}>
              Protokol dosud nebyl vytvořen.
            </div>
          )}

          <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 10 }}>
              {ticket.protocol ? 'Aktualizovat protokol' : 'Vytvořit protokol'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
              <div>
                <label className="form-label">Pracovník</label>
                <input value={protoWorker} onChange={(e) => setProtoWorker(e.target.value)} style={inputStyle} placeholder="Jméno pracovníka" />
              </div>
              <div>
                <label className="form-label">Klient</label>
                <input value={protoClient} onChange={(e) => setProtoClient(e.target.value)} style={inputStyle} placeholder="Jméno klienta" />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label className="form-label">Poznámka</label>
              <textarea value={protoNote} onChange={(e) => setProtoNote(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} placeholder="Poznámka k protokolu..." />
            </div>
            <Button size="sm" variant="primary" onClick={handleSaveProtocol} disabled={saveProtocolMutation.isPending}>
              {saveProtocolMutation.isPending ? 'Ukládám...' : ticket.protocol ? 'Aktualizovat' : 'Vytvořit protokol'}
            </Button>
            {saveProtocolMutation.isError && (
              <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 8 }}>Nepodařilo se uložit protokol.</div>
            )}
          </div>
        </div>
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
