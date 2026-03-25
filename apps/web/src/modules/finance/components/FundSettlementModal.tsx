import { useState } from 'react'
import { Modal, Button } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { usePropertyComponents } from '../api/components.queries'
import type { PrescriptionComponentSummary } from '../api/components.api'

interface Props {
  propertyId: string
  preselectedComponentId?: string
  onClose: () => void
}

export default function FundSettlementModal({ propertyId, preselectedComponentId, onClose }: Props) {
  const toast = useToast()
  const { data: allComponents = [] } = usePropertyComponents(propertyId, true)
  const fundComponents = allComponents.filter((c: PrescriptionComponentSummary) => c.componentType === 'FUND')

  const currentYear = new Date().getFullYear()
  const [componentId, setComponentId] = useState(preselectedComponentId ?? '')
  const [year, setYear] = useState(String(currentYear - 1))
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    if (!componentId || !year) {
      toast.error('Vyberte složku a rok.')
      return
    }

    setLoading(true)
    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? '/api/v1'
      const token = sessionStorage.getItem('ifmio:access_token')
      const url = `${baseUrl}/reports/fund-settlement?propertyId=${propertyId}&componentId=${componentId}&year=${year}&format=pdf`

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(err?.message ?? `HTTP ${response.status}`)
      }

      const blob = await response.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `vyuctovani-fondu-${year}.pdf`
      link.click()
      URL.revokeObjectURL(link.href)
      toast.success('PDF vygenerováno.')
      onClose()
    } catch (e: any) {
      toast.error(`Chyba: ${e.message ?? 'Generování PDF se nezdařilo.'}`)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))',
    color: 'var(--text)', boxSizing: 'border-box', fontSize: '.85rem', cursor: 'pointer',
  }

  return (
    <Modal open onClose={onClose} title="Vyúčtování fondu" footer={
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button onClick={onClose}>Zavřít</Button>
        <Button variant="primary" onClick={handleGenerate} disabled={loading || !componentId}>
          {loading ? 'Generuji…' : 'Generovat PDF'}
        </Button>
      </div>
    }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="form-label">Složka (fond)</label>
          <select
            value={componentId}
            onChange={e => setComponentId(e.target.value)}
            disabled={!!preselectedComponentId}
            style={inputStyle}
          >
            <option value="">— vyberte —</option>
            {fundComponents.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</option>
            ))}
          </select>
          {fundComponents.length === 0 && (
            <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Žádná složka typu Fond nebyla nalezena pro tuto nemovitost.
            </div>
          )}
        </div>

        <div>
          <label className="form-label">Rok</label>
          <select value={year} onChange={e => setYear(e.target.value)} style={inputStyle}>
            {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  )
}
