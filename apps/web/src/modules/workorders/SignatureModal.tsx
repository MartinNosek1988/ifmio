import { useRef, useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '../../core/api/client'
import { Modal, Button } from '../../shared/components'
import { useToast } from '../../shared/components/toast/Toast'

interface Props {
  workOrderId: string
  onClose: () => void
  onSuccess: () => void
}

export default function SignatureModal({ workOrderId, onClose, onSuccess }: Props) {
  const toast = useToast()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [signedByName, setSignedByName] = useState('')
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#111'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
  }, [])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(true)
    setHasDrawn(true)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const handleEnd = () => setIsDrawing(false)

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const submitMutation = useMutation({
    mutationFn: () => {
      const signatureBase64 = canvasRef.current!.toDataURL('image/png')
      return apiClient.post(`/work-orders/${workOrderId}/signature`, {
        signatureBase64,
        signedByName,
      })
    },
    onSuccess: () => {
      toast.success('Podpis uložen')
      onSuccess()
    },
    onError: () => toast.error('Uložení podpisu selhalo'),
  })

  return (
    <Modal open onClose={onClose} title="Podpis zákazníka"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={clear}>Vymazat</Button>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={() => submitMutation.mutate()} disabled={!hasDrawn || !signedByName.trim() || submitMutation.isPending}>
            {submitMutation.isPending ? 'Ukládám...' : 'Potvrdit podpis'}
          </Button>
        </div>
      }>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: '.85rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Jméno podepisujícího *</label>
        <input
          value={signedByName}
          onChange={e => setSignedByName(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))' }}
          placeholder="Jan Novák"
        />
      </div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          style={{ display: 'block', width: '100%', cursor: 'crosshair' }}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      </div>
      <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 4, textAlign: 'center' }}>
        Nakreslete podpis myší nebo prstem na dotykovém displeji
      </div>
    </Modal>
  )
}
