import { useState } from 'react';
import { Modal, Badge, Button } from '../../shared/components';
import type { BadgeVariant } from '../../shared/components';
import { useDocumentStore, type Document, type DocTyp, formatVelikost } from './document-store';
import { loadFromStorage } from '../../core/storage';
import { formatCzDate } from '../../shared/utils/format';
import { DOC_TYPE_LABELS, label } from '../../constants/labels';
import DocumentForm from './DocumentForm';

interface Props {
  document: Document;
  onClose: () => void;
  onUpdated: () => void;
}

type R = Record<string, unknown>;

const TYP_COLOR: Record<string, BadgeVariant> = {
  smlouva: 'blue', revize: 'yellow', faktura: 'green',
  pasport: 'purple', pojisteni: 'yellow', ostatni: 'muted',
};

const TYP_ICON: Record<string, string> = {
  smlouva: '\u{1F4C4}', revize: '\u{1F50D}', faktura: '\u{1F9FE}',
  pasport: '\u{1F3E2}', pojisteni: '\u{1F6E1}', ostatni: '\u{1F4CE}',
};

export default function DocumentDetailModal({ document: doc, onClose, onUpdated }: Props) {
  const { remove } = useDocumentStore();
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const properties = loadFromStorage<R[]>('estateos_properties', []);
  const units = loadFromStorage<R[]>('estateos_units', []);
  const prop = properties.find(p => String(p.id) === String(doc.propId));
  const unit = units.find(u => String(u.id) === String(doc.jednotkaId));

  const icon = TYP_ICON[doc.typ] || '\u{1F4CE}';

  const handleDelete = () => {
    remove(doc.id);
    onUpdated();
  };

  if (showEdit) {
    return <DocumentForm document={doc} onClose={() => { setShowEdit(false); onUpdated(); }} />;
  }

  return (
    <Modal open onClose={onClose} wide
      title={`${icon} ${doc.nazev}`}
      subtitle={`${label(DOC_TYPE_LABELS, doc.typ)}${prop ? ` · ${String(prop.nazev || prop.name)}` : ''}`}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', width: '100%' }}>
          <div>
            {!confirmDelete ? (
              <Button onClick={() => setConfirmDelete(true)} style={{ color: 'var(--danger)' }}>Smazat</Button>
            ) : (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>Opravdu?</span>
                <Button onClick={handleDelete} style={{ color: 'var(--danger)' }}>Ano</Button>
                <Button onClick={() => setConfirmDelete(false)}>Ne</Button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => setShowEdit(true)}>Upravit</Button>
            <Button onClick={onClose}>Zavrit</Button>
          </div>
        </div>
      }>

      {/* Badges */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <Badge variant={TYP_COLOR[doc.typ] || 'muted'}>{label(DOC_TYPE_LABELS, doc.typ)}</Badge>
        {prop && <Badge variant="muted">{String(prop.nazev || prop.name)}</Badge>}
        {unit && <Badge variant="muted">Jed. {String(unit.cislo)}</Badge>}
      </div>

      {/* Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <InfoBox label="Datum" value={doc.datum ? formatCzDate(doc.datum) : '—'} />
        <InfoBox label="Velikost" value={formatVelikost(doc.velikost)} />
        <InfoBox label="Pridano" value={doc.created_at ? formatCzDate(doc.created_at) : '—'} />
      </div>

      {/* Popis */}
      {doc.popis && (
        <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.875rem' }}>
          <div className="text-muted" style={{ fontSize: '0.72rem', marginBottom: 4 }}>POPIS</div>
          {doc.popis}
        </div>
      )}

      {/* Preview */}
      <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '24px 16px', textAlign: 'center', marginBottom: 16, background: 'var(--surface-2, var(--surface))' }}>
        <div style={{ fontSize: '3rem', marginBottom: 8 }}>{icon}</div>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 4 }}>{doc.nazev}</div>
        <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 12 }}>
          {formatVelikost(doc.velikost)} · {label(DOC_TYPE_LABELS, doc.typ)}
        </div>
        <Button variant="primary" size="sm"
          onClick={() => alert('Stahovani souboru neni v demo verzi dostupne.')}>
          Stahnout
        </Button>
      </div>

      {/* Tags */}
      {doc.tagList && doc.tagList.length > 0 && (
        <div>
          <div className="text-muted" style={{ fontSize: '0.72rem', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>STITKY</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {doc.tagList.map(t => (
              <span key={t} style={{ padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)', fontSize: '0.8rem' }}>{t}</span>
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
