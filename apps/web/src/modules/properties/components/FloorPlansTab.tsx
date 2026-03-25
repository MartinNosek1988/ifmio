import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button, EmptyState } from '../../../shared/components'
import { useFloorPlans, useDeleteFloorPlan, type FloorPlan } from '../hooks/useFloorPlans'
import type { ApiUnit } from '../properties-api'
import FloorPlanViewer from './FloorPlanViewer'
import FloorPlanEditor from './FloorPlanEditor'
import FloorPlanUploadModal from './FloorPlanUploadModal'

interface Props {
  propertyId: string
  units: ApiUnit[]
}

export function FloorPlansTab({ propertyId, units }: Props) {
  const { data: floorPlans = [], isLoading } = useFloorPlans(propertyId)
  const deleteMutation = useDeleteFloorPlan(propertyId)

  const [showUpload, setShowUpload] = useState(false)
  const [viewPlan, setViewPlan] = useState<FloorPlan | null>(null)
  const [editPlan, setEditPlan] = useState<FloorPlan | null>(null)

  if (isLoading) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Načítám půdorysy…</div>

  if (editPlan) {
    return (
      <FloorPlanEditor
        floorPlan={editPlan}
        propertyId={propertyId}
        units={units}
        onClose={() => setEditPlan(null)}
      />
    )
  }

  if (viewPlan) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Button size="sm" onClick={() => setViewPlan(null)}>← Zpět</Button>
          <span style={{ fontWeight: 600 }}>{viewPlan.label ?? `Podlaží ${viewPlan.floor}`}</span>
          <div style={{ flex: 1 }} />
          <Button size="sm" icon={<Pencil size={14} />} onClick={() => { setEditPlan(viewPlan); setViewPlan(null) }}>
            Upravit zóny
          </Button>
        </div>
        <FloorPlanViewer floorPlan={viewPlan} propertyId={propertyId} />
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 600 }}>Půdorysy ({floorPlans.length})</div>
        <Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => setShowUpload(true)}>
          Přidat půdorys
        </Button>
      </div>

      {floorPlans.length === 0 ? (
        <EmptyState
          title="Žádné půdorysy"
          description="Nahrajte obrázek půdorysu a mapujte jednotky na interaktivní zóny."
          action={{ label: 'Nahrát půdorys', onClick: () => setShowUpload(true) }}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {floorPlans.map((plan) => (
            <div
              key={plan.id}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 8,
                overflow: 'hidden',
                cursor: 'pointer',
                background: 'var(--surface)',
              }}
              onClick={() => setViewPlan(plan)}
            >
              <div style={{ position: 'relative', paddingBottom: '60%', overflow: 'hidden', background: '#f0f0f0' }}>
                <img
                  src={plan.imageUrl}
                  alt={plan.label ?? `Podlaží ${plan.floor}`}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontWeight: 600, fontSize: '.9rem' }}>
                  {plan.label ?? `Podlaží ${plan.floor}`}
                </div>
                <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
                  {plan.zones.length} zón · podlaží {plan.floor}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" icon={<Pencil size={12} />} onClick={() => setEditPlan(plan)}>Zóny</Button>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<Trash2 size={12} />}
                    onClick={() => { if (confirm('Smazat půdorys?')) deleteMutation.mutate(plan.id) }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <FloorPlanUploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        propertyId={propertyId}
      />
    </div>
  )
}
