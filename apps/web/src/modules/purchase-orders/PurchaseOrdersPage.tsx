import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Clock, CheckCircle, Link2 } from 'lucide-react';
import { KpiCard, Badge, Button, LoadingSpinner } from '../../shared/components';
import { formatKc, formatCzDate } from '../../shared/utils/format';
import { purchaseOrdersApi } from './api/purchase-orders.api';
import type { ApiPurchaseOrder } from './api/purchase-orders.api';
import { PurchaseOrderForm } from './PurchaseOrderForm';

type POStatus = ApiPurchaseOrder['status'];
type MatchStatus = ApiPurchaseOrder['matchStatus'];

const STATUS_LABELS: Record<POStatus, string> = {
  draft: 'Koncept',
  pending_approval: 'Ke schválení',
  approved: 'Schváleno',
  sent: 'Odesláno',
  delivered: 'Doručeno',
  cancelled: 'Zrušeno',
};

const STATUS_VARIANTS: Record<POStatus, string> = {
  draft: 'muted',
  pending_approval: 'yellow',
  approved: 'blue',
  sent: 'purple',
  delivered: 'green',
  cancelled: 'red',
};

const MATCH_LABELS: Record<MatchStatus, string> = {
  unmatched: 'Nespárováno',
  partial: 'Částečně',
  matched: 'Spárováno',
};

const MATCH_VARIANTS: Record<MatchStatus, string> = {
  unmatched: 'muted',
  partial: 'yellow',
  matched: 'green',
};

const SOURCE_LABELS: Record<string, string> = {
  work_order: 'Pracovní příkaz',
  helpdesk: 'Helpdesk',
  manual: 'Ruční',
};

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [matchFilter, setMatchFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['purchase-orders', statusFilter, matchFilter, search],
    queryFn: () => purchaseOrdersApi.list({
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(matchFilter ? { matchStatus: matchFilter } : {}),
      ...(search ? { search } : {}),
    }),
  });
  const orders = data?.items ?? [];

  const { data: stats } = useQuery({
    queryKey: ['purchase-orders', 'stats'],
    queryFn: purchaseOrdersApi.stats,
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div style={{ padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Objednávky (PO)</h1>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowForm(true)}>
          Nová objednávka
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <KpiCard
          label="Celkem otevřených"
          value={String(stats?.totalOpen ?? 0)}
          icon={<FileText size={18} />}
          color="var(--accent-blue)"
        />
        <KpiCard
          label="K schválení"
          value={String(stats?.pendingApproval ?? 0)}
          icon={<Clock size={18} />}
          color="var(--accent-yellow, #f59e0b)"
        />
        <KpiCard
          label="Čeká na fakturu"
          value={String(stats?.awaitingInvoice ?? 0)}
          icon={<Link2 size={18} />}
          color="var(--accent-orange, #f97316)"
        />
        <KpiCard
          label="Spárováno"
          value={String(stats?.matched ?? 0)}
          sub={stats?.totalAmount ? formatKc(stats.totalAmount) : undefined}
          icon={<CheckCircle size={18} />}
          color="var(--accent-green, #22c55e)"
        />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          className="input"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ minWidth: 160 }}
        >
          <option value="">Všechny stavy</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <select
          className="input"
          value={matchFilter}
          onChange={e => setMatchFilter(e.target.value)}
          style={{ minWidth: 160 }}
        >
          <option value="">Všechny match</option>
          {Object.entries(MATCH_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <input
          className="input"
          placeholder="Hledat dle čísla, dodavatele..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ minWidth: 240, flex: 1 }}
        />
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Číslo PO</th>
              <th>Dodavatel</th>
              <th>Nemovitost</th>
              <th>Zdroj</th>
              <th style={{ textAlign: 'right' }}>Celkem</th>
              <th>Stav</th>
              <th>Match</th>
              <th>Datum</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  Žádné objednávky
                </td>
              </tr>
            )}
            {orders.map(po => (
              <tr
                key={po.id}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/purchase-orders/${po.id}`)}
              >
                <td style={{ fontWeight: 500 }}>{po.number}</td>
                <td>{po.supplierName}</td>
                <td>{po.property?.name || '—'}</td>
                <td>{po.sourceType ? SOURCE_LABELS[po.sourceType] || po.sourceType : '—'}</td>
                <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatKc(po.amountTotal)}</td>
                <td>
                  <Badge variant={STATUS_VARIANTS[po.status] as any}>{STATUS_LABELS[po.status]}</Badge>
                </td>
                <td>
                  <Badge variant={MATCH_VARIANTS[po.matchStatus] as any}>{MATCH_LABELS[po.matchStatus]}</Badge>
                </td>
                <td>{formatCzDate(po.issueDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit modal */}
      {showForm && (
        <PurchaseOrderForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['purchase-orders'] }); }}
        />
      )}
    </div>
  );
}
