import { useState } from 'react'
import { Download } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button, Badge, EmptyState } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { useProperties } from '../../properties/use-properties'
// Bank accounts available for future per-account filtering
// import { useBankAccounts } from '../api/finance.queries'
import { apiClient } from '../../../core/api/client'

function fmtCzk(n: number) {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 0 }).format(n)
}

function getDefaultMonth() {
  const d = new Date()
  const y = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear()
  const m = d.getMonth() === 0 ? 12 : d.getMonth()
  return {
    from: `${y}-${String(m).padStart(2, '0')}-01`,
    to: `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate()}`,
  }
}

export default function PohodaExportSection() {
  const toast = useToast()
  const { data: properties = [] } = useProperties()
  const defaults = getDefaultMonth()
  const [propertyId, setPropertyId] = useState('')
  const [dateFrom, setDateFrom] = useState(defaults.from)
  const [dateTo, setDateTo] = useState(defaults.to)
  const [includeInvoices, setIncludeInvoices] = useState(true)
  const [includePrescriptions, setIncludePrescriptions] = useState(true)
  const [includeBank, setIncludeBank] = useState(true)
  const [downloading, setDownloading] = useState(false)

  // Auto-select first property
  if (!propertyId && properties.length > 0) setPropertyId(properties[0].id)

  const exportType = includeInvoices && includePrescriptions ? 'all' : includeInvoices ? 'invoices' : includePrescriptions ? 'prescriptions' : 'all'

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['pohoda-preview', propertyId, dateFrom, dateTo, exportType, includeBank],
    queryFn: () => apiClient.get(`/properties/${propertyId}/accounting/export/pohoda/preview`, {
      params: { from: dateFrom, to: dateTo, type: exportType, includeBank: String(includeBank) },
    }).then(r => r.data),
    enabled: !!propertyId && !!dateFrom && !!dateTo,
  })

  const handleDownload = async () => {
    if (!propertyId) return
    setDownloading(true)
    try {
      const response = await apiClient.get(`/properties/${propertyId}/accounting/export/pohoda`, {
        params: { from: dateFrom, to: dateTo, type: exportType, includeBank: String(includeBank) },
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pohoda_export_${dateFrom.slice(0, 7)}.xml`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export stažen')
    } catch {
      toast.error('Export se nezdařil')
    } finally {
      setDownloading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--text)', fontSize: '.85rem',
  }

  if (!propertyId && properties.length === 0) {
    return <EmptyState title="Žádná nemovitost" description="Nejprve vytvořte nemovitost." />
  }

  return (
    <div data-testid="pohoda-export-tab">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>Export do Pohody</div>
          <div className="text-muted text-sm">Stormware Pohoda XML formát (Windows-1250)</div>
        </div>
        <Badge variant="blue">Pohoda XML</Badge>
      </div>

      {/* Filters */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
        padding: 16, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          {properties.length > 1 && (
            <div>
              <label className="form-label">Nemovitost</label>
              <select value={propertyId} onChange={e => setPropertyId(e.target.value)} style={inputStyle} data-testid="pohoda-export-property-select">
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="form-label">Od</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} data-testid="pohoda-export-date-from" />
          </div>
          <div>
            <label className="form-label">Do</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} data-testid="pohoda-export-date-to" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, fontSize: '.85rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={includeInvoices} onChange={e => setIncludeInvoices(e.target.checked)} data-testid="pohoda-export-invoices-toggle" />
            Faktury (vydané + přijaté)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={includePrescriptions} onChange={e => setIncludePrescriptions(e.target.checked)} />
            Předpisy
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={includeBank} onChange={e => setIncludeBank(e.target.checked)} data-testid="pohoda-export-bank-toggle" />
            Bankovní pohyby
          </label>
        </div>
      </div>

      {/* Preview */}
      {preview && !previewLoading && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
          padding: 16, marginBottom: 16,
        }} data-testid="pohoda-export-preview-summary">
          <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '.9rem' }}>Náhled exportu</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, fontSize: '.85rem' }}>
            {preview.invoiceCount > 0 && (
              <div style={{ padding: 10, background: 'var(--surface-2, #f9fafb)', borderRadius: 8, textAlign: 'center' }}>
                <div className="text-muted">Faktury</div>
                <div style={{ fontWeight: 600 }}>{preview.invoiceCount} dokladů</div>
                <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>{fmtCzk(preview.invoiceAmount)}</div>
              </div>
            )}
            {preview.prescriptionCount > 0 && (
              <div style={{ padding: 10, background: 'var(--surface-2, #f9fafb)', borderRadius: 8, textAlign: 'center' }}>
                <div className="text-muted">Předpisy</div>
                <div style={{ fontWeight: 600 }}>{preview.prescriptionCount} předpisů</div>
                <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>{fmtCzk(preview.prescriptionAmount)}</div>
              </div>
            )}
            {preview.bankTransactionCount > 0 && (
              <div style={{ padding: 10, background: 'var(--surface-2, #f9fafb)', borderRadius: 8, textAlign: 'center' }}>
                <div className="text-muted">Banka</div>
                <div style={{ fontWeight: 600 }}>{preview.bankTransactionCount} pohybů</div>
                <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>{fmtCzk(preview.bankAmount)}</div>
              </div>
            )}
          </div>
          {preview.totalRecords === 0 && (
            <div className="text-muted" style={{ textAlign: 'center', padding: 16 }}>
              Žádné doklady k exportu pro vybrané období.
            </div>
          )}
          <div className="text-muted text-sm" style={{ marginTop: 8 }}>
            Období: {preview.dateRange} · Celkem {preview.totalRecords} záznamů
          </div>
        </div>
      )}

      {previewLoading && <div className="text-muted" style={{ padding: 16, textAlign: 'center' }}>Načítání náhledu...</div>}

      {/* Download button */}
      <Button
        variant="primary"
        icon={<Download size={16} />}
        onClick={handleDownload}
        disabled={downloading || !propertyId || (preview?.totalRecords ?? 0) === 0}
        data-testid="pohoda-export-download-btn"
      >
        {downloading ? 'Stahování...' : 'Stáhnout XML pro Pohodu'}
      </Button>

      {/* Help text */}
      <div style={{
        marginTop: 16, padding: '10px 14px', borderRadius: 8,
        background: 'rgba(59,130,246,.06)', border: '1px solid rgba(59,130,246,.15)',
        fontSize: '.8rem', color: 'var(--text-muted)',
      }}>
        Soubor importujte v Pohodě přes <strong>Soubor → Datová komunikace → XML import/export</strong>.
        Obě Pohody musí mít stejné IČO a verzi. Export je kódován v Windows-1250.
      </div>
    </div>
  )
}
