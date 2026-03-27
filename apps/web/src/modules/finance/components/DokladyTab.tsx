import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, FileText, FileCode, Upload, ChevronDown, Cpu, Clock, Sparkles } from 'lucide-react';
import { KpiCard, SearchBar, Table, Badge, Button, Modal } from '../../../shared/components';
import type { Column } from '../../../shared/components';
import { formatKc, formatCzDate } from '../../../shared/utils/format';
import type { ApiInvoice } from '../api/finance.api';
import { financeApi } from '../api/finance.api';
import type { FinTransaction } from '../types';
import { useInvoices, useInvoiceStats, useDeleteInvoice, useMarkInvoicePaid, useImportIsdoc, useExportIsdoc, usePairInvoice, useSubmitInvoice, useApproveInvoice, useAiExtractionStats, useExtractionPatterns, useDeleteExtractionPattern, useBatchList } from '../api/finance.queries';
import React from 'react';
import { useAuthStore } from '../../../core/auth';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { InvoiceForm } from './InvoiceForm';
import { InvoiceContextMenu } from './InvoiceContextMenu';
import { PdfExtractModal } from './PdfExtractModal';
import { BatchImportModal } from './BatchImportModal';

const BatchReviewModal = React.lazy(() => import('./BatchReviewModal'));

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
  const [showPdfExtract, setShowPdfExtract] = useState(false);
  const [showAiStats, setShowAiStats] = useState(false);
  const [aiStatsTab, setAiStatsTab] = useState<'stats' | 'patterns'>('stats');
  const [showBatchImport, setShowBatchImport] = useState(false);
  const [showBatchQueue, setShowBatchQueue] = useState(false);
  const [reviewBatchId, setReviewBatchId] = useState<string | null>(null);
  const { data: aiStats } = useAiExtractionStats('month');
  const { data: patterns } = useExtractionPatterns();
  const { data: batches } = useBatchList();
  const deletePatternMut = useDeleteExtractionPattern();

  const pendingBatches = (batches ?? []).filter(b => b.status === 'submitted' || b.status === 'processing');
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  const sortedInvoices = useMemo(() => {
    if (!sortBy) return invoices;
    return [...invoices].sort((a, b) => {
      let av: any, bv: any;
      switch (sortBy) {
        case 'number':          av = a.number; bv = b.number; break;
        case 'supplierName':    av = a.supplierName ?? ''; bv = b.supplierName ?? ''; break;
        case 'buyerName':       av = a.buyerName ?? ''; bv = b.buyerName ?? ''; break;
        case 'amountTotal':     av = Number(a.amountTotal); bv = Number(b.amountTotal); break;
        case 'dueDate':         av = a.dueDate ?? ''; bv = b.dueDate ?? ''; break;
        case 'approvalStatus':  av = a.approvalStatus ?? ''; bv = b.approvalStatus ?? ''; break;
        default: return 0;
      }
      let cmp = 0;
      if (typeof av === 'string' && typeof bv === 'string') {
        cmp = av.localeCompare(bv, 'cs');
      } else {
        if (av < bv) cmp = -1;
        else if (av > bv) cmp = 1;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [invoices, sortBy, sortDir]);

  const sortLabel = (label: string, column: string) =>
    `${label} ${sortBy === column ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}`;

  // Close upload menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(e.target as Node)) setUploadMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const downloadAttachment = async (invoiceId: string, type: 'pdf' | 'isdoc') => {
    try {
      if (type === 'isdoc') {
        const xml = await financeApi.invoices.exportIsdoc(invoiceId)
        const blob = new Blob([xml], { type: 'application/xml' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `faktura-${invoiceId}.isdoc`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // PDF: download via documents endpoint
        const docs = await financeApi.invoices.getDocuments(invoiceId)
        const pdf = docs.find(d => d.mimeType === 'application/pdf')
        if (pdf) {
          const { apiClient: client } = await import('../../../core/api/client')
          const res = await client.get(`/documents/${pdf.id}/download`, { responseType: 'blob' })
          const url = URL.createObjectURL(res.data as Blob)
          const a = document.createElement('a')
          a.href = url
          a.download = pdf.originalName || `faktura-${invoiceId}.pdf`
          a.click()
          URL.revokeObjectURL(url)
        }
      }
    } catch {
      // silent — download failed
    }
  }

  const handleIsdocImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      try {
        const xmlContent = await file.text();
        importIsdocMut.mutate(xmlContent);
      } catch { /* skip failed files */ }
    }
    e.target.value = '';
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
    { key: 'number', label: sortLabel('Číslo', 'number'), sortable: true, width: 130, render: (i) => (
      <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
        {i.number}
        {i.isdocXml && <span style={{ fontSize: '0.62rem', background: '#1e3a5f', color: '#93c5fd', borderRadius: 3, padding: '0 4px', marginLeft: 4 }}>ISDOC</span>}
      </span>
    ) },
    { key: 'type', label: 'Typ', width: 80, render: (i) => <Badge variant="blue">{INVOICE_TYPE_LABELS[i.type] || i.type}</Badge> },
    { key: 'supplierName', label: sortLabel('Dodavatel', 'supplierName'), sortable: true, width: 180, render: (i) => (
      <div style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={i.supplierName || undefined}>
        <span style={{ fontWeight: 500 }}>{i.supplierName || '—'}</span>
        {i.supplierIco && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>IČO: {i.supplierIco}</div>}
      </div>
    ) },
    { key: 'buyerName', label: sortLabel('Odběratel', 'buyerName'), sortable: true, width: 160, render: (i) => (
      <div className="hide-mobile" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={i.buyerName || undefined}>
        <span style={{ fontWeight: 500 }}>{i.buyerName || '—'}</span>
        {i.buyerIco && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>IČO: {i.buyerIco}</div>}
      </div>
    ) },
    { key: 'variableSymbol', label: 'VS', width: 110, render: (i) => (
      <span className="hide-mobile" style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{i.variableSymbol || '—'}</span>
    ) },
    { key: 'description', label: 'Popis', width: 'auto', render: (i) => <span className="text-muted text-sm">{i.description || '—'}</span> },
    { key: 'amountTotal', label: sortLabel('Částka', 'amountTotal'), align: 'right', sortable: true, width: 130, render: (i) => (
      <div>
        <div style={{ fontWeight: 600 }}>{formatKc(i.amountTotal)}</div>
        {i.vatRate > 0 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>základ {formatKc(i.amountBase)} + {i.vatRate}% DPH</div>}
      </div>
    ) },
    { key: 'dueDate', label: sortLabel('Splatnost', 'dueDate'), sortable: true, width: 110, render: (i) => {
      if (!i.dueDate) return <span className="text-muted">—</span>;
      const overdue = !i.isPaid && i.dueDate < new Date().toISOString().slice(0, 10);
      return <span style={{ color: overdue ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: overdue ? 600 : 400 }}>{formatCzDate(i.dueDate)}</span>;
    } },
    { key: 'approvalStatus', label: sortLabel('Schválení', 'approvalStatus'), sortable: true, width: 110, render: (i) => {
      if (i.isPaid) return <Badge variant="green">Uhrazeno</Badge>;
      return <Badge variant={APPROVAL_STATUS_VARIANTS[i.approvalStatus] || 'muted'}>
        {APPROVAL_STATUS_LABELS[i.approvalStatus] || i.approvalStatus}
      </Badge>;
    } },
    { key: 'allocation', label: 'Alokace', width: 90, render: (i) => {
      const st = (i as any).allocationStatus
      if (st === 'allocated') return <Badge variant="green">Alokováno</Badge>
      if (st === 'partial') return <Badge variant="yellow">Částečně</Badge>
      return <Badge variant="red">Nealok.</Badge>
    } },
    { key: 'isPaid', label: 'Platba', width: 90, render: (i) => {
      if (i.isPaid) return <Badge variant="green">Uhrazeno</Badge>;
      const overdue = i.dueDate && i.dueDate < new Date().toISOString().slice(0, 10);
      return <Badge variant={overdue ? 'red' : 'yellow'}>{overdue ? 'Po splatnosti' : 'Čeká'}</Badge>;
    } },
    { key: 'attachments', label: '', width: 60, render: (i) => {
      const abtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' };
      return (
        <div style={{ display: 'flex', gap: 2 }} onClick={(e) => e.stopPropagation()}>
          {i.hasPdf && (
            <button onClick={() => downloadAttachment(i.id, 'pdf')} title="Stáhnout PDF" style={{ ...abtnStyle, color: '#E24B4A' }}>
              <FileText size={15} />
            </button>
          )}
          {i.hasIsdoc && (
            <button onClick={() => downloadAttachment(i.id, 'isdoc')} title="Stáhnout ISDOC" style={{ ...abtnStyle, color: '#1D9E75' }}>
              <FileCode size={15} />
            </button>
          )}
        </div>
      );
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
        <select value={fAllocation} onChange={(e) => setFAllocation(e.target.value)} style={selectStyle}>
          <option value="">Alokace: Vše</option>
          <option value="unallocated">Nealokováno</option>
          <option value="partial">Částečně</option>
          <option value="allocated">Alokováno</option>
        </select>
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

        {/* Upload dropdown */}
        <input ref={isdocRef} type="file" accept=".isdoc,.isdocx,.xml" multiple style={{ display: 'none' }} onChange={handleIsdocImport} />
        <div style={{ position: 'relative' }} ref={uploadMenuRef}>
          <button
            onClick={() => setUploadMenuOpen(o => !o)}
            aria-haspopup="menu" aria-expanded={uploadMenuOpen}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text)' }}
          >
            <Upload size={15} /> Nahrát doklad <ChevronDown size={13} />
          </button>
          {uploadMenuOpen && (
            <div role="menu" onKeyDown={e => { if (e.key === 'Escape') setUploadMenuOpen(false); }} style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: 'var(--color-background-primary, #ffffff)', border: '0.5px solid var(--color-border-secondary, var(--border))', borderRadius: 8, minWidth: 240, zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', isolation: 'isolate' }}>
              <button type="button" role="menuitem" onClick={() => { setUploadMenuOpen(false); isdocRef.current?.click(); }} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '0.5px solid var(--color-border-secondary, var(--border))' }}>
                <FileText size={16} style={{ marginTop: 2, color: '#1D9E75', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>ISDOC</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Importovat faktury z XML</div>
                </div>
              </button>
              <button type="button" role="menuitem" onClick={() => { setUploadMenuOpen(false); setShowPdfExtract(true); }} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '0.5px solid var(--color-border-secondary, var(--border))' }}>
                <Cpu size={16} style={{ marginTop: 2, color: '#1D9E75', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>PDF (AI extrakce)</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Vytěžit data pomocí AI</div>
                </div>
              </button>
              <button onClick={() => { setUploadMenuOpen(false); setShowBatchImport(true); }} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <Clock size={16} style={{ marginTop: 2, color: 'var(--text-muted)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Dávkově <span style={{ marginLeft: 6, fontSize: 11, background: '#E1F5EE', color: '#0F6E56', padding: '1px 6px', borderRadius: 4 }}>-50%</span></div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Zpracování do 24 hodin</div>
                </div>
              </button>
            </div>
          )}
        </div>

        <Button variant="primary" icon={<Plus size={15} />} data-testid="finance-doklady-add-btn" onClick={() => { setEditInvoice(null); setShowForm(true); }}>Nový doklad</Button>
      </div>

      {/* AI stats widget */}
      {aiStats && aiStats.totalExtractions > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '6px 14px', background: 'var(--surface-2, var(--surface))', borderRadius: 6, border: '1px solid var(--border)', fontSize: '.82rem', color: 'var(--text-muted)' }}>
          <Sparkles size={13} />
          <span>AI extrakce tento měsíc: <strong style={{ color: 'var(--text)' }}>{aiStats.totalExtractions} faktur</strong> · {aiStats.totalCostCzk.toFixed(1)} Kč · Haiku 4.5</span>
          <span style={{ flex: 1 }} />
          <button onClick={() => setShowAiStats(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary, #14b8a6)', fontSize: '.82rem' }}>Podrobnosti</button>
        </div>
      )}

      {/* Pending batches widget */}
      {pendingBatches.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '6px 14px', background: 'rgba(245, 158, 11, 0.06)', borderRadius: 6, border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '.82rem', color: 'var(--text-muted)' }}>
          <Clock size={13} />
          <span>
            Dávkové zpracování: <strong style={{ color: 'var(--text)' }}>
              {pendingBatches.reduce((s, b) => s + b.totalCount, 0)} faktur
            </strong> · čeká na výsledky
          </span>
          <span style={{ flex: 1 }} />
          <button onClick={() => setShowBatchQueue(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary, #14b8a6)', fontSize: '.82rem' }}>Zobrazit</button>
        </div>
      )}

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

      <Table data={sortedInvoices} columns={columns} rowKey={(i) => i.id} onRowClick={(i) => setDetailInvoice(i)} onSort={handleSort} emptyText="Žádné doklady. Přidejte nový doklad nebo importujte ISDOC." />

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

      {showPdfExtract && <PdfExtractModal onClose={() => setShowPdfExtract(false)} />}

      {/* AI extraction stats modal */}
      {showAiStats && aiStats && (
        <Modal open onClose={() => { setShowAiStats(false); setAiStatsTab('stats'); }} wide title="Statistiky AI extrakce faktur">
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
            {([['stats', 'Statistiky'], ['patterns', `Vzory dodavatelů${patterns?.length ? ` (${patterns.length})` : ''}`]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setAiStatsTab(key)}
                style={{
                  padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: '.84rem', fontWeight: 500,
                  background: 'none', color: aiStatsTab === key ? 'var(--primary, #14b8a6)' : 'var(--text-muted)',
                  borderBottom: aiStatsTab === key ? '2px solid var(--primary, #14b8a6)' : '2px solid transparent',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {aiStatsTab === 'stats' && (<>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ textAlign: 'center', padding: 12, background: 'var(--surface-2, var(--surface))', borderRadius: 8 }}>
              <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Extrahováno</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{aiStats.totalExtractions}</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, background: 'var(--surface-2, var(--surface))', borderRadius: 8 }}>
              <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Náklady</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{aiStats.totalCostCzk.toFixed(2)} Kč</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, background: 'var(--surface-2, var(--surface))', borderRadius: 8 }}>
              <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Průměr/faktura</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{aiStats.avgCostPerInvoice.toFixed(2)} Kč</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, background: 'var(--surface-2, var(--surface))', borderRadius: 8 }}>
              <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Úspěšnost</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{aiStats.totalExtractions > 0 ? Math.round((aiStats.successfulExtractions / aiStats.totalExtractions) * 100) : 0}%</div>
            </div>
          </div>
          {aiStats.byModel.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Dle modelu</div>
              <table style={{ width: '100%', fontSize: '.84rem', borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Model', 'Počet', 'Tokeny', 'Náklady'].map(h => <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600, fontSize: '.78rem', color: 'var(--text-muted)' }}>{h}</th>)}
                </tr></thead>
                <tbody>{aiStats.byModel.map(m => (
                  <tr key={m.model} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '4px 8px' }}>{m.model.replace('claude-', '').replace('-20251001', '')}</td>
                    <td style={{ padding: '4px 8px' }}>{m.count}</td>
                    <td style={{ padding: '4px 8px' }}>{m.tokens.toLocaleString()}</td>
                    <td style={{ padding: '4px 8px' }}>${m.costUsd.toFixed(4)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <div>
            <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Dle jistoty</div>
            <div style={{ display: 'flex', gap: 12 }}>
              {([['high', 'Vysoká', 'green'], ['medium', 'Střední', 'yellow'], ['low', 'Nízká', 'red']] as const).map(([k, label, variant]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.84rem' }}>
                  <Badge variant={variant}>{label}</Badge>
                  <span>{aiStats.byConfidence[k]}{aiStats.totalExtractions > 0 ? ` (${Math.round((aiStats.byConfidence[k] / aiStats.totalExtractions) * 100)}%)` : ''}</span>
                </div>
              ))}
            </div>
          </div>
          </>)}

          {aiStatsTab === 'patterns' && (
            <div>
              <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: 14, padding: '8px 12px', background: 'var(--surface-2, var(--surface))', borderRadius: 6 }}>
                Systém se učí z vašich korekcí. Čím více faktur zpracujete, tím přesnější extrakce bude pro opakující se dodavatele.
              </div>
              {patterns && patterns.length > 0 ? (
                <table style={{ width: '100%', fontSize: '.84rem', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Dodavatel', 'IČO', 'Použito', 'Naposledy', 'Akce'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, fontSize: '.78rem', color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{patterns.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 8px' }}>{p.supplierName || '—'}</td>
                      <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: '.8rem' }}>{p.supplierIco}</td>
                      <td style={{ padding: '6px 8px' }}>{p.usageCount}x</td>
                      <td style={{ padding: '6px 8px', fontSize: '.8rem', color: 'var(--text-muted)' }}>
                        {p.lastUsedAt ? formatCzDate(p.lastUsedAt) : '—'}
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <button
                          onClick={() => { if (confirm(`Smazat vzor pro ${p.supplierName || p.supplierIco}?`)) deletePatternMut.mutate(p.supplierIco); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '.8rem' }}
                        >
                          Smazat
                        </button>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '.84rem' }}>
                  Zatím žádné vzory. Vzory se vytvoří automaticky při uložení opravené faktury.
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Batch import modal */}
      {showBatchImport && (
        <BatchImportModal
          onClose={() => setShowBatchImport(false)}
          onShowQueue={() => setShowBatchQueue(true)}
        />
      )}

      {/* Batch queue modal */}
      {showBatchQueue && (
        <Modal open onClose={() => setShowBatchQueue(false)} wide title="Fronta dávkových extrakcí">
          {(batches ?? []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '.84rem' }}>
              Žádné dávkové extrakce.
            </div>
          ) : (
            <table style={{ width: '100%', fontSize: '.84rem', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Vytvořeno', 'Faktur', 'Stav', 'Náklady', 'Akce'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, fontSize: '.78rem', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{(batches ?? []).map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 8px', fontSize: '.8rem' }}>{formatCzDate(b.createdAt)}</td>
                  <td style={{ padding: '6px 8px' }}>{b.totalCount}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <Badge variant={
                      b.status === 'completed' ? 'green' :
                      b.status === 'failed' ? 'red' :
                      b.status === 'submitted' || b.status === 'processing' ? 'yellow' : 'muted'
                    }>
                      {b.status === 'completed' ? 'Dokončeno' :
                       b.status === 'failed' ? 'Selhalo' :
                       b.status === 'submitted' ? 'Odesláno' :
                       b.status === 'processing' ? 'Zpracovává' : 'Čeká'}
                    </Badge>
                  </td>
                  <td style={{ padding: '6px 8px', fontSize: '.8rem' }}>
                    {b.totalCostUsd != null ? `${(Number(b.totalCostUsd) * 23).toFixed(2)} Kč` : '—'}
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    {b.status === 'completed' && (
                      <button
                        onClick={() => { setShowBatchQueue(false); setReviewBatchId(b.id); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary, #14b8a6)', fontSize: '.82rem' }}
                      >
                        Zkontrolovat
                      </button>
                    )}
                    {(b.status === 'submitted' || b.status === 'processing') && (
                      <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>Čeká...</span>
                    )}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </Modal>
      )}

      {/* Batch review modal */}
      {reviewBatchId && (
        <React.Suspense fallback={null}>
          <BatchReviewModal batchId={reviewBatchId} onClose={() => setReviewBatchId(null)} />
        </React.Suspense>
      )}
    </div>
  );
}
