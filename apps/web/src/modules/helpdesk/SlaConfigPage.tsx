import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import { Button, Badge, LoadingState, ErrorState, EmptyState } from '../../shared/components'
import { useSlaPolicies, useUpsertSlaPolicy, useDeleteSlaPolicy } from './api/helpdesk.queries'
import { useProperties } from '../properties/use-properties'
import type { ApiSlaPolicy, UpsertSlaPolicyPayload } from './api/helpdesk.api'

const PRIORITY_LABELS = { low: 'Nízká', medium: 'Normální', high: 'Vysoká', urgent: 'Urgentní' } as const
const PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const

const DEFAULT_VALUES: Record<string, { response: number; resolution: number }> = {
  low:    { response: 72,  resolution: 336 },
  medium: { response: 24,  resolution: 120 },
  high:   { response: 8,   resolution: 48 },
  urgent: { response: 1,   resolution: 8 },
}

function formatHours(h: number): string {
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  const rem = h % 24
  return rem ? `${d}d ${rem}h` : `${d}d`
}

export default function SlaConfigPage() {
  const navigate = useNavigate()
  const { data: policies, isLoading, error } = useSlaPolicies()
  const { data: properties } = useProperties()
  const upsertMutation = useUpsertSlaPolicy()
  const deleteMutation = useDeleteSlaPolicy()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<UpsertSlaPolicyPayload>({})

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message="Nepodařilo se načíst SLA pravidla." />

  const tenantDefault = policies?.find((p) => p.propertyId === null)
  const propertyOverrides = policies?.filter((p) => p.propertyId !== null) ?? []

  // Properties that don't have an override yet
  const availableProperties = (properties ?? []).filter(
    (prop) => !propertyOverrides.some((p) => p.propertyId === prop.id),
  )

  const startEdit = (policy: ApiSlaPolicy) => {
    setEditingId(policy.id)
    setFormData({
      propertyId: policy.propertyId,
      urgentResponseH: policy.urgentResponseH,
      urgentResolutionH: policy.urgentResolutionH,
      highResponseH: policy.highResponseH,
      highResolutionH: policy.highResolutionH,
      mediumResponseH: policy.mediumResponseH,
      mediumResolutionH: policy.mediumResolutionH,
      lowResponseH: policy.lowResponseH,
      lowResolutionH: policy.lowResolutionH,
    })
  }

  const startNew = (propertyId: string | null) => {
    setEditingId(null)
    setFormData({
      propertyId,
      ...Object.fromEntries(
        PRIORITIES.flatMap((p) => [
          [`${p}ResponseH`, DEFAULT_VALUES[p].response],
          [`${p}ResolutionH`, DEFAULT_VALUES[p].resolution],
        ]),
      ),
    })
    setShowForm(true)
  }

  const handleSave = () => {
    upsertMutation.mutate(formData, {
      onSuccess: () => {
        setEditingId(null)
        setShowForm(false)
      },
    })
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  const inputStyle: React.CSSProperties = {
    width: 80, padding: '6px 8px', borderRadius: 6, textAlign: 'right',
    border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))',
    color: 'var(--text)', fontFamily: 'monospace',
  }

  const renderPolicyTable = (policy: ApiSlaPolicy | null, isEditing: boolean) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid var(--border)' }}>
          <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 500 }} className="text-muted">Priorita</th>
          <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 500 }} className="text-muted">Odezva (h)</th>
          <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 500 }} className="text-muted">Vyřešení (h)</th>
          {!isEditing && <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 500 }} className="text-muted">Odezva</th>}
          {!isEditing && <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 500 }} className="text-muted">Vyřešení</th>}
        </tr>
      </thead>
      <tbody>
        {PRIORITIES.map((p) => {
          const rKey = `${p}ResponseH` as keyof UpsertSlaPolicyPayload
          const sKey = `${p}ResolutionH` as keyof UpsertSlaPolicyPayload
          const rVal = isEditing ? (formData[rKey] as number) : (policy?.[`${p}ResponseH` as keyof ApiSlaPolicy] as number ?? DEFAULT_VALUES[p].response)
          const sVal = isEditing ? (formData[sKey] as number) : (policy?.[`${p}ResolutionH` as keyof ApiSlaPolicy] as number ?? DEFAULT_VALUES[p].resolution)
          return (
            <tr key={p} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '8px 0' }}>
                <Badge variant={p === 'urgent' ? 'red' : p === 'high' ? 'yellow' : p === 'medium' ? 'blue' : 'muted'}>
                  {PRIORITY_LABELS[p]}
                </Badge>
              </td>
              <td style={{ padding: '8px 0', textAlign: 'right' }}>
                {isEditing ? (
                  <input
                    type="number"
                    min={1}
                    value={rVal}
                    onChange={(e) => setFormData({ ...formData, [rKey]: Number(e.target.value) || 1 })}
                    style={inputStyle}
                  />
                ) : (
                  <span style={{ fontFamily: 'monospace' }}>{rVal}</span>
                )}
              </td>
              <td style={{ padding: '8px 0', textAlign: 'right' }}>
                {isEditing ? (
                  <input
                    type="number"
                    min={1}
                    value={sVal}
                    onChange={(e) => setFormData({ ...formData, [sKey]: Number(e.target.value) || 1 })}
                    style={inputStyle}
                  />
                ) : (
                  <span style={{ fontFamily: 'monospace' }}>{sVal}</span>
                )}
              </td>
              {!isEditing && <td style={{ padding: '8px 0', textAlign: 'right' }} className="text-muted">{formatHours(rVal)}</td>}
              {!isEditing && <td style={{ padding: '8px 0', textAlign: 'right' }} className="text-muted">{formatHours(sVal)}</td>}
            </tr>
          )
        })}
      </tbody>
    </table>
  )

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button size="sm" onClick={() => navigate('/helpdesk')}>
            <ArrowLeft size={15} />
          </Button>
          <div>
            <h1 className="page-title">SLA konfigurace</h1>
            <p className="page-subtitle">Nastavení SLA pravidel pro helpdesk tickety</p>
          </div>
        </div>
      </div>

      {/* Tenant default */}
      <div style={{
        border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 24,
        background: 'var(--surface)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Výchozí SLA pravidla</div>
            <div className="text-muted" style={{ fontSize: '0.8rem' }}>Platí pro všechny nemovitosti bez vlastního nastavení</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {editingId === (tenantDefault?.id ?? '__default') ? (
              <>
                <Button size="sm" variant="primary" onClick={handleSave} disabled={upsertMutation.isPending}>
                  <Save size={14} style={{ marginRight: 4 }} />
                  {upsertMutation.isPending ? 'Ukládám...' : 'Uložit'}
                </Button>
                <Button size="sm" onClick={() => setEditingId(null)}>Zrušit</Button>
              </>
            ) : tenantDefault ? (
              <Button size="sm" onClick={() => startEdit(tenantDefault)}>Upravit</Button>
            ) : (
              <Button size="sm" variant="primary" onClick={() => startNew(null)}>
                <Plus size={14} style={{ marginRight: 4 }} />
                Nastavit
              </Button>
            )}
          </div>
        </div>

        {editingId === (tenantDefault?.id ?? '__default') || (showForm && formData.propertyId === null) ? (
          <>
            {renderPolicyTable(tenantDefault ?? null, true)}
            {!tenantDefault && (
              <div style={{ marginTop: 12 }}>
                <Button size="sm" variant="primary" onClick={handleSave} disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? 'Ukládám...' : 'Vytvořit'}
                </Button>
              </div>
            )}
          </>
        ) : (
          renderPolicyTable(tenantDefault ?? null, false)
        )}
      </div>

      {/* Property overrides */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Pravidla pro nemovitosti</h2>
        {availableProperties.length > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              id="add-property-override"
              style={{
                padding: '6px 10px', borderRadius: 6,
                border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
              }}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  startNew(e.target.value)
                  e.target.value = ''
                }
              }}
            >
              <option value="" disabled>Přidat nemovitost...</option>
              {availableProperties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {propertyOverrides.length === 0 && !showForm ? (
        <EmptyState
          title="Žádné přepisy"
          description="Všechny nemovitosti používají výchozí SLA pravidla. Přidejte přepis pro konkrétní nemovitost."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* New property override form */}
          {showForm && formData.propertyId && (
            <div style={{
              border: '2px solid var(--accent-blue, #6366f1)', borderRadius: 8, padding: 16,
              background: 'var(--surface)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 600 }}>
                  {(properties ?? []).find((p) => p.id === formData.propertyId)?.name ?? 'Nová nemovitost'}
                  {' '}<Badge variant="blue">Nový</Badge>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="sm" variant="primary" onClick={handleSave} disabled={upsertMutation.isPending}>
                    <Save size={14} style={{ marginRight: 4 }} />
                    {upsertMutation.isPending ? 'Ukládám...' : 'Vytvořit'}
                  </Button>
                  <Button size="sm" onClick={() => setShowForm(false)}>Zrušit</Button>
                </div>
              </div>
              {renderPolicyTable(null, true)}
            </div>
          )}

          {propertyOverrides.map((policy) => (
            <div
              key={policy.id}
              style={{
                border: '1px solid var(--border)', borderRadius: 8, padding: 16,
                background: 'var(--surface)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 600 }}>{policy.property?.name ?? policy.propertyId}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {editingId === policy.id ? (
                    <>
                      <Button size="sm" variant="primary" onClick={handleSave} disabled={upsertMutation.isPending}>
                        <Save size={14} style={{ marginRight: 4 }} />
                        {upsertMutation.isPending ? 'Ukládám...' : 'Uložit'}
                      </Button>
                      <Button size="sm" onClick={() => setEditingId(null)}>Zrušit</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => startEdit(policy)}>Upravit</Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(policy.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {renderPolicyTable(policy, editingId === policy.id)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
