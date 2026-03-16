import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../admin/api/admin.api';
import { Badge, Button, LoadingState } from '../../shared/components';
import {
  Plus, Trash2, Send, Check, X, ChevronDown, ChevronUp, Eye, EyeOff,
  RotateCcw, AlertTriangle, CheckCircle, Clock, RefreshCw,
} from 'lucide-react';

/* ─── Constants ──────────────────────────────────────────────── */

const EVENT_LABELS: Record<string, string> = {
  'mio.finding.created': 'Zjištění vytvořeno',
  'mio.finding.resolved': 'Zjištění vyřešeno',
  'mio.finding.dismissed': 'Zjištění skryto',
  'mio.finding.snoozed': 'Zjištění odloženo',
  'mio.finding.restored': 'Zjištění obnoveno',
  'mio.recommendation.created': 'Doporučení vytvořeno',
  'mio.recommendation.dismissed': 'Doporučení skryto',
  'mio.recommendation.snoozed': 'Doporučení odloženo',
  'mio.digest.sent': 'Přehled odeslán',
  'mio.digest.failed': 'Přehled selhal',
  'mio.insight.ticket_created': 'Ticket z nálezu',
  'mio.test': 'Testovací událost',
};

const STATUS_CFG: Record<string, { variant: 'green' | 'red' | 'yellow' | 'muted' | 'blue'; label: string }> = {
  pending: { variant: 'blue', label: 'Čeká' },
  processing: { variant: 'yellow', label: 'Zpracovává se' },
  sent: { variant: 'green', label: 'Odesláno' },
  failed: { variant: 'red', label: 'Selhalo' },
  exhausted: { variant: 'red', label: 'Vyčerpáno' },
};

const HEALTH_CFG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  ok: { color: '#10b981', icon: <CheckCircle size={14} />, label: 'V pořádku' },
  busy: { color: '#f59e0b', icon: <Clock size={14} />, label: 'Backlog' },
  warning: { color: '#ef4444', icon: <AlertTriangle size={14} />, label: 'Problémy' },
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--surface)', color: 'var(--text)', fontSize: '.85rem', width: '100%',
};

function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ─── Page ───────────────────────────────────────────────────── */

export default function MioWebhooksPage() {
  const qc = useQueryClient();
  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['mio', 'webhooks'],
    queryFn: () => adminApi.mioWebhooks.list(),
  });
  const { data: eventTypes = [] } = useQuery({
    queryKey: ['mio', 'webhooks', 'eventTypes'],
    queryFn: () => adminApi.mioWebhooks.eventTypes(),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  if (isLoading) return <LoadingState text="Načítání webhooků..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mio Integrace</h1>
          <p className="page-subtitle">Webhooky pro napojení na externí systémy</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={14} /> Přidat webhook</Button>
      </div>

      {toast && (
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: '.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Check size={14} /> {toast}
        </div>
      )}

      <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
        Webhook se odešle při vybraných událostech Mia. Požadavek je podepsán HMAC tajemstvím pro ověření.
      </p>

      {showCreate && (
        <WebhookForm eventTypes={eventTypes} onSave={async (dto) => {
          await adminApi.mioWebhooks.create(dto);
          qc.invalidateQueries({ queryKey: ['mio', 'webhooks'] });
          setShowCreate(false); showToast('Webhook vytvořen');
        }} onCancel={() => setShowCreate(false)} />
      )}

      {(!webhooks || webhooks.length === 0) && !showCreate && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          Zatím nemáte žádné webhooky. Přidejte první pro napojení na externí systém.
        </div>
      )}

      {webhooks?.map((wh: any) => (
        <WebhookCard key={wh.id} webhook={wh} eventTypes={eventTypes}
          onUpdate={() => { qc.invalidateQueries({ queryKey: ['mio', 'webhooks'] }); showToast('Uloženo'); }}
          onDelete={() => { qc.invalidateQueries({ queryKey: ['mio', 'webhooks'] }); showToast('Webhook smazán'); }}
          onTest={() => showToast('Testovací webhook odeslán')}
        />
      ))}
    </div>
  );
}

/* ─── Form ───────────────────────────────────────────────────── */

function WebhookForm({ eventTypes, onSave, onCancel, initial }: {
  eventTypes: string[]; onSave: (dto: any) => Promise<void>; onCancel: () => void; initial?: any;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [url, setUrl] = useState(initial?.endpointUrl ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set(initial?.eventTypes ?? []));
  const [kind, setKind] = useState(initial?.kindFilter ?? '');
  const [sev, setSev] = useState(initial?.minSeverity ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (et: string) => { const n = new Set(selected); n.has(et) ? n.delete(et) : n.add(et); setSelected(n); };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await onSave({ name, endpointUrl: url, eventTypes: Array.from(selected), kindFilter: kind || null, minSeverity: sev || null, ...(initial ? { isEnabled: initial.isEnabled } : {}) });
    } catch (err: any) { setError(err?.response?.data?.message ?? 'Chyba při ukládání'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ padding: 16, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 16 }}>
      <h3 style={{ fontSize: '.95rem', fontWeight: 600, marginBottom: 12 }}>{initial ? 'Upravit webhook' : 'Nový webhook'}</h3>
      {error && <div style={{ color: '#ef4444', fontSize: '.82rem', marginBottom: 8 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div><label style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Název</label><input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Můj webhook" /></div>
        <div><label style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>URL endpointu</label><input style={inputStyle} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/webhook" /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div><label style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Typ obsahu</label><select style={{ ...inputStyle, width: 200 }} value={kind} onChange={e => setKind(e.target.value)}><option value="">Vše</option><option value="finding">Jen zjištění</option><option value="recommendation">Jen doporučení</option></select></div>
        <div><label style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Min. závažnost</label><select style={{ ...inputStyle, width: 200 }} value={sev} onChange={e => setSev(e.target.value)}><option value="">Vše</option><option value="warning">Varování a kritická</option><option value="critical">Jen kritická</option></select></div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Odebírané události</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {eventTypes.filter((et: string) => et !== 'mio.test').map((et: string) => (
            <button key={et} onClick={() => toggle(et)} style={{ padding: '4px 10px', borderRadius: 16, fontSize: '.78rem', fontWeight: 500, cursor: 'pointer', border: selected.has(et) ? '2px solid var(--primary, #6366f1)' : '1px solid var(--border)', background: selected.has(et) ? 'var(--primary, #6366f1)' : 'transparent', color: selected.has(et) ? '#fff' : 'var(--text)' }}>{EVENT_LABELS[et] ?? et}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button onClick={handleSave} disabled={saving || !name || !url || selected.size === 0}>{saving ? 'Ukládám...' : 'Uložit'}</Button>
        <Button variant="default" onClick={onCancel}><X size={14} /> Zrušit</Button>
      </div>
    </div>
  );
}

/* ─── Card ───────────────────────────────────────────────────── */

function WebhookCard({ webhook, eventTypes, onUpdate, onDelete, onTest }: {
  webhook: any; eventTypes: string[]; onUpdate: () => void; onDelete: () => void; onTest: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showOutbox, setShowOutbox] = useState(false);
  const [secretData, setSecretData] = useState<string | null>(null);
  const qc = useQueryClient();

  // Health summary
  const { data: health } = useQuery({
    queryKey: ['mio', 'webhooks', webhook.id, 'health'],
    queryFn: () => adminApi.mioWebhooks.outboxSummary(webhook.id),
    refetchInterval: 30_000,
  });

  const rotateMut = useMutation({
    mutationFn: () => adminApi.mioWebhooks.rotateSecret(webhook.id),
    onSuccess: (data: any) => { setSecretData(data.secret); qc.invalidateQueries({ queryKey: ['mio', 'webhooks'] }); },
  });
  const toggleMut = useMutation({ mutationFn: () => adminApi.mioWebhooks.update(webhook.id, { isEnabled: !webhook.isEnabled }), onSuccess: onUpdate });
  const deleteMut = useMutation({ mutationFn: () => adminApi.mioWebhooks.remove(webhook.id), onSuccess: onDelete });
  const testMut = useMutation({ mutationFn: () => adminApi.mioWebhooks.test(webhook.id), onSuccess: onTest });

  const handleRevealSecret = async () => {
    if (secretData) { setShowSecret(!showSecret); return; }
    try { const d = await adminApi.mioWebhooks.detail(webhook.id); setSecretData(d.secret); setShowSecret(true); } catch {}
  };

  if (editing) {
    return <WebhookForm eventTypes={eventTypes} initial={webhook} onSave={async (dto) => { await adminApi.mioWebhooks.update(webhook.id, dto); setEditing(false); onUpdate(); }} onCancel={() => setEditing(false)} />;
  }

  const hCfg = health?.health ? HEALTH_CFG[health.health] : null;

  return (
    <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 12, opacity: webhook.isEnabled ? 1 : 0.6 }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '.9rem', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {webhook.name}
            <Badge variant={webhook.isEnabled ? 'green' : 'muted'}>{webhook.isEnabled ? 'Aktivní' : 'Vypnutý'}</Badge>
            {hCfg && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '.75rem', color: hCfg.color, fontWeight: 500 }}>{hCfg.icon} {hCfg.label}</span>}
          </div>
          <div className="text-muted" style={{ fontSize: '.78rem', marginTop: 2 }}>{webhook.endpointUrl}</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <Button size="sm" onClick={() => testMut.mutate()} disabled={testMut.isPending}><Send size={12} /> Test</Button>
          <Button size="sm" onClick={() => setEditing(true)}>Upravit</Button>
          <Button size="sm" onClick={() => toggleMut.mutate()}>{webhook.isEnabled ? 'Vypnout' : 'Zapnout'}</Button>
          <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Health summary strip */}
      {health && (
        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '.78rem', color: 'var(--text-muted)' }}>
          <span>Poslední úspěch: <strong>{fmtTime(health.lastSuccess)}</strong></span>
          {health.pending > 0 && <span style={{ color: '#f59e0b' }}>Čeká: <strong>{health.pending}</strong></span>}
          {health.exhausted > 0 && <span style={{ color: '#ef4444' }}>Vyčerpáno: <strong>{health.exhausted}</strong></span>}
          {health.lastFailure && <span style={{ color: '#ef4444' }}>Posl. chyba: {health.lastFailure.error ?? fmtTime(health.lastFailure.at)}</span>}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {webhook.eventTypes.map((et: string) => <Badge key={et} variant="muted">{EVENT_LABELS[et] ?? et}</Badge>)}
          </div>
          {webhook.kindFilter && <div className="text-muted" style={{ fontSize: '.78rem' }}>Filtr: {webhook.kindFilter}</div>}
          {webhook.minSeverity && <div className="text-muted" style={{ fontSize: '.78rem' }}>Min. závažnost: {webhook.minSeverity}</div>}

          {/* Secret */}
          <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: 'var(--surface-2, rgba(0,0,0,0.1))', fontSize: '.78rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="text-muted">Tajemství: </span>
              <code style={{ fontSize: '.75rem' }}>{showSecret && secretData ? secretData : (webhook.secretMasked ?? '••••••••••••')}</code>
              <button onClick={handleRevealSecret} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>{showSecret ? <EyeOff size={12} /> : <Eye size={12} />}</button>
              <button onClick={() => { if (confirm('Otočit tajemství? Po otočení přestane fungovat původní podpis.')) rotateMut.mutate(); }} disabled={rotateMut.isPending} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, fontSize: '.75rem' }}><RotateCcw size={11} /> Otočit</button>
            </div>
            <div className="text-muted" style={{ fontSize: '.72rem', marginTop: 4 }}>Tajemství zobrazujte jen při konfiguraci cílového systému.</div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Button size="sm" onClick={() => setShowOutbox(!showOutbox)}>{showOutbox ? 'Skrýt frontu' : 'Zobrazit frontu doručení'}</Button>
            <Button size="sm" variant="danger" onClick={() => { if (confirm('Smazat webhook?')) deleteMut.mutate(); }}><Trash2 size={12} /> Smazat</Button>
          </div>

          {/* Outbox viewer */}
          {showOutbox && <OutboxViewer subscriptionId={webhook.id} />}
        </div>
      )}
    </div>
  );
}

/* ─── Outbox Viewer ──────────────────────────────────────────── */

const OUTBOX_STATUSES = [
  { value: '', label: 'Vše' },
  { value: 'pending', label: 'Čeká' },
  { value: 'processing', label: 'Zpracovává se' },
  { value: 'sent', label: 'Odesláno' },
  { value: 'failed', label: 'Selhalo' },
  { value: 'exhausted', label: 'Vyčerpáno' },
];

function OutboxViewer({ subscriptionId }: { subscriptionId: string }) {
  const [statusFilter, setStatusFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 15;
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['mio', 'webhooks', subscriptionId, 'outbox', statusFilter, eventFilter, offset],
    queryFn: () => adminApi.mioWebhooks.outbox(subscriptionId, {
      status: statusFilter || undefined,
      eventType: eventFilter || undefined,
      limit,
      offset,
    }),
  });

  const retryMut = useMutation({
    mutationFn: (id: string) => adminApi.mioWebhooks.retryOutbox(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mio', 'webhooks', subscriptionId, 'outbox'] });
      qc.invalidateQueries({ queryKey: ['mio', 'webhooks', subscriptionId, 'health'] });
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasMore = offset + limit < total;
  const hasPrev = offset > 0;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 8 }}>Fronta doručení {total > 0 && <span className="text-muted" style={{ fontWeight: 400 }}>({total} celkem)</span>}</div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {OUTBOX_STATUSES.map(s => (
          <button key={s.value} onClick={() => { setStatusFilter(s.value); setOffset(0); }} style={{
            padding: '3px 10px', borderRadius: 14, fontSize: '.75rem', fontWeight: 500, cursor: 'pointer',
            border: statusFilter === s.value ? '2px solid var(--primary, #6366f1)' : '1px solid var(--border)',
            background: statusFilter === s.value ? 'var(--primary, #6366f1)' : 'transparent',
            color: statusFilter === s.value ? '#fff' : 'var(--text-muted)',
          }}>{s.label}</button>
        ))}
        <select value={eventFilter} onChange={e => { setEventFilter(e.target.value); setOffset(0); }}
          style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '.75rem' }}>
          <option value="">Všechny události</option>
          {Object.entries(EVENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Items */}
      {isLoading ? (
        <div className="text-muted" style={{ fontSize: '.82rem', padding: 12 }}>Načítání...</div>
      ) : items.length === 0 ? (
        <div className="text-muted" style={{ fontSize: '.82rem', padding: 12 }}>
          {statusFilter ? 'Ve vybraném filtru nejsou žádné položky.' : 'Tento webhook zatím nemá žádná doručení.'}
        </div>
      ) : (
        <div style={{ maxHeight: 350, overflow: 'auto' }}>
          {items.map((item: any) => {
            const sc = STATUS_CFG[item.status] ?? STATUS_CFG.failed;
            const canRetry = ['failed', 'exhausted'].includes(item.status);
            return (
              <div key={item.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '.8rem', flexWrap: 'wrap' }}>
                <Badge variant={sc.variant}>{sc.label}</Badge>
                <span className="text-muted">{EVENT_LABELS[item.eventType] ?? item.eventType}</span>
                {item.retryCount > 0 && <span className="text-muted">Pokus {item.retryCount}/{item.maxRetries}</span>}
                {item.lastHttpStatus && <span className="text-muted">HTTP {item.lastHttpStatus}</span>}
                <span className="text-muted">{fmtTime(item.lastAttemptAt ?? item.createdAt)}</span>
                {item.status === 'pending' && item.retryCount > 0 && item.nextAttemptAt && (
                  <span style={{ color: '#f59e0b', fontSize: '.75rem' }}>Další pokus: {fmtTime(item.nextAttemptAt)}</span>
                )}
                {item.lastError && <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>{item.lastError}</span>}
                {canRetry && (
                  <button onClick={() => retryMut.mutate(item.id)} disabled={retryMut.isPending}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary, #6366f1)', fontSize: '.75rem', display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
                    <RefreshCw size={11} /> Znovu
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
          <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={!hasPrev}
            style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: hasPrev ? 'var(--text)' : 'var(--text-muted)', cursor: hasPrev ? 'pointer' : 'default', fontSize: '.78rem' }}>
            Předchozí
          </button>
          <span className="text-muted" style={{ fontSize: '.78rem', alignSelf: 'center' }}>
            {offset + 1}–{Math.min(offset + limit, total)} z {total}
          </span>
          <button onClick={() => setOffset(offset + limit)} disabled={!hasMore}
            style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: hasMore ? 'var(--text)' : 'var(--text-muted)', cursor: hasMore ? 'pointer' : 'default', fontSize: '.78rem' }}>
            Další
          </button>
        </div>
      )}
    </div>
  );
}
