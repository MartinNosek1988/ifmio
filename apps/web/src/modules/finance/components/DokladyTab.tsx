import { useState, useRef, useEffect } from 'react';
import { Plus, FileText } from 'lucide-react';
import { KpiCard, SearchBar, Table, Badge, Button, Modal } from '../../../shared/components';
import type { Column } from '../../../shared/components';
import { formatKc, formatCzDate } from '../../../shared/utils/format';
import type { ApiInvoice } from '../api/finance.api';
import type { FinTransaction } from '../types';
import { useInvoices, useInvoiceStats, useDeleteInvoice, useMarkInvoicePaid, useImportIsdoc, useExportIsdoc, usePairInvoice, useSubmitInvoice, useApproveInvoice } from '../api/finance.queries';
import { useAuthStore } from '../../../core/auth';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { InvoiceForm } from './InvoiceForm';
import { InvoiceContextMenu } from './InvoiceContextMenu';
import { IsdocImportModal } from './IsdocImportModal';
import { PdfExtractModal } from './PdfExtractModal';

export const INVOICE_TYPE_LABELS: Record<string, string> = {
  received: 'Přijatá', issued: 'Vydaná', proforma: 'Záloha', credit_note: 'Dobropis', internal: 'Interní',
};

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', submitted: 'Ke schválení', approved: 'Schváleno',
};

export const APPROVAL_STATUS_VARIANTS: Record<string, 'muted' | 'yellow' | 'green' | 'blue' | 'purple'> = {
  draft: 'muted', submitted: 'yellow', approved: 'blue',
};

/** Roles that can approve/return invoices */
const FINANCE_ROLES = ['tenant_owner', 'tenant_admin', 'finance_manager'];

// Simple debounce hook
function useDebounced(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const ALLOC_LABELS: Record<string, string> = {
  unallocated: 'Nealokované', partial: 'Částečně', allocated: 'Plně alokované',
};

export function DokladyTab({ transactions }: { transactions: FinTransaction[] }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPaid, setFilterPaid] = useState('');
  const [filterApproval, setFilterApproval] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Advanced filters
  const [fSupplier, setFSupplier] = useState('');
  const [fBuyer, setFBuyer] = useState('');
  const [fVs, setFVs] = useState('');
  const [fIssueDateFrom, setFIssueDateFrom] = useState('');
  const [fIssueDateTo, setFIssueDateTo] = useState('');
  const [fDueDateFrom, setFDueDateFrom] = useState('');
  const [fDueDateTo, setFDueDateTo] = useState('');
  const [fAllocation, setFAllocation] = useState('');

  // Debounce text inputs
  const dSupplier = useDebounced(fSupplier);
  const dBuyer = useDebounced(fBuyer);
  const dVs = useDebounced(fVs);

  const activeFilterCount = [dSupplier, dBuyer, dVs, fIssueDateFrom, fIssueDateTo, fDueDateFrom, fDueDateTo, fAllocation].filter(Boolean).length;

  const clearAdvanced = () => {
    setFSupplier(''); setFBuyer(''); setFVs('');
    setFIssueDateFrom(''); setFIssueDateTo('');
    setFDueDateFrom(''); setFDueDateTo('');
    setFAllocation('');
  };

  const [showForm, setShowForm] = useState(false);
  const [editInvoice, setEditInvoice] = useState<ApiInvoice | null>(null);
  const [detailInvoice, setDetailInvoice] = useState<ApiInvoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiInvoice | null>(null);
  const [contextMenu, setContextMenu] = useState<{ invoice: ApiInvoice; position: { x: number; y: number } } | null>(null);
  const userRole = useAuthStore((s) => s.user?.role) ?? 'viewer';

  const { data: invData } = useInvoices({
    ...(filterType ? { type: filterType } : {}),
    ...(filterPaid ? { isPaid: filterPaid } : {}),
    ...(filterApproval ? { approvalStatus: filterApproval } : {}),
    ...(search ? { search } : {}),
    ...(dSupplier ? { supplier: dSupplier } : {}),
    ...(dBuyer ? { buyer: dBuyer } : {}),
    ...(dVs ? { variableSymbol: dVs } : {}),
    ...(fIssueDateFrom ? { issueDateFrom: fIssueDateFrom } : {}),
    ...(fIssueDateTo ? { issueDateTo: fIssueDateTo } : {}),
    ...(fDueDateFrom ? { dueDateFrom: fDueDateFrom } : {}),
    ...(fDueDateTo ? { dueDateTo: fDueDateTo } : {}),
    ...(fAllocation ? { allocationStatus: fAllocation } : {}),
    limit: 200,
  });
  const invoices = invData?.data ?? [];
  const { data: stats } = useInvoiceStats();
  const deleteMut = useDeleteInvoice();
  const markPaidMut = useMarkInvoicePaid();
  const pairMut = usePairInvoice();
  const importIsdocMut = useImportIsdoc();
  const exportIsdocMut = useExportIsdoc();
  const submitMut = useSubmitInvoice();
  const approveMut = useApproveInvoice();
  const isdocRef = useRef<HTMLInputElement>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showPdfExtract, setShowPdfExtract] = useState(false);

  const handleIsdocImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();

    // .isdocx is a ZIP containing the XML
    if (file.name.endsWith('.isdocx')) {
      try {
        // Try reading as text first (some .isdocx are just XML)
        if (text.trim().startsWith('<?xml') || text.trim().startsWith('<')) {
          importIsdocMut.mutate(text);
        } else {
          // Can't parse ZIP without a library — treat the raw text
          importIsdocMut.mutate(text);
        }
      } catch {
        importIsdocMut.mutate(text);
      }
    } else {
      importIsdocMut.mutate(text);
    }
    if (isdocRef.current) isdocRef.current.value = '';
  };

  const handleExport = (inv: ApiInvoice) => {
    exportIsdocMut.mutate(inv.id, {
      onSuccess: (xml) => {
        const blob = new Blob([typeof xml === 'string' ? xml : JSON.stringify(xml)], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${inv.number}.isdoc`;
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  };

  const selectStyle = {
    padding: '8px 12px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
  };

  const columns: Column<ApiInvoice>[] = [
    { key: 'number', label: 'Číslo', render: (i) => (
      <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
        {i.number}
        {i.isdocXml && <span style={{ fontSize: '0.62rem', background: '#1e3a5f', color: '#93c5fd', borderRadius: 3, padding: '0 4px', marginLeft: 4 }}>ISDOC</span>}
      </span>
    ) },
    { key: 'type', label: 'Typ', render: (i) => <Badge variant="blue">{INVOICE_TYPE_LABELS[i.type] || i.type}</Badge> },
    { key: 'supplierName', label: 'Dodavatel', render: (i) => (
      <div style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={i.supplierName || undefined}>
        <span style={{ fontWeight: 500 }}>{i.supplierName || '—'}</span>
        {i.supplierIco && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>IČO: {i.supplierIco}</div>}
      </div>
    ) },
    { key: 'buyerName', label: 'Odběratel', render: (i) => (
      <div className="hide-mobile" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={i.buyerName || undefined}>
        <span style={{ fontWeight: 500 }}>{i.buyerName || '—'}</span>
        {i.buyerIco && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>IČO: {i.buyerIco}</div>}
      </div>
    ) },
    { key: 'variableSymbol', label: 'VS', render: (i) => (
      <span className="hide-mobile" style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{i.variableSymbol || '—'}</span>
    ) },
    { key: 'description', label: 'Popis', render: (i) => <span className="text-muted text-sm">{i.description || '—'}</span> },
    { key: 'amountTotal', label: 'Částka', align: 'right', render: (i) => (
      <div>
        <div style={{ fontWeight: 600 }}>{formatKc(i.amountTotal)}</div>
        {i.vatRate > 0 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>základ {formatKc(i.amountBase)} + {i.vatRate}% DPH</div>}
      </div>
    ) },
    { key: 'dueDate', label: 'Splatnost', render: (i) => {
      if (!i.dueDate) return <span className="text-muted">—</span>;
      const overdue = !i.isPaid && i.dueDate < new Date().toISOString().slice(0, 10);
      return <span style={{ color: overdue ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: overdue ? 600 : 400 }}>{formatCzDate(i.dueDate)}</span>;
    } },
    { key: 'approvalStatus', label: 'Schválení', render: (i) => {
      if (i.isPaid) return <Badge variant="green">Uhrazeno</Badge>;
      return <Badge variant={APPROVAL_STATUS_VARIANTS[i.approvalStatus] || 'muted'}>
        {APPROVAL_STATUS_LABELS[i.approvalStatus] || i.approvalStatus}
      </Badge>;
    } },
    { key: 'allocation', label: 'Alokace', render: (i) => {
      const st = (i as any).allocationStatus
      if (st === 'allocated') return <Badge variant="green">Alokováno</Badge>
      if (st === 'partial') return <Badge variant="yellow">Částečně</Badge>
      return <Badge variant="red">Nealok.</Badge>
    } },
    { key: 'isPaid', label: 'Platba', render: (i) => {
      if (i.isPaid) return <Badge variant="green">Uhrazeno</Badge>;
      const overdue = i.dueDate && i.dueDate < new Date().toISOString().slice(0, 10);
      return <Badge variant={overdue ? 'red' : 'yellow'}>{overdue ? 'Po splatnosti' : 'Čeká'}</Badge>;
    } },
    { key: 'actions', label: '', render: (i) => {
      const btnStyle = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem' };
      const canApprove = FINANCE_ROLES.includes(userRole);
      return (
        <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
          {i.approvalStatus === 'draft' && !i.isPaid && (
            <button onClick={() => submitMut.mutate(i.id)} style={{ ...btnStyle, color: 'var(--accent)' }} title="Ke schválení" disabled={submitMut.isPending}>▶</button>
          )}
          {i.approvalStatus === 'submitted' && canApprove && (
            <button onClick={() => approveMut.mutate(i.id)} style={{ ...btnStyle, color: 'var(--success)' }} title="Schválit" disabled={approveMut.isPending}>✓</button>
          )}
          {i.approvalStatus === 'approved' && !i.isPaid && canApprove && (
            <button onClick={() => markPaidMut.mutate({ id: i.id })} style={{ ...btnStyle, color: 'var(--success)' }} title="Uhradit">$</button>
          )}
          <button onClick={(e) => { e.stopPropagation(); setContextMenu({ invoice: i, position: { x: e.clientX, y: e.clientY } }) }}
            style={{ ...btnStyle, fontWeight: 700, fontSize: '1rem', lineHeight: 1, padding: '0 4px' }} title="Akce">⋯</button>
        </div>
      );
    } },
  ];

  return (
    <div>
      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        <KpiCard label="Celkem dokladů" value={String(stats?.total ?? 0)} color="var(--accent-blue)" />
        <KpiCard label="Neuhrazené" value={String(stats?.unpaid ?? 0)} color="var(--accent-orange)" />
        <KpiCard label="Po splatnosti" value={String(stats?.overdue ?? 0)} color="var(--accent-red)" />
        <KpiCard label="Celková částka" value={formatKc(stats?.totalAmount ?? 0)} color="var(--accent-green)" />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar placeholder="Hledat doklady..." onSearch={setSearch} />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={selectStyle}>
          <option value="">Všechny typy</option>
          {Object.entries(INVOICE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterPaid} onChange={(e) => setFilterPaid(e.target.value)} style={selectStyle}>
          <option value="">Platba: Vše</option>
          <option value="false">Neuhrazené</option>
          <option value="true">Uhrazené</option>
        </select>
        <select value={filterApproval} onChange={(e) => setFilterApproval(e.target.value)} style={selectStyle}>
          <option value="">Schválení: Vše</option>
          {Object.entries(APPROVAL_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.85rem' }}>
          <FileText size={15} /> Import ISDOC
          <input ref={isdocRef} type="file" accept=".isdoc,.isdocx,.xml" onChange={handleIsdocImport} style={{ display: 'none' }} />
        </label>
        <Button onClick={() => setShowBulkImport(true)} icon={<FileText size={15} />}>Hromadný import</Button>
        <Button onClick={() => setShowPdfExtract(true)} icon={<FileText size={15} />}>Import z PDF (AI)</Button>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{ ...selectStyle, cursor: 'pointer', position: 'relative', fontSize: '0.85rem' }}
        >
          Filtry {showFilters ? '▴' : '▾'}
          {activeFilterCount > 0 && (
            <span style={{ display: 'inline-block', background: 'var(--primary, #3b82f6)', color: '#fff', borderRadius: '50%', width: 18, height: 18, textAlign: 'center', lineHeight: '18px', fontSize: '0.7rem', marginLeft: 6 }}>
              {activeFilterCount}
            </span>
          )}
        </button>
        <Button variant="primary" icon={<Plus size={15} />} data-testid="finance-doklady-add-btn" onClick={() => { setEditInvoice(null); setShowForm(true); }}>Nový doklad</Button>
      </div>

      {/* Advanced filter panel */}
      {showFilters && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14, padding: '12px 14px', background: 'var(--surface-2, var(--surface))', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.84rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 140 }}>
            <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Dodavatel</span>
            <input value={fSupplier} onChange={e => setFSupplier(e.target.value)} placeholder="Hledat…" style={{ ...selectStyle, padding: '6px 10px', fontSize: '.84rem' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 140 }}>
            <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Odběratel</span>
            <input value={fBuyer} onChange={e => setFBuyer(e.target.value)} placeholder="Hledat…" style={{ ...selectStyle, padding: '6px 10px', fontSize: '.84rem' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 100 }}>
            <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>VS</span>
            <input value={fVs} onChange={e => setFVs(e.target.value)} placeholder="VS…" style={{ ...selectStyle, padding: '6px 10px', fontSize: '.84rem' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Vystaveno od</span>
            <input type="date" value={fIssueDateFrom} onChange={e => setFIssueDateFrom(e.target.value)} style={{ ...selectStyle, padding: '6px 10px', fontSize: '.84rem' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Vystaveno do</span>
            <input type="date" value={fIssueDateTo} onChange={e => setFIssueDateTo(e.target.value)} style={{ ...selectStyle, padding: '6px 10px', fontSize: '.84rem' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Splatnost od</span>
            <input type="date" value={fDueDateFrom} onChange={e => setFDueDateFrom(e.target.value)} style={{ ...selectStyle, padding: '6px 10px', fontSize: '.84rem' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Splatnost do</span>
            <input type="date" value={fDueDateTo} onChange={e => setFDueDateTo(e.target.value)} style={{ ...selectStyle, padding: '6px 10px', fontSize: '.84rem' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Alokace</span>
            <select value={fAllocation} onChange={e => setFAllocation(e.target.value)} style={{ ...selectStyle, padding: '6px 10px', fontSize: '.84rem', cursor: 'pointer' }}>
              <option value="">Vše</option>
              {Object.entries(ALLOC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          {activeFilterCount > 0 && (
            <button onClick={clearAdvanced} style={{ alignSelf: 'flex-end', background: 'none', border: 'none', color: 'var(--primary, #3b82f6)', cursor: 'pointer', fontSize: '.82rem', padding: '6px 0' }}>
              Vymazat filtry
            </button>
          )}
        </div>
      )}

      {importIsdocMut.isSuccess && (
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: '0.85rem', color: 'var(--success)' }}>
          ISDOC doklad úspěšně importován
        </div>
      )}
      {importIsdocMut.isError && (
        <div style={{ background: '#2d1b1b', border: '1px solid #ef4444', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: '0.85rem', color: '#ef4444' }}>
          Chyba při importu ISDOC
        </div>
      )}

      <Table data={invoices} columns={columns} rowKey={(i) => i.id} onRowClick={(i) => setDetailInvoice(i)} emptyText="Žádné doklady. Přidejte nový doklad nebo importujte ISDOC." />

      {/* Detail modal */}
      {detailInvoice && (
        <InvoiceDetailModal
          invoice={detailInvoice}
          transactions={transactions}
          onClose={() => setDetailInvoice(null)}
          onEdit={() => { if (detailInvoice.approvalStatus === 'draft') { setEditInvoice(detailInvoice); setShowForm(true); setDetailInvoice(null); } }}
          onMarkPaid={(dto) => { markPaidMut.mutate({ id: detailInvoice.id, dto }, { onSuccess: () => setDetailInvoice(null) }); }}
          onPair={(transactionId) => { pairMut.mutate({ invoiceId: detailInvoice.id, transactionId }, { onSuccess: () => setDetailInvoice(null) }); }}
          onExport={() => handleExport(detailInvoice)}
          onDelete={() => { setDeleteTarget(detailInvoice); setDetailInvoice(null); }}
        />
      )}

      {/* Form modal */}
      {showForm && (
        <InvoiceForm
          invoice={editInvoice}
          transactions={transactions}
          onClose={() => { setShowForm(false); setEditInvoice(null); }}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} title="Smazat doklad"
          subtitle={deleteTarget.number}
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button onClick={() => setDeleteTarget(null)}>Zrušit</Button>
              <Button variant="danger" onClick={() => {
                deleteMut.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
              }} disabled={deleteMut.isPending}>
                {deleteMut.isPending ? 'Mažu...' : 'Smazat'}
              </Button>
            </div>
          }>
          <p style={{ fontSize: '0.9rem' }}>Opravdu smazat doklad <strong>{deleteTarget.number}</strong>?</p>
        </Modal>
      )}

      {/* Context menu */}
      {contextMenu && (
        <InvoiceContextMenu
          invoice={contextMenu.invoice}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onOpenDetail={() => { setDetailInvoice(contextMenu.invoice); setContextMenu(null) }}
          onOpenEdit={() => { if (contextMenu.invoice.approvalStatus === 'draft') { setEditInvoice(contextMenu.invoice); setShowForm(true) }; setContextMenu(null) }}
          onDelete={() => { setDeleteTarget(contextMenu.invoice); setContextMenu(null) }}
        />
      )}

      {/* Bulk import modal */}
      {showBulkImport && <IsdocImportModal onClose={() => setShowBulkImport(false)} />}
      {showPdfExtract && <PdfExtractModal onClose={() => setShowPdfExtract(false)} />}
    </div>
  );
}
