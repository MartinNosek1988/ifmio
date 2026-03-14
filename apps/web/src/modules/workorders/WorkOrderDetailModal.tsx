import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Paperclip, Upload } from 'lucide-react';
import { Modal, Badge, Button } from '../../shared/components';
import type { BadgeVariant } from '../../shared/components';
import { useChangeWOStatus, useAddWOComment, useUpdateWorkOrder } from './api/workorders.queries';
import type { ApiWorkOrder, WOStatus } from './api/workorders.api';
import { formatCzDate, formatKc } from '../../shared/utils/format';
import { WO_STATUS_LABELS, WO_PRIORITY_LABELS, label } from '../../constants/labels';
import { apiClient } from '../../core/api/client';
import { documentsApi, formatFileSize } from '../documents/api/documents.api';
import { SlaProgressBar } from './SlaProgressBar';
import ProtocolPanel from '../protocols/ProtocolPanel';

interface TenantUser { id: string; name: string; email: string; role: string; isActive: boolean }
interface AssetOption { id: string; name: string; location: string | null }
interface DocItem { id: string; name: string; originalName: string; mimeType: string; size: number; url: string; createdAt: string }

interface Props {
  workOrder: ApiWorkOrder;
  onClose: () => void;
  onUpdated: () => void;
}

const STATUS_COLOR: Record<string, BadgeVariant> = { nova: 'blue', v_reseni: 'yellow', vyresena: 'green', uzavrena: 'muted', zrusena: 'red' };
const PRIO_COLOR: Record<string, BadgeVariant> = { nizka: 'muted', normalni: 'blue', vysoka: 'yellow', kriticka: 'red' };

const STAV_TRANSITIONS: Record<WOStatus, { status: WOStatus; label: string; variant?: 'primary' }[]> = {
  nova: [{ status: 'v_reseni', label: 'Zahájit', variant: 'primary' }, { status: 'zrusena', label: 'Zrušit' }],
  v_reseni: [{ status: 'vyresena', label: 'Vyřešit', variant: 'primary' }, { status: 'nova', label: 'Zpět' }, { status: 'zrusena', label: 'Zrušit' }],
  vyresena: [{ status: 'uzavrena', label: 'Uzavřít', variant: 'primary' }, { status: 'v_reseni', label: 'Znovu otevřít' }],
  uzavrena: [],
  zrusena: [{ status: 'nova', label: 'Obnovit' }],
};

type TabKey = 'detail' | 'attachments' | 'protocol' | 'komentare';

export default function WorkOrderDetailModal({ workOrder, onClose, onUpdated }: Props) {
  const changeStatusMutation = useChangeWOStatus();
  const addCommentMutation = useAddWOComment();
  const updateMutation = useUpdateWorkOrder();

  const [tab, setTab] = useState<TabKey>('detail');
  const [komentarText, setKomentarText] = useState('');
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editData, setEditData] = useState({
    assigneeUserId: workOrder.assigneeUserId || '',
    dispatcherUserId: workOrder.dispatcherUserId || '',
    assetId: workOrder.assetId || '',
    priority: workOrder.priority,
    deadline: workOrder.deadline ? workOrder.deadline.slice(0, 10) : '',
    estimatedHours: workOrder.estimatedHours?.toString() || '',
    laborCost: workOrder.laborCost?.toString() || '',
    materialCost: workOrder.materialCost?.toString() || '',
  });

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

  const { data: docsData, refetch: refetchDocs } = useQuery<{ data: DocItem[] }>({
    queryKey: ['documents', 'work_order', workOrder.id],
    queryFn: () => apiClient.get('/documents', { params: { entityType: 'work_order', entityId: workOrder.id, limit: 50 } }).then((r) => r.data),
  });
  const docs = docsData?.data ?? [];

  const transitions = STAV_TRANSITIONS[workOrder.status] || [];
  const comments = workOrder.comments ?? [];
  const ticketNum = workOrder.helpdeskTicket ? `HD-${String(workOrder.helpdeskTicket.number).padStart(4, '0')}` : null;

  const handleTransition = (status: WOStatus) => {
    changeStatusMutation.mutate({ id: workOrder.id, status }, { onSuccess: () => onUpdated() });
  };

  const handleAddComment = () => {
    if (!komentarText.trim()) return;
    addCommentMutation.mutate({ id: workOrder.id, text: komentarText.trim() }, {
      onSuccess: () => { setKomentarText(''); onUpdated(); },
    });
  };

  const startEdit = () => {
    setEditData({
      assigneeUserId: workOrder.assigneeUserId || '',
      dispatcherUserId: workOrder.dispatcherUserId || '',
      assetId: workOrder.assetId || '',
      priority: workOrder.priority,
      deadline: workOrder.deadline ? workOrder.deadline.slice(0, 10) : '',
      estimatedHours: workOrder.estimatedHours?.toString() || '',
      laborCost: workOrder.laborCost?.toString() || '',
      materialCost: workOrder.materialCost?.toString() || '',
    });
    setEditing(true);
  };

  const handleSaveEdit = () => {
    updateMutation.mutate({
      id: workOrder.id,
      dto: {
        assigneeUserId: editData.assigneeUserId || undefined,
        dispatcherUserId: editData.dispatcherUserId || undefined,
        assetId: editData.assetId || undefined,
        priority: editData.priority,
        deadline: editData.deadline || undefined,
        estimatedHours: editData.estimatedHours ? Number(editData.estimatedHours) : undefined,
        laborCost: editData.laborCost ? Number(editData.laborCost) : undefined,
        materialCost: editData.materialCost ? Number(editData.materialCost) : undefined,
      },
    }, { onSuccess: () => { setEditing(false); onUpdated(); } });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await documentsApi.upload(file, {
          name: file.name,
          category: file.type.startsWith('image/') ? 'photo' : 'other',
          entityType: 'work_order',
          entityId: workOrder.id,
        });
      }
      refetchDocs();
    } catch { /* best-effort */ } finally {
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
    { key: 'attachments', label: `Přílohy (${docs.length})` },
    { key: 'protocol', label: 'Protokol' },
    { key: 'komentare', label: `Komentáře (${comments.length})` },
  ];

  return (
    <Modal open onClose={onClose} wide
      title={workOrder.title}
      subtitle={<span>{workOrder.property?.name || ''}{workOrder.unit?.name ? ` · ${workOrder.unit.name}` : ''}</span>}
      footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button onClick={onClose}>Zavřít</Button></div>}>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Badge variant={STATUS_COLOR[workOrder.status] || 'muted'}>{label(WO_STATUS_LABELS, workOrder.status)}</Badge>
        <Badge variant={PRIO_COLOR[workOrder.priority] || 'muted'}>{label(WO_PRIORITY_LABELS, workOrder.priority)}</Badge>
        <div style={{ flex: 1, minWidth: 120 }}>
          <SlaProgressBar created={workOrder.createdAt} deadline={workOrder.deadline || ''} status={workOrder.status} />
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        {tabItems.map(t => (
          <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* ── DETAIL ──────────────────────────────────────────────── */}
      {tab === 'detail' && (
        <div>
          {transitions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 6 }}>Změnit stav:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {transitions.map(t => (
                  <Button key={t.status} size="sm" variant={t.variant} onClick={() => handleTransition(t.status)} disabled={changeStatusMutation.isPending}>
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <InfoCell label="Datum vytvoření" value={formatCzDate(workOrder.createdAt)} />
            <InfoCell label="Termín realizace" value={workOrder.deadline ? formatCzDate(workOrder.deadline) : undefined} />
            {workOrder.completedAt && <InfoCell label="Dokončeno dne" value={formatCzDate(workOrder.completedAt)} />}
            <InfoCell label="Zařízení" value={workOrder.asset?.name || 'Úkol není navázán na žádné zařízení.'} />
          </div>

          {/* Linked helpdesk request */}
          {workOrder.helpdeskTicket && (
            <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, background: 'var(--surface-2, var(--surface))', border: '1px solid var(--border)' }}>
              <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Navázaný požadavek</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                {ticketNum} — {workOrder.helpdeskTicket.title}
                <Badge variant={workOrder.helpdeskTicket.status === 'resolved' || workOrder.helpdeskTicket.status === 'closed' ? 'green' : 'blue'} >
                  {workOrder.helpdeskTicket.status}
                </Badge>
              </div>
            </div>
          )}

          {/* Responsibility */}
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: 'var(--surface-2, var(--surface))', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 10 }}>Odpovědnost</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <InfoCell label="Řešitel úkolu" value={workOrder.assigneeUser?.name || workOrder.assignee || 'Řešitel zatím není přiřazen.'} />
              <InfoCell label="Dispečer úkolu" value={workOrder.dispatcherUser?.name || undefined} />
              <InfoCell label="Zadavatel" value={workOrder.requesterUser?.name || workOrder.requester || undefined} />
            </div>
          </div>

          {/* Editable section */}
          {!editing ? (
            <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 8 }}>
                <InfoCell label="Odhad (hod)" value={workOrder.estimatedHours?.toString()} />
                <InfoCell label="Skutečné (hod)" value={workOrder.actualHours?.toString()} />
                <InfoCell label="Náklady celkem" value={workOrder.totalCost != null ? formatKc(workOrder.totalCost) : undefined} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <Button size="sm" onClick={startEdit}>Upravit</Button>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label className="form-label">Řešitel úkolu</label>
                  <select value={editData.assigneeUserId} onChange={e => setEditData(d => ({ ...d, assigneeUserId: e.target.value }))} style={inputStyle}>
                    <option value="">— bez řešitele —</option>
                    {activeUsers.map((u: TenantUser) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Dispečer úkolu</label>
                  <select value={editData.dispatcherUserId} onChange={e => setEditData(d => ({ ...d, dispatcherUserId: e.target.value }))} style={inputStyle}>
                    <option value="">— bez dispečera —</option>
                    {activeUsers.map((u: TenantUser) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Zařízení</label>
                  <select value={editData.assetId} onChange={e => setEditData(d => ({ ...d, assetId: e.target.value }))} style={inputStyle}>
                    <option value="">— bez zařízení —</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.name}{a.location ? ` (${a.location})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Priorita</label>
                  <select value={editData.priority} onChange={e => setEditData(d => ({ ...d, priority: e.target.value as typeof d.priority }))} style={inputStyle}>
                    {Object.entries(WO_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Termín realizace</label>
                  <input type="date" value={editData.deadline} onChange={e => setEditData(d => ({ ...d, deadline: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label className="form-label">Odhad (hod)</label>
                  <input type="number" min="0" value={editData.estimatedHours} onChange={e => setEditData(d => ({ ...d, estimatedHours: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label className="form-label">Náklady práce (Kč)</label>
                  <input type="number" min="0" value={editData.laborCost} onChange={e => setEditData(d => ({ ...d, laborCost: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label className="form-label">Materiál (Kč)</label>
                  <input type="number" min="0" value={editData.materialCost} onChange={e => setEditData(d => ({ ...d, materialCost: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <Button size="sm" onClick={() => setEditing(false)}>Zrušit</Button>
                <Button size="sm" variant="primary" onClick={handleSaveEdit} disabled={updateMutation.isPending}>Uložit</Button>
              </div>
            </div>
          )}

          {workOrder.description && (
            <div style={{ padding: 12, borderRadius: 8, background: 'var(--surface-2, var(--surface))', border: '1px solid var(--border)' }}>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 4 }}>Popis</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{workOrder.description}</div>
            </div>
          )}
        </div>
      )}

      {/* ── ATTACHMENTS ─────────────────────────────────────────── */}
      {tab === 'attachments' && (
        <div>
          <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: 20, textAlign: 'center', marginBottom: 16 }}>
            <Upload size={28} style={{ color: 'var(--text-muted)', marginBottom: 6 }} />
            <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 8 }}>{uploading ? 'Nahrávám...' : 'Přetáhněte soubory nebo klikněte'}</div>
            <label style={{ cursor: 'pointer' }}>
              <input type="file" multiple style={{ display: 'none' }} onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.gif,.txt,.csv" disabled={uploading} />
              <Button size="sm" onClick={() => {}} disabled={uploading}><Paperclip size={14} style={{ marginRight: 4 }} />Přidat přílohu</Button>
            </label>
            <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 6 }}>PDF, DOCX, XLSX, JPG, PNG (max 20 MB)</div>
          </div>
          {docs.length === 0 ? (
            <div className="text-muted" style={{ textAlign: 'center', padding: 24, fontSize: '0.9rem' }}>K úkolu zatím nejsou přiložené žádné soubory.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {docs.map(doc => {
                const isImage = doc.mimeType.startsWith('image/');
                return (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                    {isImage ? <img src={doc.url} alt={doc.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} /> : <Paperclip size={20} style={{ color: 'var(--text-muted)' }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                      <div className="text-muted" style={{ fontSize: '0.78rem' }}>{formatFileSize(doc.size)} · {new Date(doc.createdAt).toLocaleDateString('cs-CZ')}</div>
                    </div>
                    <a href={documentsApi.downloadUrl(doc.id)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}><Button size="sm">Stáhnout</Button></a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PROTOCOL ────────────────────────────────────────────── */}
      {tab === 'protocol' && (
        <ProtocolPanel sourceType="work_order" sourceId={workOrder.id} />
      )}

      {/* ── COMMENTS ────────────────────────────────────────────── */}
      {tab === 'komentare' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <textarea value={komentarText} onChange={e => setKomentarText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
              placeholder="Přidat komentář... (Enter)" rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} />
            <div style={{ marginTop: 8 }}>
              <Button variant="primary" size="sm" onClick={handleAddComment} disabled={addCommentMutation.isPending}>Odeslat</Button>
            </div>
          </div>
          {comments.length === 0 ? (
            <div className="text-muted" style={{ textAlign: 'center', padding: 24 }}>Žádné komentáře</div>
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
      <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
}
