import { useState } from 'react'
import { FileSignature } from 'lucide-react'
import { Button } from '../../../shared/components'
import ESignCreateModal from '../ESignCreateModal'

interface Props {
  documentType: string
  documentId: string
  documentTitle: string
  variant?: 'button' | 'inline'
  size?: 'sm' | 'default'
}

export function RequestESignButton({
  documentType,
  documentId,
  documentTitle,
  variant = 'button',
  size = 'sm',
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {variant === 'inline' ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--primary)', fontSize: '0.8rem', padding: 0,
          }}
        >
          <FileSignature size={13} /> Vyžádat podpis
        </button>
      ) : (
        <Button size={size} onClick={() => setOpen(true)} icon={<FileSignature size={14} />}>
          Vyžádat podpis
        </Button>
      )}
      {open && (
        <ESignCreateModal
          onClose={() => setOpen(false)}
          onSuccess={() => setOpen(false)}
          initialDocumentType={documentType}
          initialDocumentId={documentId}
          initialDocumentTitle={documentTitle}
        />
      )}
    </>
  )
}
