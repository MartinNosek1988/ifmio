import { useState, useEffect, useRef } from 'react'
import { Button, Badge, EmptyState, Modal } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { useProperties } from '../../properties/use-properties'
import {
  useSipoConfig, useSipoPreview, useSipoHistory, useSipoPayers,
  useCreateSipoConfig, useUpdateSipoConfig, useGenerateSipo, useImportSipoPayments, useUpdateSipoPayer,
} from './sipo.queries'

function fmtCzk(n: number) {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 0 }).format(n)
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  GENERATED: { label: 'Vygenerováno', color: 'muted' },
  SENT: { label: 'Odesláno', color: 'blue' },
  ACCEPTED: { label: 'Přijato', color: 'green' },
  REJECTED: { label: 'Odmítnuto', color: 'red' },
  PARTIALLY_OK: { label: 'Částečně', color: 'yellow' },
}

function getDefaultPeriod() {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return `${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`
}

export default function SipoTab() {
  const toast = useToast()
  const { data: properties = [] } = useProperties()
  const [propertyId, setPropertyId] = useState('')
  const [period, setPeriod] = useState(getDefaultPeriod())
  const [showConfig, setShowConfig] = useState(false)
  const [configForm, setConfigForm] = useState({ recipientNumber: '', feeCode: '', deliveryMode: 'FULL_REGISTER', encoding: 'WIN1250' })
  const [editingPayer, setEditingPayer] = useState<{ id: string; sipoNumber: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!propertyId && properties.length > 0) setPropertyId(properties[0].id)
  }, [properties, propertyId])

  const { data: config } = useSipoConfig(propertyId || undefined)
  const { data: preview } = useSipoPreview(config ? propertyId : undefined, period)
  const { data: history = [] } = useSipoHistory(propertyId || undefined)
  const { data: payers = [] } = useSipoPayers(propertyId || undefined)
  const createConfigMut = useCreateSipoConfig()
  const updateConfigMut = useUpdateSipoConfig()
  const generateMut = useGenerateSipo()
  const importMut = useImportSipoPayments()
  const updatePayerMut = useUpdateSipoPayer()

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--text)', fontSize: '.85rem', width: '100%', boxSizing: 'border-box',
  }
  const sectionStyle: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
    padding: 16, marginBottom: 16,
  }
  const thStyle: React.CSSProperties = { padding: '8px 12px', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }
  const tdStyle: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: '.85rem' }

  const handleSaveConfig = () => {
    const onSuccess = () => { toast.success('SIPO konfigurace uložena'); setShowConfig(false) }
    const onError = () => toast.error('Chyba při ukládání konfigurace')
    if (config) {
      updateConfigMut.mutate({ id: config.id, ...configForm }, { onSuccess, onError })
    } else {
      createConfigMut.mutate({ propertyId, ...configForm }, { onSuccess, onError })
    }
  }

  const handleOpenConfigModal = () => {
    if (config) {
      setConfigForm({
        recipientNumber: config.recipientNumber,
        feeCode: config.feeCode,
        deliveryMode: config.deliveryMode,
        encoding: config.encoding,
      })
    }
    setShowConfig(true)
  }

  const handleGenerate = () => {
    generateMut.mutate({ propertyId, period }, {
      onSuccess: (data: any) => {
        // Download files from base64
        const zmBlob = new Blob([Uint8Array.from(atob(data.changeFile), c => c.charCodeAt(0))], { type: 'text/plain' })
        const opBlob = new Blob([Uint8Array.from(atob(data.coverFile), c => c.charCodeAt(0))], { type: 'text/plain' })
        for (const [blob, name] of [[zmBlob, data.fileName], [opBlob, data.coverFileName]] as const) {
          const a = document.createElement('a')
          const url = URL.createObjectURL(blob)
          a.href = url
          a.download = name
          a.click()
          setTimeout(() => URL.revokeObjectURL(url), 0)
        }
        toast.success(`Vygenerováno: ${data.recordCount} plátců, ${fmtCzk(data.totalAmount)}`)
      },
      onError: () => toast.error('Generování selhalo'),
    })
  }

  const handleImportPayments = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    importMut.mutate({ propertyId, file }, {
      onSuccess: (res: any) => toast.success(`Importováno: ${res.imported} plateb, zaúčtováno: ${res.matched}`),
      onError: () => toast.error('Import selhal'),
    })
    if (fileRef.current) fileRef.current.value = ''
  }

  if (!propertyId) return <EmptyState title="Žádná nemovitost" />

  return (
    <div data-testid="sipo-tab">
      {/* Property selector */}
      {properties.length > 1 && (
        <select value={propertyId} onChange={e => setPropertyId(e.target.value)} style={{ ...inputStyle, marginBottom: 16, maxWidth: 300 }}>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}

      {/* Config section */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: '.95rem' }}>Konfigurace SIPO</div>
          <Button size="sm" onClick={handleOpenConfigModal} data-testid="sipo-config-save">
            {config ? 'Upravit' : 'Nastavit'}
          </Button>
        </div>
        {config ? (
          <div style={{ display: 'flex', gap: 16, fontSize: '.85rem' }}>
            <span>Číslo Příjemce: <strong style={{ fontFamily: 'monospace' }}>{config.recipientNumber}</strong></span>
            <span>Kód poplatku: <strong style={{ fontFamily: 'monospace' }}>{config.feeCode}</strong></span>
            <Badge variant={config.isActive ? 'green' : 'muted'}>{config.isActive ? 'Aktivní' : 'Neaktivní'}</Badge>
          </div>
        ) : (
          <div className="text-muted text-sm">SIPO není nakonfigurováno. Zadejte Číslo Příjemce a Kód poplatku.</div>
        )}
      </div>

      {/* Generate section */}
      {config && (
        <div style={sectionStyle}>
          <div style={{ fontWeight: 600, fontSize: '.95rem', marginBottom: 12 }}>Generování předpisů</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
            <div>
              <label className="form-label">Období (MMRRRR)</label>
              <input value={period} onChange={e => setPeriod(e.target.value)} placeholder="042026" maxLength={6} style={{ ...inputStyle, width: 120 }} data-testid="sipo-period-picker" />
            </div>
            <Button onClick={() => {}} data-testid="sipo-preview-btn">Náhled</Button>
            <Button variant="primary" onClick={handleGenerate} disabled={generateMut.isPending} data-testid="sipo-generate-btn">
              {generateMut.isPending ? 'Generuji...' : 'Stáhnout ZM + OP soubory'}
            </Button>
          </div>

          {preview && (
            <div data-testid="sipo-preview-table">
              <div style={{ fontSize: '.85rem', marginBottom: 8 }}>
                Plátců: <strong>{preview.validPayers}</strong> / {preview.totalPayers} | Celkem: <strong>{fmtCzk(preview.totalAmount)}</strong>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={thStyle}>Jednotka</th>
                  <th style={thStyle}>Vlastník</th>
                  <th style={thStyle}>Spoj. číslo</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Předpis</th>
                  <th style={thStyle}>Stav</th>
                </tr></thead>
                <tbody>
                  {preview.items.map((item, i) => (
                    <tr key={i}>
                      <td style={tdStyle}>{item.unitName}</td>
                      <td style={tdStyle}>{item.residentName}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{item.sipoNumber || '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmtCzk(item.amount)}</td>
                      <td style={tdStyle}>
                        {item.warnings.length > 0 ? (
                          <Badge variant="yellow">{item.warnings[0]}</Badge>
                        ) : (
                          <Badge variant="green">OK</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Import section */}
      {config && (
        <div style={sectionStyle}>
          <div style={{ fontWeight: 600, fontSize: '.95rem', marginBottom: 12 }}>Import plateb</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--surface)', fontSize: '.85rem' }}>
              Nahrát ZA soubor (zaplacené platby)
              <input ref={fileRef} type="file" accept=".txt,.dat" onChange={handleImportPayments} style={{ display: 'none' }} data-testid="sipo-import-payments-upload" />
            </label>
            {importMut.isPending && <span className="text-muted text-sm">Importuji...</span>}
          </div>
        </div>
      )}

      {/* Payers section */}
      <div style={sectionStyle} data-testid="sipo-payers-table">
        <div style={{ fontWeight: 600, fontSize: '.95rem', marginBottom: 12 }}>Správa spojovacích čísel</div>
        {payers.length === 0 ? (
          <div className="text-muted text-sm">Žádní plátci. Přidejte bydlící k jednotkám.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={thStyle}>Jednotka</th>
              <th style={thStyle}>Vlastník</th>
              <th style={thStyle}>Spojovací číslo</th>
              <th style={thStyle}>Akce</th>
            </tr></thead>
            <tbody>
              {payers.map((p: any) => (
                <tr key={p.id}>
                  <td style={tdStyle}>{p.unit?.name}</td>
                  <td style={tdStyle}>{p.resident?.firstName} {p.resident?.lastName}</td>
                  <td style={tdStyle}>
                    {editingPayer && editingPayer.id === p.id ? (
                      <input value={editingPayer.sipoNumber} onChange={e => setEditingPayer({ id: editingPayer.id, sipoNumber: e.target.value })}
                        maxLength={10} placeholder="0000000000" style={{ ...inputStyle, width: 130, fontFamily: 'monospace' }} data-testid="sipo-payer-edit" />
                    ) : (
                      <span style={{ fontFamily: 'monospace' }}>{p.sipoNumber || <span className="text-muted">—</span>}</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {editingPayer && editingPayer.id === p.id ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button size="sm" variant="primary" onClick={() => {
                          updatePayerMut.mutate({ occupancyId: p.id, sipoNumber: editingPayer!.sipoNumber }, {
                            onSuccess: () => { toast.success('Uloženo'); setEditingPayer(null) },
                          })
                        }}>Uložit</Button>
                        <Button size="sm" onClick={() => setEditingPayer(null)}>Zrušit</Button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => setEditingPayer({ id: p.id, sipoNumber: p.sipoNumber || '' })}>Upravit</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* History section */}
      {history.length > 0 && (
        <div style={sectionStyle} data-testid="sipo-history-table">
          <div style={{ fontWeight: 600, fontSize: '.95rem', marginBottom: 12 }}>Historie exportů</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={thStyle}>Období</th>
              <th style={thStyle}>Datum</th>
              <th style={thStyle}>Plátců</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Suma</th>
              <th style={thStyle}>Stav</th>
            </tr></thead>
            <tbody>
              {history.map((h: any) => {
                const st = STATUS_LABELS[h.status] ?? { label: h.status, color: 'muted' }
                return (
                  <tr key={h.id}>
                    <td style={tdStyle}>{h.period}</td>
                    <td style={tdStyle}>{new Date(h.createdAt).toLocaleDateString('cs-CZ')}</td>
                    <td style={tdStyle}>{h.recordCount}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtCzk(Number(h.totalAmount))}</td>
                    <td style={tdStyle}><Badge variant={st.color as any}>{st.label}</Badge></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Config modal */}
      {showConfig && (
        <Modal open onClose={() => setShowConfig(false)} title="SIPO konfigurace" data-testid="sipo-config-form"
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => setShowConfig(false)}>Zrušit</Button>
            <Button variant="primary" onClick={handleSaveConfig} disabled={createConfigMut.isPending || updateConfigMut.isPending}>
              {(createConfigMut.isPending || updateConfigMut.isPending) ? 'Ukládám...' : 'Uložit'}
            </Button>
          </div>}>
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Číslo Příjemce (6 číslic) *</label>
            <input value={configForm.recipientNumber} onChange={e => setConfigForm(f => ({ ...f, recipientNumber: e.target.value }))}
              maxLength={6} placeholder="123456" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Kód poplatku (3 číslice) *</label>
            <input value={configForm.feeCode} onChange={e => setConfigForm(f => ({ ...f, feeCode: e.target.value }))}
              maxLength={3} placeholder="001" style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Režim</label>
              <select value={configForm.deliveryMode} onChange={e => setConfigForm(f => ({ ...f, deliveryMode: e.target.value }))} style={inputStyle}>
                <option value="FULL_REGISTER">Celý kmen</option>
                <option value="CHANGES_ONLY">Jen změny</option>
              </select>
            </div>
            <div>
              <label className="form-label">Kódování</label>
              <select value={configForm.encoding} onChange={e => setConfigForm(f => ({ ...f, encoding: e.target.value }))} style={inputStyle}>
                <option value="WIN1250">Windows-1250</option>
                <option value="CP852">CP852 (LATIN2)</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
