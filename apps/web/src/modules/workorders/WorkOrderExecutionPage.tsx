import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Camera, FileText, MessageSquare, CheckCircle, ChevronLeft, Paperclip, Clock } from 'lucide-react';
import { Badge, Button, LoadingState } from '../../shared/components';
import type { BadgeVariant } from '../../shared/components';
import { useChangeWOStatus, useUpdateWorkOrder, useAddWOComment, useWorkOrderDetail } from './api/workorders.queries';
import type { ApiWorkOrder, CompletionStatus } from './api/workorders.api';
import { workOrdersApi } from './api/workorders.api';
import { WO_STATUS_LABELS, WO_PRIORITY_LABELS, label } from '../../constants/labels';
import { apiClient } from '../../core/api/client';
import { documentsApi, formatFileSize } from '../documents/api/documents.api';
import ProtocolPanel from '../protocols/ProtocolPanel';

const STATUS_COLOR: Record<string, BadgeVariant> = { nova: 'blue', v_reseni: 'yellow', vyresena: 'green', uzavrena: 'muted', zrusena: 'red' };
const PRIO_COLOR: Record<string, BadgeVariant> = { nizka: 'muted', normalni: 'blue', vysoka: 'yellow', kriticka: 'red' };

interface DocItem { id: string; name: string; mimeType: string; size: number; url: string; createdAt: string }

type Section = 'overview' | 'photos' | 'notes' | 'protocol' | 'complete';

export default function WorkOrderExecutionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: wo, isLoading, refetch } = useWorkOrderDetail(id ?? '');

  if (isLoading || !wo) return <LoadingState text="Načítání úkolu..." />;

  return <ExecutionView wo={wo} onRefresh={refetch} onBack={() => navigate('/my-agenda')} />;
}

function ExecutionView({ wo, onRefresh, onBack }: { wo: ApiWorkOrder; onRefresh: () => void; onBack: () => void }) {
  const [section, setSection] = useState<Section>('overview');
  const changeStatus = useChangeWOStatus();
  const updateWo = useUpdateWorkOrder();
  const addComment = useAddWOComment();

  // Completion form state
  const [actualHours, setActualHours] = useState(wo.actualHours?.toString() ?? '');
  const [workSummary, setWorkSummary] = useState(wo.workSummary ?? '');
  const [findings, setFindings] = useState(wo.findings ?? '');
  const [recommendation, setRecommendation] = useState(wo.recommendation ?? '');
  const [noteText, setNoteText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [completionError, setCompletionError] = useState<string[]>([]);

  // Completion requirements
  const { data: completionStatus, refetch: refetchCompletion } = useQuery<CompletionStatus>({
    queryKey: ['workorders', 'completion-status', wo.id],
    queryFn: () => workOrdersApi.completionStatus(wo.id),
    enabled: wo.status !== 'vyresena' && wo.status !== 'uzavrena',
  });
  const hasRequirements = wo.requirePhoto || wo.requireHours || wo.requireSummary || wo.requireProtocol;

  // Docs
  const { data: docsData, refetch: refetchDocs } = useQuery<{ data: DocItem[] }>({
    queryKey: ['documents', 'work_order', wo.id],
    queryFn: () => apiClient.get('/documents', { params: { entityType: 'work_order', entityId: wo.id, limit: 50 } }).then(r => r.data),
  });
  const docs = docsData?.data ?? [];
  const photos = docs.filter(d => d.mimeType.startsWith('image/'));

  const isActive = wo.status === 'nova' || wo.status === 'v_reseni';
  const isOverdue = isActive && wo.deadline && new Date(wo.deadline) < new Date();

  const handleStartWork = () => {
    if (wo.status === 'nova') {
      changeStatus.mutate({ id: wo.id, status: 'v_reseni' }, { onSuccess: () => onRefresh() });
    }
  };

  const handleComplete = () => {
    setCompletionError([]);
    // Save structured handover fields first, then complete
    const updates: Record<string, unknown> = {};
    if (actualHours) updates.actualHours = parseFloat(actualHours);
    if (workSummary.trim()) updates.workSummary = workSummary.trim();
    if (findings.trim()) updates.findings = findings.trim();
    if (recommendation.trim()) updates.recommendation = recommendation.trim();

    const doComplete = () => {
      changeStatus.mutate({ id: wo.id, status: 'vyresena' }, {
        onSuccess: () => { onRefresh(); refetchCompletion(); },
        onError: (err: any) => {
          const violations = err?.response?.data?.violations;
          if (Array.isArray(violations)) {
            setCompletionError(violations);
          } else {
            setCompletionError([err?.response?.data?.message ?? 'Dokončení selhalo.']);
          }
        },
      });
    };

    if (Object.keys(updates).length > 0) {
      updateWo.mutate({ id: wo.id, dto: updates }, { onSuccess: doComplete });
    } else {
      doComplete();
    }
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addComment.mutate({ id: wo.id, text: noteText.trim() }, {
      onSuccess: () => { setNoteText(''); setUploadMsg('Poznámka uložena.'); onRefresh(); },
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    setUploadMsg('');
    try {
      for (const file of Array.from(files)) {
        await documentsApi.upload(file, {
          name: file.name,
          category: file.type.startsWith('image/') ? 'photo' : 'other',
          entityType: 'work_order',
          entityId: wo.id,
        });
      }
      refetchDocs();
      setUploadMsg('Fotografie nahrána.');
    } catch {
      setUploadMsg('Nahrání selhalo.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const cardStyle: React.CSSProperties = {
    padding: 14, borderRadius: 12, background: 'var(--surface-2, var(--surface))',
    border: '1px solid var(--border)', marginBottom: 12,
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--text)', fontSize: '1rem', boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 100 }}>
      {/* Back button */}
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
        color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', marginBottom: 12, padding: 0,
      }}>
        <ChevronLeft size={16} /> Zpět na agendu
      </button>

      {/* Context card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <Badge variant={STATUS_COLOR[wo.status] ?? 'muted'}>{label(WO_STATUS_LABELS, wo.status)}</Badge>
          <Badge variant={PRIO_COLOR[wo.priority] ?? 'muted'}>{label(WO_PRIORITY_LABELS, wo.priority)}</Badge>
          {isOverdue && <Badge variant="red">Po termínu</Badge>}
        </div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>{wo.title}</h2>
        <div className="text-muted" style={{ fontSize: '0.82rem', lineHeight: 1.6 }}>
          {wo.property?.name && <div>Objekt: {wo.property.name}</div>}
          {wo.asset?.name && <div>Zařízení: {wo.asset.name}</div>}
          {wo.helpdeskTicket && <div>Požadavek: HD-{String(wo.helpdeskTicket.number).padStart(4, '0')} {wo.helpdeskTicket.title}</div>}
          {wo.deadline && <div>Termín: {new Date(wo.deadline).toLocaleDateString('cs-CZ')}</div>}
          {wo.assigneeUser?.name && <div>Řešitel: {wo.assigneeUser.name}</div>}
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' }}>
        {([
          { key: 'overview', label: 'Přehled', icon: <Clock size={14} /> },
          { key: 'photos', label: `Foto (${photos.length})`, icon: <Camera size={14} /> },
          { key: 'notes', label: 'Poznámky', icon: <MessageSquare size={14} /> },
          { key: 'protocol', label: 'Protokol', icon: <FileText size={14} /> },
          { key: 'complete', label: 'Dokončit', icon: <CheckCircle size={14} /> },
        ] as { key: Section; label: string; icon: React.ReactNode }[]).map(t => (
          <button key={t.key} onClick={() => setSection(t.key)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 8,
            border: section === t.key ? '2px solid var(--accent-blue, #6366f1)' : '1px solid var(--border)',
            background: section === t.key ? 'var(--accent-blue, #6366f1)' : 'var(--surface)',
            color: section === t.key ? '#fff' : 'var(--text)', cursor: 'pointer',
            fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', minHeight: 44,
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Success/info message */}
      {uploadMsg && (
        <div style={{ padding: '8px 12px', borderRadius: 8, background: '#065f4620', color: '#10b981', fontSize: '0.85rem', marginBottom: 12 }}>
          {uploadMsg}
        </div>
      )}

      {/* ── OVERVIEW ─────────────────────────────────────────── */}
      {section === 'overview' && (
        <div>
          {wo.status === 'nova' && (
            <Button variant="primary" onClick={handleStartWork} disabled={changeStatus.isPending}
              style={{ width: '100%', padding: '14px', fontSize: '1rem', marginBottom: 16 }}>
              {changeStatus.isPending ? 'Zahajuji...' : 'Zahájit práci'}
            </Button>
          )}

          {wo.description && (
            <div style={cardStyle}>
              <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 4 }}>Popis</div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{wo.description}</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div style={cardStyle}>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>Odhad</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{wo.estimatedHours ?? '—'} hod</div>
            </div>
            <div style={cardStyle}>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>Skutečně</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{wo.actualHours ?? '—'} hod</div>
            </div>
          </div>

          {/* Recent comments */}
          {wo.comments.length > 0 && (
            <div style={cardStyle}>
              <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 8 }}>Poslední poznámky</div>
              {wo.comments.slice(0, 3).map(c => (
                <div key={c.id} style={{ fontSize: '0.85rem', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600 }}>{c.author}:</span> {c.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PHOTOS ───────────────────────────────────────────── */}
      {section === 'photos' && (
        <div>
          <label style={{ cursor: 'pointer', display: 'block', marginBottom: 16 }}>
            <input type="file" multiple accept="image/*" capture="environment" onChange={handlePhotoUpload}
              style={{ display: 'none' }} disabled={uploading} />
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '16px', borderRadius: 12, border: '2px dashed var(--border)',
              background: 'var(--surface)', cursor: 'pointer', minHeight: 60,
            }}>
              <Camera size={22} style={{ color: 'var(--accent-blue, #6366f1)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                {uploading ? 'Nahrávám...' : 'Vyfotit / nahrát fotku'}
              </span>
            </div>
          </label>

          {photos.length === 0 ? (
            <div className="text-muted" style={{ textAlign: 'center', padding: 24, fontSize: '0.9rem' }}>
              Zatím nejsou nahrané žádné přílohy.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {photos.map(doc => (
                <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <img src={doc.url} alt={doc.name} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                    <div style={{ padding: '6px 8px', fontSize: '0.75rem' }} className="text-muted">
                      {formatFileSize(doc.size)} · {new Date(doc.createdAt).toLocaleDateString('cs-CZ')}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Non-image files */}
          {docs.filter(d => !d.mimeType.startsWith('image/')).length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 8 }}>Ostatní soubory</div>
              {docs.filter(d => !d.mimeType.startsWith('image/')).map(doc => (
                <div key={doc.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 8, border: '1px solid var(--border)', marginBottom: 6,
                }}>
                  <Paperclip size={16} className="text-muted" />
                  <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500 }}>{doc.name}</div>
                  <a href={documentsApi.downloadUrl(doc.id)} target="_blank" rel="noopener noreferrer">
                    <Button size="sm">Stáhnout</Button>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── NOTES ────────────────────────────────────────────── */}
      {section === 'notes' && (
        <div>
          <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
            placeholder="Zjištění, doporučení, poznámka..." rows={4} style={{ ...inputStyle, resize: 'vertical', marginBottom: 10 }} />
          <Button variant="primary" onClick={handleAddNote} disabled={addComment.isPending || !noteText.trim()}
            style={{ width: '100%', padding: '12px', marginBottom: 16 }}>
            {addComment.isPending ? 'Ukládám...' : 'Přidat poznámku'}
          </Button>

          {wo.comments.length === 0 ? (
            <div className="text-muted" style={{ textAlign: 'center', padding: 20 }}>Žádné poznámky</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {wo.comments.map(c => (
                <div key={c.id} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.author}</span>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>{new Date(c.createdAt).toLocaleDateString('cs-CZ')}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{c.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PROTOCOL ─────────────────────────────────────────── */}
      {section === 'protocol' && (
        <ProtocolPanel sourceType="work_order" sourceId={wo.id} />
      )}

      {/* ── COMPLETE ─────────────────────────────────────────── */}
      {section === 'complete' && (
        <div>
          {wo.status === 'vyresena' || wo.status === 'uzavrena' ? (
            <div>
              <div style={{ ...cardStyle, textAlign: 'center' }}>
                <CheckCircle size={32} style={{ color: 'var(--accent-green, #10b981)', marginBottom: 8 }} />
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>Úkol byl dokončen</div>
                {wo.completedAt && <div className="text-muted" style={{ fontSize: '0.85rem' }}>Dokončeno: {new Date(wo.completedAt).toLocaleDateString('cs-CZ')}</div>}
                {wo.actualHours != null && <div className="text-muted" style={{ fontSize: '0.85rem' }}>Skutečně: {wo.actualHours} hod</div>}
              </div>
              {/* Handover summary */}
              {(wo.workSummary || wo.findings || wo.recommendation) && (
                <div style={cardStyle}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 8 }}>Předání výstupu</div>
                  {wo.workSummary && <div style={{ marginBottom: 8 }}><div className="text-muted" style={{ fontSize: '0.75rem' }}>Shrnutí práce</div><div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{wo.workSummary}</div></div>}
                  {wo.findings && <div style={{ marginBottom: 8 }}><div className="text-muted" style={{ fontSize: '0.75rem' }}>Zjištění</div><div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{wo.findings}</div></div>}
                  {wo.recommendation && <div><div className="text-muted" style={{ fontSize: '0.75rem' }}>Doporučený další krok</div><div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{wo.recommendation}</div></div>}
                </div>
              )}
              <div className="text-muted" style={{ fontSize: '0.82rem', marginBottom: 12 }}>
                {photos.length} fotek · {wo.comments.length} poznámek
              </div>
            </div>
          ) : (
            <>
              {/* Requirements checklist */}
              {hasRequirements && (
                <div style={{ ...cardStyle, borderColor: completionStatus?.canComplete === false ? 'var(--danger)' : 'var(--accent-green, #10b981)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 8 }}>Požadavky pro dokončení</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {wo.requirePhoto && <ReqItem label="Fotodokumentace" satisfied={photos.length > 0} />}
                    {wo.requireHours && <ReqItem label="Skutečně odpracované hodiny" satisfied={!!actualHours && parseFloat(actualHours) > 0} />}
                    {wo.requireSummary && <ReqItem label="Shrnutí práce" satisfied={!!workSummary.trim()} />}
                    {wo.requireProtocol && <ReqItem label="Dokončený protokol" satisfied={completionStatus?.violations?.every(v => !v.includes('protokol')) ?? false} />}
                  </div>
                </div>
              )}

              {/* Completion error messages */}
              {completionError.length > 0 && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ef444420', border: '1px solid #ef4444', marginBottom: 12 }}>
                  {completionError.map((e, i) => (
                    <div key={i} style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: 2 }}>{e}</div>
                  ))}
                </div>
              )}

              <div style={cardStyle}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 6 }}>
                  Skutečně odpracováno (hodiny) {wo.requireHours && <span style={{ color: 'var(--danger)' }}>*</span>}
                </label>
                <input type="number" min="0" step="0.5" value={actualHours} onChange={e => setActualHours(e.target.value)}
                  placeholder="např. 2.5" style={{ ...inputStyle, fontSize: '1.2rem', textAlign: 'center' }} />
              </div>

              <div style={cardStyle}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 6 }}>
                  Shrnutí práce {wo.requireSummary && <span style={{ color: 'var(--danger)' }}>*</span>}
                </label>
                <textarea value={workSummary} onChange={e => setWorkSummary(e.target.value)}
                  placeholder="Co bylo provedeno..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              <div style={cardStyle}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 6 }}>Zjištění</label>
                <textarea value={findings} onChange={e => setFindings(e.target.value)}
                  placeholder="Co bylo zjištěno, stav zařízení..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              <div style={cardStyle}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 6 }}>Doporučený další krok</label>
                <textarea value={recommendation} onChange={e => setRecommendation(e.target.value)}
                  placeholder="Doporučení pro další postup..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              <div className="text-muted" style={{ fontSize: '0.82rem', marginBottom: 8 }}>
                {photos.length > 0 ? `${photos.length} fotek nahráno` : 'Žádné fotky'} · {wo.comments.length} poznámek
              </div>

              <Button variant="primary" onClick={handleComplete}
                disabled={changeStatus.isPending || updateWo.isPending}
                style={{ width: '100%', padding: '16px', fontSize: '1.05rem', fontWeight: 700, marginBottom: 12 }}>
                <CheckCircle size={18} style={{ marginRight: 8 }} />
                {changeStatus.isPending ? 'Dokončuji...' : 'Dokončit úkol'}
              </Button>
            </>
          )}

          <Button onClick={onBack} style={{ width: '100%', padding: '14px', marginBottom: 8 }}>
            Zpět na agendu
          </Button>

          {/* Next task suggestion */}
          <NextTaskCard currentWoId={wo.id} />
        </div>
      )}
    </div>
  );
}

function NextTaskCard({ currentWoId }: { currentWoId: string }) {
  const navigate = useNavigate();
  const { data } = useQuery<{ today: ApiWorkOrder[]; overdue: ApiWorkOrder[] }>({
    queryKey: ['workorders', 'my-agenda'],
    queryFn: () => apiClient.get('/work-orders/my-agenda').then(r => r.data),
  });

  const allActive = [...(data?.today ?? []), ...(data?.overdue ?? [])].filter(w => w.id !== currentWoId);
  const next = allActive[0];

  if (!next) {
    return (
      <div className="text-muted" style={{ textAlign: 'center', padding: 16, fontSize: '0.85rem' }}>
        Nemáte další přiřazený úkol.
      </div>
    );
  }

  return (
    <button onClick={() => navigate(`/workorders/${next.id}/execute`)} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)',
      background: 'var(--surface)', cursor: 'pointer', textAlign: 'left',
    }}>
      <div style={{ flex: 1 }}>
        <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 2 }}>Další úkol</div>
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{next.title}</div>
        <div className="text-muted" style={{ fontSize: '0.78rem' }}>{next.property?.name ?? ''}</div>
      </div>
      <Badge variant={PRIO_COLOR[next.priority] ?? 'muted'}>{next.priority}</Badge>
    </button>
  );
}

function ReqItem({ label, satisfied }: { label: string; satisfied: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: satisfied ? 'var(--accent-green, #10b981)' : 'var(--border)', color: '#fff', fontSize: '0.7rem', fontWeight: 700,
      }}>
        {satisfied ? '\u2713' : ''}
      </div>
      <span style={{ color: satisfied ? 'var(--text)' : 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}
