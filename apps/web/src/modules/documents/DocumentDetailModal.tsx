import { useState } from 'react';
import { Modal, Badge, Button } from '../../shared/components';
import type { BadgeVariant } from '../../shared/components';
import { useDeleteDocument } from './api/documents.queries';
import { documentsApi, formatFileSize, type ApiDocument } from './api/documents.api';
import { formatCzDate } from '../../shared/utils/format';
import { DOC_TYPE_LABELS, label } from '../../constants/labels';

interface Props {
  document: ApiDocument;
  onClose: () => void;
  onUpdated: () => void;
}

const CAT_COLOR: Record<string, BadgeVariant> = {
  contract: 'blue', invoice: 'green', protocol: 'yellow',
  photo: 'purple', plan: 'blue', regulation: 'red', other: 'muted',
};

const MIME_ICON: Record<string, string> = {
  'application/pdf': '\u{1F4C4}',
  'image/jpeg': '\u{1F5BC}',
  'image/png': '\u{1F5BC}',
  'image/webp': '\u{1F5BC}',
  'text/plain': '\u{1F4DD}',
  'text/csv': '\u{1F4CA}',
};

function getMimeIcon(mime: string): string {
  if (MIME_ICON[mime]) return MIME_ICON[mime];
  if (mime.startsWith('image/')) return '\u{1F5BC}';
  if (mime.includes('spreadsheet') || mime.includes('excel')) return '\u{1F4CA}';
  if (mime.includes('word') || mime.includes('document')) return '\u{1F4DD}';
  return '\u{1F4CE}';
}

export default function DocumentDetailModal({ document: doc, onClose, onUpdated }: Props) {
  const deleteMutation = useDeleteDocument();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const icon = getMimeIcon(doc.mimeType);
  const downloadHref = documentsApi.downloadUrl(doc.id);

  const handleDelete = () => {
    deleteMutation.mutate(doc.id, { onSuccess: () => onUpdated() });
  };

  return (
    <Modal open onClose={onClose} wide
      title={`${icon} ${doc.name}`}
      subtitle={label(DOC_TYPE_LABELS, doc.category)}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', width: '100%' }}>
          <div>
            {!confirmDelete ? (
              <Button onClick={() => setConfirmDelete(true)} style={{ color: 'var(--danger)' }}>Smazat</Button>
            ) : (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>Opravdu?</span>
                <Button onClick={handleDelete} style={{ color: 'var(--danger)' }} disabled={deleteMutation.isPending}>Ano</Button>
                <Button onClick={() => setConfirmDelete(false)}>Ne</Button>
              </div>
            )}
          </div>
          <Button onClick={onClose}>Zavrit</Button>
        </div>
      }>

      {/* Badges */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <Badge variant={CAT_COLOR[doc.category] || 'muted'}>{label(DOC_TYPE_LABELS, doc.category)}</Badge>
        {doc.links.map(l => (
          <Badge key={l.id} variant="muted">{l.entityType}: {l.entityId.slice(0, 8)}</Badge>
        ))}
      </div>

      {/* Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <InfoBox label="Velikost" value={formatFileSize(doc.size)} />
        <InfoBox label="Nahrano" value={formatCzDate(doc.createdAt)} />
        <InfoBox label="Typ souboru" value={doc.mimeType.split('/').pop() || doc.mimeType} />
      </div>

      {doc.createdBy && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <InfoBox label="Nahral" value={doc.createdBy.name} />
          <InfoBox label="Puvodni nazev" value={doc.originalName} />
          <InfoBox label="Aktualizovano" value={formatCzDate(doc.updatedAt)} />
        </div>
      )}

      {/* Description */}
      {doc.description && (
        <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.875rem' }}>
          <div className="text-muted" style={{ fontSize: '0.72rem', marginBottom: 4 }}>POPIS</div>
          {doc.description}
        </div>
      )}

      {/* Preview / Download */}
      <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '24px 16px', textAlign: 'center', marginBottom: 16, background: 'var(--surface-2, var(--surface))' }}>
        <div style={{ fontSize: '3rem', marginBottom: 8 }}>{icon}</div>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 4 }}>{doc.name}</div>
        <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 12 }}>
          {formatFileSize(doc.size)} · {label(DOC_TYPE_LABELS, doc.category)}
        </div>
        <a href={downloadHref} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <Button variant="primary" size="sm">Stahnout</Button>
        </a>
      </div>

      {/* Tags */}
      {doc.tags.length > 0 && (
        <div>
          <div className="text-muted" style={{ fontSize: '0.72rem', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>STITKY</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {doc.tags.map(t => (
              <span key={t.id} style={{ padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)', fontSize: '0.8rem' }}>{t.tag}</span>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
      <div className="text-muted" style={{ fontSize: '0.72rem', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}
