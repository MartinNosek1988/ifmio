import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, CheckCircle, XCircle, Edit, Trash2, Link2 } from 'lucide-react';
import { Badge, Button, Modal, LoadingSpinner, ErrorState } from '../../shared/components';
import { formatKc, formatCzDate } from '../../shared/utils/format';
import { purchaseOrdersApi } from './api/purchase-orders.api';
import type { ApiPurchaseOrder } from './api/purchase-orders.api';
import { PurchaseOrderForm } from './PurchaseOrderForm';
import { apiClient } from '../../core/api/client';

type POStatus = ApiPurchaseOrder['status'];

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

const STATUS_STEPS: POStatus[] = ['draft', 'pending_approval', 'approved', 'sent', 'delivered'];

const SOURCE_LABELS: Record<string, string> = {
  work_order: 'Pracovní příkaz',
  helpdesk: 'Helpdesk',
  manual: 'Ruční',
};

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showMatchModal, setShowMatchModal] = useState(false);

  const { data: po, isLoading, error } = useQuery({
    queryKey: ['purchase-orders', id],
    queryFn: () => purchaseOrdersApi.getById(id!),
    enabled: !!id,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['purchase-orders', id] });
    qc.invalidateQueries({ queryKey: ['purchase-orders'] });
  };

  const submitMut = useMutation({ mutationFn: () => purchaseOrdersApi.submit(id!), onSuccess: invalidate });
  const approveMut = useMutation({ mutationFn: () => purchaseOrdersApi.approve(id!), onSuccess: invalidate });
  const sendMut = useMutation({ mutationFn: () => purchaseOrdersApi.send(id!), onSuccess: invalidate });
  const cancelMut = useMutation({
    mutationFn: (reason: string) => purchaseOrdersApi.cancel(id!, reason),
    onSuccess: () => { invalidate(); setShowCancel(false); },
  });
  const deleteMut = useMutation({
    mutationFn: () => purchaseOrdersApi.remove(id!),
    onSuccess: () => navigate('/purchase-orders'),
  });
  const unmatchMut = useMutation({
    mutationFn: (invoiceId: string) => purchaseOrdersApi.unmatchInvoice(id!, invoiceId),
    onSuccess: invalidate,
  });

  if (isLoading) return <LoadingSpinner />;
  if (error || !po) return <ErrorState message="Objednávka nenalezena" />;

  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '0.88rem' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right' }}>{value || '—'}</span>
    </div>
  );

  const currentStepIndex = STATUS_STEPS.indexOf(po.status);
  const isCancelled = po.status === 'cancelled';

  return (
    <div style={{ padding: '24px 32px', maxWidth: 960, margin: '0 auto' }}>
      {/* Back link */}
      <button
        className="btn btn--sm"
        onClick={() => navigate('/purchase-orders')}
        style={{ border: 'none', padding: '4px 0', marginBottom: 16, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <ArrowLeft size={16} /> Zpět na seznam
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600, margin: 0 }}>{po.number}</h1>
          <div style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: '0.92rem' }}>{po.supplierName}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <Badge variant={STATUS_VARIANTS[po.status] as any}>{STATUS_LABELS[po.status]}</Badge>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {po.status === 'draft' && (
            <>
              <Button variant="primary" icon={<Send size={14} />} onClick={() => submitMut.mutate()} disabled={submitMut.isPending}>
                Ke schválení
              </Button>
              <Button icon={<Edit size={14} />} onClick={() => setShowEdit(true)}>Upravit</Button>
              <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => { if (confirm('Smazat objednávku?')) deleteMut.mutate(); }}>
                Smazat
              </Button>
            </>
          )}
          {po.status === 'pending_approval' && (
            <>
              <Button variant="primary" icon={<CheckCircle size={14} />} onClick={() => approveMut.mutate()} disabled={approveMut.isPending}>
                Schválit
              </Button>
              <Button icon={<XCircle size={14} />} onClick={() => setShowCancel(true)}>Vrátit</Button>
            </>
          )}
          {po.status === 'approved' && (
            <Button variant="primary" icon={<Send size={14} />} onClick={() => sendMut.mutate()} disabled={sendMut.isPending}>
              Odeslat dodavateli
            </Button>
          )}
          {(po.status === 'sent' || po.status === 'approved') && (
            <Button icon={<Link2 size={14} />} onClick={() => setShowMatchModal(true)}>
              Propojit fakturu
            </Button>
          )}
        </div>
      </div>

      {/* Match status banner */}
      {po.matchStatus === 'unmatched' && po.status !== 'draft' && po.status !== 'cancelled' && (
        <div style={{
          background: 'var(--warning-bg, #fef9c3)', border: '1px solid var(--warning-border, #fde68a)',
          borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.9rem' }}>Čeká na fakturu — zatím nespárováno</span>
          <Button size="sm" icon={<Link2 size={14} />} onClick={() => setShowMatchModal(true)}>Propojit fakturu</Button>
        </div>
      )}
      {po.matchStatus === 'partial' && (
        <div style={{
          background: 'var(--orange-bg, #fff7ed)', border: '1px solid var(--orange-border, #fed7aa)',
          borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: '0.9rem',
        }}>
          Faktura nesedí — zkontrolujte rozdíl částek
        </div>
      )}
      {po.matchStatus === 'matched' && (
        <div style={{
          background: 'var(--success-bg, #f0fdf4)', border: '1px solid var(--success-border, #bbf7d0)',
          borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: '0.9rem', color: 'var(--success, #16a34a)',
        }}>
          Faktura spárována
        </div>
      )}

      {/* Status flow */}
      {!isCancelled && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
          {STATUS_STEPS.map((step, i) => {
            const isActive = i === currentStepIndex;
            const isDone = i < currentStepIndex;
            return (
              <div key={step} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  height: 4, background: isDone || isActive ? 'var(--primary)' : 'var(--border)',
                  borderRadius: i === 0 ? '4px 0 0 4px' : i === STATUS_STEPS.length - 1 ? '0 4px 4px 0' : 0,
                }} />
                <div style={{
                  marginTop: 6, fontSize: '0.75rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isDone || isActive ? 'var(--text)' : 'var(--text-muted)',
                }}>
                  {STATUS_LABELS[step]}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancelled info */}
      {isCancelled && po.cancelReason && (
        <div style={{
          background: 'var(--danger-bg, #fef2f2)', border: '1px solid var(--danger-border, #fecaca)',
          borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: '0.9rem',
        }}>
          <strong>Důvod zrušení:</strong> {po.cancelReason}
          {po.cancelledAt && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{formatCzDate(po.cancelledAt)}</span>}
        </div>
      )}

      {/* Content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        {/* Left: items + invoices */}
        <div>
          {/* Items table */}
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Položky</h3>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Popis</th>
                  <th>Množství</th>
                  <th>Jednotka</th>
                  <th style={{ textAlign: 'right' }}>Jedn. cena</th>
                  <th style={{ textAlign: 'right' }}>Celkem</th>
                </tr>
              </thead>
              <tbody>
                {po.items.map((item, i) => (
                  <tr key={item.id}>
                    <td>{i + 1}</td>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unit}</td>
                    <td style={{ textAlign: 'right' }}>{formatKc(item.unitPrice)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatKc(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ textAlign: 'right', fontWeight: 600 }}>Základ:</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatKc(po.amountBase)}</td>
                </tr>
                {po.vatAmount != null && po.vatAmount > 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'right', color: 'var(--text-muted)' }}>DPH ({po.vatRate ?? 0}%):</td>
                    <td style={{ textAlign: 'right' }}>{formatKc(po.vatAmount)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.05rem' }}>Celkem:</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.05rem' }}>{formatKc(po.amountTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Linked invoices */}
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Propojené faktury</h3>
              <Button size="sm" icon={<Link2 size={14} />} onClick={() => setShowMatchModal(true)}>
                Propojit fakturu
              </Button>
            </div>
            {(!po.invoices || po.invoices.length === 0) ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '16px 0', textAlign: 'center' }}>
                Zatím žádné propojené faktury
              </div>
            ) : (
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Číslo faktury</th>
                    <th style={{ textAlign: 'right' }}>Částka</th>
                    <th>Stav</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {po.invoices.map(inv => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 500 }}>{inv.number}</td>
                      <td style={{ textAlign: 'right' }}>{formatKc(inv.amountTotal)}</td>
                      <td>
                        <Badge variant={inv.approvalStatus === 'approved' ? 'green' : 'muted'}>
                          {inv.approvalStatus}
                        </Badge>
                      </td>
                      <td>
                        <button
                          className="btn btn--sm"
                          style={{ border: 'none', padding: 4, color: 'var(--danger)' }}
                          title="Odpojit"
                          onClick={() => unmatchMut.mutate(inv.id)}
                        >
                          <XCircle size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: info sidebar */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, height: 'fit-content' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Informace</h3>
          {row('Číslo PO', po.number)}
          {row('Dodavatel', po.supplierName)}
          {row('IČ', po.supplierIco)}
          {row('E-mail', po.supplierEmail)}
          {row('Nemovitost', po.property?.name)}
          {row('Zdroj', po.sourceType ? SOURCE_LABELS[po.sourceType] || po.sourceType : undefined)}
          {row('Měna', po.currency)}
          {row('Datum vystavení', formatCzDate(po.issueDate))}
          {row('Datum dodání', po.deliveryDate ? formatCzDate(po.deliveryDate) : undefined)}
          {row('Platnost do', po.validUntil ? formatCzDate(po.validUntil) : undefined)}
          {po.approvedAt && row('Schváleno', formatCzDate(po.approvedAt))}
          {po.sentAt && row('Odesláno', formatCzDate(po.sentAt))}
          {row('Vytvořeno', formatCzDate(po.createdAt))}
          {po.deliveryAddress && row('Doručovací adresa', po.deliveryAddress)}
          {po.description && (
            <div style={{ marginTop: 12 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 4 }}>Popis</div>
              <div style={{ fontSize: '0.88rem' }}>{po.description}</div>
            </div>
          )}
        </div>
      </div>

      {/* Edit form modal */}
      {showEdit && (
        <PurchaseOrderForm
          open={showEdit}
          onClose={() => setShowEdit(false)}
          onSuccess={() => { setShowEdit(false); invalidate(); }}
          editData={po}
        />
      )}

      {/* Cancel modal */}
      {showCancel && (
        <Modal open onClose={() => setShowCancel(false)} title="Vrátit objednávku" footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => setShowCancel(false)}>Zpět</Button>
            <Button variant="danger" onClick={() => cancelMut.mutate(cancelReason)} disabled={cancelMut.isPending}>
              {cancelMut.isPending ? 'Ruším...' : 'Zrušit objednávku'}
            </Button>
          </div>
        }>
          <div style={{ marginBottom: 12, fontSize: '0.92rem' }}>Zadejte důvod zrušení:</div>
          <textarea
            className="input"
            rows={3}
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            placeholder="Důvod..."
            style={{ width: '100%', resize: 'vertical' }}
          />
        </Modal>
      )}

      {/* Match invoice modal */}
      {showMatchModal && (
        <InvoiceMatchModal
          poId={id!}
          onClose={() => setShowMatchModal(false)}
          onSuccess={() => { setShowMatchModal(false); invalidate(); }}
        />
      )}
    </div>
  );
}

/* ----- Invoice match search modal ----- */

function InvoiceMatchModal({ poId, onClose, onSuccess }: { poId: string; onClose: () => void; onSuccess: () => void }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-for-match', search],
    queryFn: () => apiClient.get('/finance/invoices', { params: { search, limit: 20, approvalStatus: 'approved' } }).then(r => {
      const res = r.data;
      return Array.isArray(res) ? res : (res.data ?? res.items ?? []);
    }),
    enabled: search.length >= 2,
  });

  const matchMut = useMutation({
    mutationFn: (invoiceId: string) => purchaseOrdersApi.matchInvoice(poId, invoiceId),
    onSuccess,
  });

  return (
    <Modal open onClose={onClose} title="Propojit fakturu" footer={
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button onClick={onClose}>Zrušit</Button>
        <Button variant="primary" disabled={!selected || matchMut.isPending} onClick={() => matchMut.mutate(selected)}>
          {matchMut.isPending ? 'Propojuji...' : 'Propojit'}
        </Button>
      </div>
    }>
      <input
        className="input"
        placeholder="Hledat fakturu dle čísla nebo dodavatele..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', marginBottom: 12 }}
        autoFocus
      />
      {invoices.length === 0 && search.length >= 2 && (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16, fontSize: '0.88rem' }}>
          Žádné faktury nenalezeny
        </div>
      )}
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {invoices.map((inv: any) => (
          <div
            key={inv.id}
            onClick={() => setSelected(inv.id)}
            style={{
              padding: '10px 12px', borderRadius: 8, marginBottom: 4, cursor: 'pointer',
              border: selected === inv.id ? '2px solid var(--primary)' : '1px solid var(--border)',
              background: selected === inv.id ? 'var(--primary-bg, #eff6ff)' : 'transparent',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{inv.number}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{inv.supplierName}</div>
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              {formatKc(inv.amountTotal)}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
