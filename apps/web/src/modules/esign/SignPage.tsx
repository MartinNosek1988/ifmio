import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { CheckCircle2, XCircle } from 'lucide-react'
import { apiClient } from '../../core/api/client'
import { Button, LoadingState, ErrorState } from '../../shared/components'

export default function SignPage() {
  const { token } = useParams()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [done, setDone] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['esign', 'sign', token],
    queryFn: () => apiClient.get(`/esign/sign/${token}`).then(r => r.data),
    enabled: !!token,
  })

  // Mark as viewed on load
  useEffect(() => {
    if (data && token) {
      apiClient.post(`/esign/sign/${token}/view`).catch(() => {})
    }
  }, [data, token])

  // Init canvas
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
  }, [data])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    if ('touches' in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const signMutation = useMutation({
    mutationFn: () => {
      const signatureBase64 = hasDrawn ? canvasRef.current?.toDataURL('image/png') : undefined
      return apiClient.post(`/esign/sign/${token}/sign`, { signatureBase64 })
    },
    onSuccess: () => setDone(true),
  })

  const declineMutation = useMutation({
    mutationFn: () => apiClient.post(`/esign/sign/${token}/decline`, { reason: declineReason }),
    onSuccess: () => setDone(true),
  })

  if (isLoading) return <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 16px' }}><LoadingState /></div>
  if (error || !data) return <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 16px' }}><ErrorState message="Neplatný nebo expirovaný odkaz." /></div>

  if (done) {
    return (
      <div style={{ maxWidth: 700, margin: '80px auto', textAlign: 'center', fontFamily: 'system-ui' }}>
        <CheckCircle2 size={48} color="#16a34a" />
        <h2 style={{ marginTop: 16 }}>Podpis zaznamenán</h2>
        <p style={{ color: '#6b7280' }}>Děkujeme. Všechny strany budou informovány emailem.</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 16px', fontFamily: 'system-ui' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0D9488', marginBottom: 8 }}>ifmio</div>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>{data.document.title}</h1>
        <p style={{ color: '#6b7280', fontSize: '.9rem' }}>Podepisující: {data.signatory.name} ({data.signatory.role})</p>
      </div>

      {/* Message */}
      {data.document.message && (
        <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: '.9rem' }}>
          {data.document.message}
        </div>
      )}

      {/* PDF viewer */}
      {data.document.url && (
        <iframe src={data.document.url} style={{ width: '100%', height: '60vh', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16 }} />
      )}

      {/* Confirmation checkbox */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: '.9rem', cursor: 'pointer' }}>
        <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
        Potvrzuji, že jsem dokument přečetl/a a souhlasím s jeho obsahem
      </label>

      {/* Signature canvas */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '.85rem', fontWeight: 600, marginBottom: 4 }}>Podpis (nepovinný)</div>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', touchAction: 'none' }}>
          <canvas
            ref={canvasRef} width={400} height={150}
            style={{ display: 'block', width: '100%', cursor: 'crosshair' }}
            onMouseDown={e => { setIsDrawing(true); setHasDrawn(true); const ctx = canvasRef.current?.getContext('2d'); if (ctx) { const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); } }}
            onMouseMove={e => { if (!isDrawing) return; const ctx = canvasRef.current?.getContext('2d'); if (ctx) { const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); } }}
            onMouseUp={() => setIsDrawing(false)}
            onMouseLeave={() => setIsDrawing(false)}
            onTouchStart={e => { e.preventDefault(); setIsDrawing(true); setHasDrawn(true); const ctx = canvasRef.current?.getContext('2d'); if (ctx) { const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); } }}
            onTouchMove={e => { if (!isDrawing) return; e.preventDefault(); const ctx = canvasRef.current?.getContext('2d'); if (ctx) { const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); } }}
            onTouchEnd={() => setIsDrawing(false)}
          />
        </div>
        <div style={{ fontSize: '.75rem', color: '#9ca3af', marginTop: 4 }}>Nakreslete podpis myší nebo prstem</div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <Button variant="primary" onClick={() => signMutation.mutate()} disabled={!confirmed || signMutation.isPending}>
          {signMutation.isPending ? 'Podepisuji...' : 'Podepsat'}
        </Button>
        <Button onClick={() => setDeclineOpen(true)}>Odmítnout</Button>
      </div>

      {/* Decline dialog */}
      {declineOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 'min(400px, calc(100vw - 32px))' }}>
            <h3 style={{ marginTop: 0 }}>Odmítnutí podpisu</h3>
            <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} rows={3} placeholder="Důvod odmítnutí..." style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button onClick={() => setDeclineOpen(false)}>Zpět</Button>
              <Button variant="danger" onClick={() => declineMutation.mutate()} disabled={!declineReason.trim() || declineMutation.isPending}>
                Odmítnout podpis
              </Button>
            </div>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: '.75rem', color: '#9ca3af', marginTop: 24 }}>
        Platnost: {new Date(data.document.expiresAt).toLocaleDateString('cs-CZ')} · ifmio eSign
      </div>
    </div>
  )
}
