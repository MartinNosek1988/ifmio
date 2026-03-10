import { useState } from 'react';
import { Modal, Badge, Button } from '../../shared/components';
import type { BadgeVariant } from '../../shared/components';
import { useChangeWOStatus, useAddWOComment, useUpdateWorkOrder } from './api/workorders.queries';
import type { ApiWorkOrder, WOStatus } from './api/workorders.api';
import { formatCzDate, formatKc } from '../../shared/utils/format';
import { WO_STATUS_LABELS, WO_PRIORITY_LABELS, label } from '../../constants/labels';
import { SlaProgressBar } from './SlaProgressBar';

interface Props {
  workOrder: ApiWorkOrder;
  onClose: () => void;
  onUpdated: () => void;
}

const STATUS_COLOR: Record<string, BadgeVariant> = { nova: 'blue', v_reseni: 'yellow', vyresena: 'green', uzavrena: 'muted', zrusena: 'red' };
const PRIO_COLOR: Record<string, BadgeVariant> = { nizka: 'muted', normalni: 'blue', vysoka: 'yellow', kriticka: 'red' };

const STAV_TRANSITIONS: Record<WOStatus, { status: WOStatus; label: string; variant?: 'primary' }[]> = {
  nova: [{ status: 'v_reseni', label: 'Zahajit', variant: 'primary' }, { status: 'zrusena', label: 'Zrusit' }],
  v_reseni: [{ status: 'vyresena', label: 'Vyresit', variant: 'primary' }, { status: 'nova', label: 'Zpet' }, { status: 'zrusena', label: 'Zrusit' }],
  vyresena: [{ status: 'uzavrena', label: 'Uzavrit', variant: 'primary' }, { status: 'v_reseni', label: 'Znovu otevrit' }],
  uzavrena: [],
  zrusena: [{ status: 'nova', label: 'Obnovit' }],
};

export default function WorkOrderDetailModal({ workOrder, onClose, onUpdated }: Props) {
  const changeStatusMutation = useChangeWOStatus();
  const addCommentMutation = useAddWOComment();
  const updateMutation = useUpdateWorkOrder();

  const [tab, setTab] = useState<'detail' | 'komentare'>('detail');
  const [komentarText, setKomentarText] = useState('');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    assignee: workOrder.assignee || '',
    priority: workOrder.priority,
    deadline: workOrder.deadline ? workOrder.deadline.slice(0, 10) : '',
    estimatedHours: workOrder.estimatedHours?.toString() || '',
    laborCost: workOrder.laborCost?.toString() || '',
    materialCost: workOrder.materialCost?.toString() || '',
  });

  const propName = workOrder.property?.name || '';
  const unitName = workOrder.unit?.name || null;

  const transitions = STAV_TRANSITIONS[workOrder.status] || [];

  const handleTransition = (status: WOStatus) => {
    changeStatusMutation.mutate({ id: workOrder.id, status }, { onSuccess: () => onUpdated() });
  };

  const handleAddComment = () => {
    if (!komentarText.trim()) return;
    addCommentMutation.mutate({ id: workOrder.id, text: komentarText.trim() }, {
      onSuccess: () => { setKomentarText(''); onUpdated(); },
    });
  };

  const handleSaveEdit = () => {
    updateMutation.mutate({
      id: workOrder.id,
      dto: {
        assignee: editData.assignee || undefined,
        priority: editData.priority,
        deadline: editData.deadline || undefined,
        estimatedHours: editData.estimatedHours ? Number(editData.estimatedHours) : undefined,
        laborCost: editData.laborCost ? Number(editData.laborCost) : undefined,
        materialCost: editData.materialCost ? Number(editData.materialCost) : undefined,
      },
    }, { onSuccess: () => { setEditing(false); onUpdated(); } });
  };

  const comments = workOrder.comments ?? [];
  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', color: 'var(--text)', boxSizing: 'border-box' as const };

  const tabs = ['detail', 'komentare'] as const;
  const tabLabels = { detail: 'Detail', komentare: `Komentare (${comments.length})` };

  return (
    <Modal open onClose={onClose} wide
      title={workOrder.title}
      subtitle={<span>{propName}{unitName ? ` · ${unitName}` : ''}</span>}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zavrit</Button>
        </div>
      }>

      {/* Status + Priority + SLA */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Badge variant={STATUS_COLOR[workOrder.status] || 'muted'}>{label(WO_STATUS_LABELS, workOrder.status)}</Badge>
        <Badge variant={PRIO_COLOR[workOrder.priority] || 'muted'}>{label(WO_PRIORITY_LABELS, workOrder.priority)}</Badge>
        <div style={{ flex: 1, minWidth: 120 }}>
          <SlaProgressBar created={workOrder.createdAt} deadline={workOrder.deadline || ''} status={workOrder.status} />
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {tab === 'detail' && (
        <div>
          {/* State transition buttons */}
          {transitions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 6 }}>Zmenit stav:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {transitions.map(t => (
                  <Button key={t.status} size="sm" variant={t.variant} onClick={() => handleTransition(t.status)}
                    disabled={changeStatusMutation.isPending}>
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <InfoCell label="Vytvoreno" value={formatCzDate(workOrder.createdAt)} />
            <InfoCell label="Termin" value={workOrder.deadline ? formatCzDate(workOrder.deadline) : undefined} />
            {workOrder.completedAt && <InfoCell label="Uzavreno" value={formatCzDate(workOrder.completedAt)} />}
            <InfoCell label="Zadavatel" value={workOrder.requester || undefined} />
          </div>

          {/* Editable section */}
          {!editing ? (
            <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 8 }}>
                <InfoCell label="Resitel" value={workOrder.assignee || undefined} />
                <InfoCell label="Priorita" value={label(WO_PRIORITY_LABELS, workOrder.priority)} />
                <InfoCell label="Odhad (hod)" value={workOrder.estimatedHours?.toString()} />
                <InfoCell label="Naklady" value={workOrder.totalCost != null ? formatKc(workOrder.totalCost) : undefined} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <Button size="sm" onClick={() => setEditing(true)}>Upravit</Button>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label className="form-label">Resitel</label>
                  <input value={editData.assignee} onChange={e => setEditData(d => ({ ...d, assignee: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label className="form-label">Termin</label>
                  <input type="date" value={editData.deadline} onChange={e => setEditData(d => ({ ...d, deadline: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label className="form-label">Priorita</label>
                  <select value={editData.priority} onChange={e => setEditData(d => ({ ...d, priority: e.target.value as typeof d.priority }))} style={inputStyle}>
                    {Object.entries(WO_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Odhad (hod)</label>
                  <input type="number" min="0" value={editData.estimatedHours} onChange={e => setEditData(d => ({ ...d, estimatedHours: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label className="form-label">Naklady prace (Kc)</label>
                  <input type="number" min="0" value={editData.laborCost} onChange={e => setEditData(d => ({ ...d, laborCost: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label className="form-label">Material (Kc)</label>
                  <input type="number" min="0" value={editData.materialCost} onChange={e => setEditData(d => ({ ...d, materialCost: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <Button size="sm" onClick={() => setEditing(false)}>Zrusit</Button>
                <Button size="sm" variant="primary" onClick={handleSaveEdit} disabled={updateMutation.isPending}>Ulozit</Button>
              </div>
            </div>
          )}

          {/* Description */}
          {workOrder.description && (
            <div style={{ padding: 12, borderRadius: 8, background: 'var(--surface-2, var(--surface))', border: '1px solid var(--border)' }}>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 4 }}>Popis</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{workOrder.description}</div>
            </div>
          )}
        </div>
      )}

      {tab === 'komentare' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <textarea value={komentarText} onChange={e => setKomentarText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
              placeholder="Pridat komentar... (Enter)" rows={3}
              style={{ ...inputStyle, resize: 'vertical' as const }} />
            <div style={{ marginTop: 8 }}>
              <Button variant="primary" size="sm" onClick={handleAddComment} disabled={addCommentMutation.isPending}>Odeslat</Button>
            </div>
          </div>

          {comments.length === 0 ? (
            <div className="text-muted" style={{ textAlign: 'center', padding: 24 }}>Zadne komentare</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {comments.map(k => (
                <div key={k.id} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                    {k.author.split(' ').map(w => w[0] || '').slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{k.author}</span>
                      <span className="text-muted text-sm">{formatCzDate(k.createdAt)}</span>
                    </div>
                    <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: '8px 12px', whiteSpace: 'pre-wrap' }}>{k.text}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function InfoCell({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
}
