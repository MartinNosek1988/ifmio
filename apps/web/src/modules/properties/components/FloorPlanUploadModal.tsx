import { useState } from 'react'
import { Modal, Button } from '../../../shared/components'
import { useCreateFloorPlan } from '../hooks/useFloorPlans'

interface Props {
  open: boolean
  onClose: () => void
  propertyId: string
}

export default function FloorPlanUploadModal({ open, onClose, propertyId }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [floor, setFloor] = useState(0)
  const [label, setLabel] = useState('')
  const create = useCreateFloorPlan(propertyId)

  const handleSubmit = () => {
    if (!file) return
    const fd = new FormData()
    fd.append('image', file)
    fd.append('propertyId', propertyId)
    fd.append('floor', String(floor))
    if (label) fd.append('label', label)

    create.mutate(fd, {
      onSuccess: () => {
        setFile(null)
        setFloor(0)
        setLabel('')
        onClose()
      },
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Přidat půdorys" footer={
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button onClick={onClose}>Zrušit</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!file || create.isPending}>
          {create.isPending ? 'Nahrávám…' : 'Nahrát'}
        </Button>
      </div>
    }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ fontSize: '.85rem' }}>
          Obrázek půdorysu
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.svg"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ display: 'block', marginTop: 4 }}
          />
        </label>
        <label style={{ fontSize: '.85rem' }}>
          Podlaží
          <input
            type="number"
            value={floor}
            onChange={(e) => setFloor(parseInt(e.target.value, 10) || 0)}
            className="form-control"
            style={{ marginTop: 4 }}
          />
        </label>
        <label style={{ fontSize: '.85rem' }}>
          Název (volitelné)
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Přízemí, 1.NP, Suterén…"
            className="form-control"
            style={{ marginTop: 4 }}
          />
        </label>
      </div>
    </Modal>
  )
}
