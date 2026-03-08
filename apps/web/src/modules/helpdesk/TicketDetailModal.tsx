import { useState } from 'react';
import { Modal, Badge, Button } from '../../shared/components';
import type { BadgeVariant } from '../../shared/components';
import { useHelpdeskStore } from './helpdesk-store';
import { loadFromStorage } from '../../core/storage';
import { formatCzDate } from '../../shared/utils/format';
import { TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS, label } from '../../constants/labels';
import type { Ticket, TicketStatus } from '../../shared/schema/ticket';

interface Props {
  ticket: Ticket;
  onClose: () => void;
  onUpdated: () => void;
}

type R = Record<string, unknown>;

const STATUS_COLOR: Record<string, BadgeVariant> = {
  new: 'blue', open: 'blue', in_progress: 'yellow', resolved: 'green', closed: 'muted', cancelled: 'red',
};
const PRIO_COLOR: Record<string, BadgeVariant> = {
  low: 'muted', medium: 'blue', high: 'yellow', critical: 'red',
};

export default function TicketDetailModal({ ticket, onClose, onUpdated }: Props) {
  const { transition, addComment, update, getAllowedTransitions } = useHelpdeskStore();
  const [tab, setTab] = useState<'detail' | 'comments'>('detail');
  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ assigned_user_id: ticket.assigned_user_id || '', priority: ticket.priority });

  const properties = loadFromStorage<R[]>('estateos_properties', []);
  const units = loadFromStorage<R[]>('estateos_units', []);

  const propName = (() => {
    const p = properties.find(x => String(x.id) === String(ticket.property_id));
    return String(p?.nazev || p?.name || '—');
  })();

  const unitLabel = (() => {
    if (!ticket.unit_id) return null;
    const u = units.find(x => String(x.id) === String(ticket.unit_id));
    return u ? String(u.cislo || u.id) : null;
  })();

  const allowed = getAllowedTransitions(ticket.status);
  const extra = ticket as R;

  const handleTransition = (status: TicketStatus) => {
    transition(ticket.id, status);
    onUpdated();
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    addComment(ticket.id, commentText.trim(), isInternal);
    setCommentText('');
    onUpdated();
  };

  const handleSaveEdit = () => {
    update(ticket.id, { assigned_user_id: editData.assigned_user_id || undefined, priority: editData.priority });
    setEditing(false);
    onUpdated();
  };

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', color: 'var(--text)', boxSizing: 'border-box' as const };

  const tabs = ['detail', 'comments'] as const;
  const tabLabels = { detail: 'Detail', comments: `Komentáře (${ticket.komentare.length})` };

  return (
    <Modal open onClose={onClose} wide
      title={<span>{String(extra.cisloProtokolu || '')} {ticket.title}</span>}
      subtitle={<span>{propName}{unitLabel ? ` · Jednotka ${unitLabel}` : ''}</span>}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zavřít</Button>
        </div>
      }>

      <div className="tabs" style={{ marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {tab === 'detail' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <Badge variant={STATUS_COLOR[ticket.status] || 'muted'}>{label(TICKET_STATUS_LABELS, ticket.status)}</Badge>
            <Badge variant={PRIO_COLOR[ticket.priority] || 'muted'}>{label(TICKET_PRIORITY_LABELS, ticket.priority)}</Badge>
            {ticket.kategorie && <Badge variant="blue">{ticket.kategorie}</Badge>}
          </div>

          {allowed.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Změnit stav:</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {allowed.map(s => (
                  <Button key={s} size="sm" variant={s === 'resolved' || s === 'closed' ? 'primary' : undefined}
                    onClick={() => handleTransition(s)}>
                    {label(TICKET_STATUS_LABELS, s)}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 2 }}>Zadavatel</div>
              <div>{String(extra.zadavatel || ticket.reporter_person_id || '—')}</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 2 }}>Řešitel</div>
              {editing ? (
                <input value={editData.assigned_user_id} onChange={e => setEditData(d => ({ ...d, assigned_user_id: e.target.value }))} style={inputStyle} placeholder="ID nebo jméno řešitele" />
              ) : (
                <div>{ticket.assigned_user_id || '—'}</div>
              )}
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 2 }}>Vytvořeno</div>
              <div>{formatCzDate(ticket.created_date)}</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 2 }}>Termín</div>
              <div>{ticket.due_date ? formatCzDate(ticket.due_date) : '—'}</div>
            </div>
            {ticket.resolved_date && (
              <div>
                <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 2 }}>Vyřešeno</div>
                <div>{formatCzDate(ticket.resolved_date)}</div>
              </div>
            )}
            <div>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 2 }}>Priorita</div>
              {editing ? (
                <select value={editData.priority} onChange={e => setEditData(d => ({ ...d, priority: e.target.value as typeof d.priority }))} style={inputStyle}>
                  {Object.entries(TICKET_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              ) : (
                <Badge variant={PRIO_COLOR[ticket.priority] || 'muted'}>{label(TICKET_PRIORITY_LABELS, ticket.priority)}</Badge>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            {editing ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="primary" size="sm" onClick={handleSaveEdit}>Uložit</Button>
                <Button size="sm" onClick={() => setEditing(false)}>Zrušit</Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setEditing(true)}>Upravit</Button>
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

      {tab === 'comments' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
              placeholder="Napište komentář..." rows={3}
              style={{ ...inputStyle, resize: 'vertical' as const }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <Button variant="primary" size="sm" onClick={handleAddComment}>Přidat komentář</Button>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} />
                Interní
              </label>
            </div>
          </div>

          {ticket.komentare.length === 0 ? (
            <div className="text-muted" style={{ textAlign: 'center', padding: 24 }}>Žádné komentáře</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...ticket.komentare].reverse().map(c => (
                <div key={c.id} style={{ padding: 12, borderRadius: 8, background: c.is_internal ? 'var(--surface-3, var(--surface-2, var(--surface)))' : 'var(--surface-2, var(--surface))', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.author_user_id}</span>
                    <span className="text-muted text-sm">{formatCzDate(c.created_at)}{c.is_internal ? ' · Interní' : ''}</span>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{c.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
