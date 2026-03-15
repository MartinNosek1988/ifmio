import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../admin/api/admin.api';
import { KpiCard, Badge, LoadingState, Button } from '../../shared/components';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Mail, AlertTriangle, CheckCircle, XCircle, SkipForward,
  Clock, Settings, Search, BarChart3,
} from 'lucide-react';

const STATUS_BADGE: Record<string, { variant: 'green' | 'yellow' | 'red' | 'muted'; label: string }> = {
  success: { variant: 'green', label: 'OK' },
  partial: { variant: 'yellow', label: 'Částečný' },
  failed: { variant: 'red', label: 'Selhalo' },
  sent: { variant: 'green', label: 'Odesláno' },
  skipped: { variant: 'muted', label: 'Přeskočeno' },
};

const JOB_LABEL: Record<string, string> = {
  detection: 'Kontrola zjištění',
  digest_daily: 'Denní přehled',
  digest_weekly: 'Týdenní přehled',
};

export default function MioAdminPage() {
  const navigate = useNavigate();
  const [digestDays, setDigestDays] = useState(7);

  const { data: overview, isLoading } = useQuery({
    queryKey: ['mio', 'admin', 'overview'],
    queryFn: () => adminApi.mioAdmin.overview(),
  });
  const { data: jobs } = useQuery({
    queryKey: ['mio', 'admin', 'jobs'],
    queryFn: () => adminApi.mioAdmin.jobs(),
  });
  const { data: digests } = useQuery({
    queryKey: ['mio', 'admin', 'digests', digestDays],
    queryFn: () => adminApi.mioAdmin.digests(digestDays),
  });
  const { data: failures } = useQuery({
    queryKey: ['mio', 'admin', 'failures'],
    queryFn: () => adminApi.mioAdmin.failures(),
  });

  if (isLoading) return <LoadingState text="Načítání přehledu Mio..." />;
  if (!overview) return null;

  const hasFailures = (failures?.digestFailures?.length ?? 0) + (failures?.jobFailures?.length ?? 0) > 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Přehled provozu Mia</h1>
          <p className="page-subtitle">Stav kontrol, přehledů a nastavení</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" onClick={() => navigate('/settings?tab=mio')}><Settings size={14} /> Governance</Button>
          <Button size="sm" onClick={() => navigate('/mio/insights')}><Search size={14} /> Insights</Button>
        </div>
      </div>

      {/* ── KPIs ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }} className="kpi-grid-4">
        <KpiCard label="Aktivní zjištění" value={String(overview.activeFindings)} color="var(--accent-red, #ef4444)" icon={<AlertTriangle size={16} />} />
        <KpiCard label="Aktivní doporučení" value={String(overview.activeRecommendations)} color="var(--accent-blue, #3b82f6)" icon={<Activity size={16} />} />
        <KpiCard label="Digest odběratelů" value={String(overview.digestSubscribers)} color="var(--accent-green, #10b981)" icon={<Mail size={16} />} />
        <KpiCard
          label="Přehledy (24h)"
          value={`${overview.digest24h.sent} / ${overview.digest24h.skipped} / ${overview.digest24h.failed}`}
          color={overview.digest24h.failed > 0 ? 'var(--accent-red)' : 'var(--accent-green)'}
          icon={<BarChart3 size={16} />}
        />
      </div>

      {/* ── Config summary ─────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20,
        padding: 14, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)',
      }}>
        <MiniStat label="Pravidla zjištění" value={`${overview.enabledFindingsCount} aktivních`} />
        <MiniStat label="Pravidla doporučení" value={`${overview.enabledRecsCount} aktivních`} />
        <MiniStat label="Auto-tickety" value={`${overview.autoTicketCount} pravidel`} />
        <MiniStat label="Digest" value={overview.digestEnabled ? 'Zapnutý' : 'Vypnutý'} />
      </div>

      {/* ── Last runs ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <RunCard
          title="Poslední kontrola zjištění"
          run={overview.lastDetectionRun}
          details={overview.lastDetectionRun ? [
            `${overview.lastDetectionRun.tenantCount} tenantů`,
            `${overview.lastDetectionRun.created} nových`,
            `${overview.lastDetectionRun.resolved} vyřešených`,
          ] : []}
        />
        <RunCard
          title="Poslední digest"
          run={overview.lastDigestRun}
          details={overview.lastDigestRun ? [
            JOB_LABEL[overview.lastDigestRun.jobType] ?? overview.lastDigestRun.jobType,
            `${overview.lastDigestRun.sent} odesláno`,
            `${overview.lastDigestRun.skipped} přeskočeno`,
          ] : []}
        />
      </div>

      {/* ── Recent jobs ────────────────────────────────────────── */}
      {jobs && jobs.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 10 }}>Poslední běhy</h2>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
            overflow: 'auto', maxHeight: 300,
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={thStyle}>Typ</th>
                  <th style={thStyle}>Stav</th>
                  <th style={thStyle}>Čas</th>
                  <th style={thStyle}>Délka</th>
                  <th style={thStyle}>Výsledek</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j: any) => (
                  <tr key={j.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={tdStyle}>{JOB_LABEL[j.jobType] ?? j.jobType}</td>
                    <td style={tdStyle}><Badge variant={STATUS_BADGE[j.status]?.variant ?? 'muted'}>{STATUS_BADGE[j.status]?.label ?? j.status}</Badge></td>
                    <td style={tdStyle}>{fmtTime(j.finishedAt)}</td>
                    <td style={tdStyle}>{fmtDuration(j.startedAt, j.finishedAt)}</td>
                    <td style={tdStyle}>{j.summary ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Digest delivery ────────────────────────────────────── */}
      {digests && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Odeslané přehledy ({digests.period})</h2>
            <select
              value={digestDays}
              onChange={(e) => setDigestDays(parseInt(e.target.value, 10))}
              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '.82rem' }}
            >
              <option value={1}>24 hodin</option>
              <option value={7}>7 dní</option>
              <option value={30}>30 dní</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <MiniStat label="Odesláno" value={String(digests.summary.sent ?? 0)} icon={<CheckCircle size={14} style={{ color: '#10b981' }} />} />
            <MiniStat label="Přeskočeno" value={String(digests.summary.skipped ?? 0)} icon={<SkipForward size={14} style={{ color: '#f59e0b' }} />} />
            <MiniStat label="Selhalo" value={String(digests.summary.failed ?? 0)} icon={<XCircle size={14} style={{ color: '#ef4444' }} />} />
          </div>

          {digests.logs.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto', maxHeight: 250 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={thStyle}>Uživatel</th>
                    <th style={thStyle}>Stav</th>
                    <th style={thStyle}>Frekvence</th>
                    <th style={thStyle}>Zjištění</th>
                    <th style={thStyle}>Dopor.</th>
                    <th style={thStyle}>Čas</th>
                  </tr>
                </thead>
                <tbody>
                  {digests.logs.slice(0, 30).map((l: any) => (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={tdStyle}>{l.user?.name ?? '—'}</td>
                      <td style={tdStyle}><Badge variant={STATUS_BADGE[l.status]?.variant ?? 'muted'}>{STATUS_BADGE[l.status]?.label ?? l.status}</Badge></td>
                      <td style={tdStyle}>{l.frequency === 'weekly' ? 'Týdenní' : 'Denní'}</td>
                      <td style={tdStyle}>{l.findingsCount}</td>
                      <td style={tdStyle}>{l.recommendationsCount}</td>
                      <td style={tdStyle}>{fmtTime(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Failures ───────────────────────────────────────────── */}
      {hasFailures && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={16} style={{ color: 'var(--danger)' }} /> Poslední problémy
          </h2>
          <div style={{
            padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
          }}>
            {failures.jobFailures?.map((f: any) => (
              <div key={f.id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(239,68,68,0.1)', fontSize: '.82rem' }}>
                <Badge variant="red">{JOB_LABEL[f.jobType] ?? f.jobType}</Badge>
                <span style={{ marginLeft: 8 }}>{f.summary ?? 'Selhalo'}</span>
                <span className="text-muted" style={{ marginLeft: 8, fontSize: '.75rem' }}>{fmtTime(f.finishedAt)}</span>
              </div>
            ))}
            {failures.digestFailures?.map((f: any) => (
              <div key={f.id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(239,68,68,0.1)', fontSize: '.82rem' }}>
                <Badge variant="red">Digest</Badge>
                <span style={{ marginLeft: 8 }}>{f.skippedReason ?? 'Odeslání se nepodařilo'}</span>
                <span className="text-muted" style={{ marginLeft: 8, fontSize: '.75rem' }}>
                  {f.user?.name && `${f.user.name} · `}{fmtTime(f.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────── */

const thStyle: React.CSSProperties = { padding: '8px 12px', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-muted)' };
const tdStyle: React.CSSProperties = { padding: '8px 12px' };

function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(start: string, end: string) {
  if (!start || !end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {icon}
      <div>
        <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{label}</div>
        <div style={{ fontSize: '.9rem', fontWeight: 600 }}>{value}</div>
      </div>
    </div>
  );
}

function RunCard({ title, run, details }: { title: string; run: any; details: string[] }) {
  return (
    <div style={{ padding: 14, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{title}</div>
        {run && <Badge variant={STATUS_BADGE[run.status]?.variant ?? 'muted'}>{STATUS_BADGE[run.status]?.label ?? run.status}</Badge>}
      </div>
      {run ? (
        <>
          <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <Clock size={12} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
            {fmtTime(run.at)}
          </div>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
            {details.join(' · ')}
          </div>
        </>
      ) : (
        <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Zatím bez záznamu</div>
      )}
    </div>
  );
}
