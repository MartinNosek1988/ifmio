import { useState, useEffect, useRef } from 'react'
import { Modal, Button, Badge } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { useCopyInvoice, useCopyRecurring, useChangeInvoiceType, useChangeInvoiceNumber, useAddInvoiceTag, useRemoveInvoiceTag } from '../api/finance.queries'
import { INVOICE_TYPE_LABELS } from './DokladyTab'
import type { ApiInvoice } from '../api/finance.api'

const menuStyle: React.CSSProperties = {
  position: 'fixed', zIndex: 9999, background: 'var(--surface, #fff)', border: '1px solid var(--border)',
  borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.18)', minWidth: 200, padding: '4px 0', fontSize: '.84rem',
}
const itemStyle: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px',
  border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: '.84rem',
}
const disabledStyle: React.CSSProperties = { ...itemStyle, color: 'var(--text-muted)', cursor: 'default', opacity: 0.5 }
const sepStyle: React.CSSProperties = { borderTop: '1px solid var(--border)', margin: '4px 0' }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--surface-2, var(--surface))', color: 'var(--text)', boxSizing: 'border-box', fontSize: '.85rem',
}

interface Props {
  invoice: ApiInvoice
  position: { x: number; y: number }
  onClose: () => void
  onOpenDetail: () => void
  onOpenEdit: () => void
  onDelete: () => void
}

export function InvoiceContextMenu({ invoice, position, onClose, onOpenDetail, onOpenEdit, onDelete }: Props) {
  const toast = useToast()
  const ref = useRef<HTMLDivElement>(null)
  const isDraft = invoice.approvalStatus === 'draft'

  const copyMut = useCopyInvoice()
  const copyRecMut = useCopyRecurring()
  const changeTypeMut = useChangeInvoiceType()
  const changeNumMut = useChangeInvoiceNumber()
  const addTagMut = useAddInvoiceTag()
  const removeTagMut = useRemoveInvoiceTag()

  const [subModal, setSubModal] = useState<'recurring' | 'type' | 'number' | 'tags' | 'history' | null>(null)
  const [recPeriod, setRecPeriod] = useState<'monthly' | 'quarterly'>('monthly')
  const [recCount, setRecCount] = useState('3')
  const [newType, setNewType] = useState(invoice.type)
  const [newNumber, setNewNumber] = useState(invoice.number)
  const [newTag, setNewTag] = useState('')
  const [tags, setTags] = useState<string[]>(invoice.tags ?? [])

  // Close on outside click / scroll / escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node) && !subModal) onClose() }
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { subModal ? setSubModal(null) : onClose() } }
    const handleScroll = () => { if (!subModal) onClose() }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('scroll', handleScroll, true)
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); window.removeEventListener('scroll', handleScroll, true) }
  }, [onClose, subModal])

  const item = (label: string, onClick: () => void, enabled = true) => (
    <button style={enabled ? itemStyle : disabledStyle} onClick={enabled ? onClick : undefined} onMouseEnter={e => { if (enabled) (e.target as HTMLElement).style.background = 'var(--surface-2, #f5f5f5)' }} onMouseLeave={e => (e.target as HTMLElement).style.background = 'none'}>
      {label}
    </button>
  )

  // Adjust position so menu doesn't overflow viewport
  const x = Math.min(position.x, window.innerWidth - 220)
  const y = Math.min(position.y, window.innerHeight - 350)

  return (
    <>
      <div ref={ref} style={{ ...menuStyle, left: x, top: y }}>
        {item('Otevřít', () => { onClose(); onOpenDetail() })}
        {item('Upravit', () => { onClose(); onOpenEdit() }, isDraft)}
        <div style={sepStyle} />
        {item('Kopírovat', async () => { await copyMut.mutateAsync(invoice.id); toast.success('Doklad zkopírován'); onClose() })}
        {item('Kopírovat — měsíčně', () => { setRecPeriod('monthly'); setSubModal('recurring') })}
        {item('Kopírovat — čtvrtletně', () => { setRecPeriod('quarterly'); setSubModal('recurring') })}
        <div style={sepStyle} />
        {item('Změna typu', () => setSubModal('type'), isDraft)}
        {item('Změna čísla dokladu', () => setSubModal('number'), isDraft)}
        {item('Smazat', () => { onClose(); onDelete() }, isDraft)}
        <div style={sepStyle} />
        {item('Štítky', () => setSubModal('tags'))}
        {item('Historie', () => setSubModal('history'))}
      </div>

      {/* Recurring copy modal */}
      {subModal === 'recurring' && (
        <Modal open onClose={() => setSubModal(null)} title={`Opakovaná kopie — ${recPeriod === 'monthly' ? 'měsíčně' : 'čtvrtletně'}`} footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => setSubModal(null)}>Zrušit</Button>
            <Button variant="primary" disabled={copyRecMut.isPending} onClick={async () => {
              const res = await copyRecMut.mutateAsync({ id: invoice.id, period: recPeriod, count: parseInt(recCount) || 1 })
              toast.success(`${res.count} dokladů vytvořeno`)
              setSubModal(null); onClose()
            }}>{copyRecMut.isPending ? 'Vytvářím…' : 'Vytvořit kopie'}</Button>
          </div>
        }>
          <label className="form-label">Počet opakování</label>
          <input type="number" min="1" max={recPeriod === 'monthly' ? 12 : 4} value={recCount}
            onChange={e => setRecCount(e.target.value)} style={inputStyle} />
        </Modal>
      )}

      {/* Change type modal */}
      {subModal === 'type' && (
        <Modal open onClose={() => setSubModal(null)} title="Změna typu dokladu" footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => setSubModal(null)}>Zrušit</Button>
            <Button variant="primary" disabled={changeTypeMut.isPending} onClick={async () => {
              await changeTypeMut.mutateAsync({ id: invoice.id, type: newType })
              toast.success('Typ dokladu změněn'); setSubModal(null); onClose()
            }}>{changeTypeMut.isPending ? 'Měním…' : 'Změnit'}</Button>
          </div>
        }>
          <label className="form-label">Typ</label>
          <select value={newType} onChange={e => setNewType(e.target.value as any)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {Object.entries(INVOICE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Modal>
      )}

      {/* Change number modal */}
      {subModal === 'number' && (
        <Modal open onClose={() => setSubModal(null)} title="Změna čísla dokladu" footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => setSubModal(null)}>Zrušit</Button>
            <Button variant="primary" disabled={changeNumMut.isPending || !newNumber.trim()} onClick={async () => {
              await changeNumMut.mutateAsync({ id: invoice.id, number: newNumber.trim() })
              toast.success('Číslo dokladu změněno'); setSubModal(null); onClose()
            }}>{changeNumMut.isPending ? 'Ukládám…' : 'Uložit'}</Button>
          </div>
        }>
          <label className="form-label">Nové číslo</label>
          <input value={newNumber} onChange={e => setNewNumber(e.target.value)} style={inputStyle} />
        </Modal>
      )}

      {/* Tags modal */}
      {subModal === 'tags' && (
        <Modal open onClose={() => setSubModal(null)} title="Štítky">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {tags.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>Žádné štítky</span>}
            {tags.map(t => (
              <Badge key={t} variant="blue">
                {t}
                <button onClick={async () => { await removeTagMut.mutateAsync({ id: invoice.id, tag: t }); setTags(prev => prev.filter(x => x !== t)); toast.success(`Štítek "${t}" odebrán`) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', marginLeft: 4, padding: 0, fontSize: '.9rem' }}>×</button>
              </Badge>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Nový štítek…" style={{ ...inputStyle, flex: 1 }}
              onKeyDown={async e => { if (e.key === 'Enter' && newTag.trim()) { await addTagMut.mutateAsync({ id: invoice.id, tag: newTag.trim() }); setTags(prev => [...prev, newTag.trim()]); setNewTag(''); toast.success('Štítek přidán') } }} />
            <Button size="sm" disabled={!newTag.trim() || addTagMut.isPending} onClick={async () => {
              if (!newTag.trim()) return
              await addTagMut.mutateAsync({ id: invoice.id, tag: newTag.trim() })
              setTags(prev => [...prev, newTag.trim()]); setNewTag(''); toast.success('Štítek přidán')
            }}>Přidat</Button>
          </div>
        </Modal>
      )}

      {/* History modal */}
      {subModal === 'history' && (
        <Modal open onClose={() => setSubModal(null)} title="Historie změn">
          <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', fontStyle: 'italic' }}>
            Historie není k dispozici {/* TODO: implement when audit log supports entity filtering */}
          </div>
        </Modal>
      )}
    </>
  )
}
