import { useState } from 'react';
import { Modal, Badge, Button } from '../../shared/components';
import { loadFromStorage, saveToStorage } from '../../core/storage';
import { formatCzDate } from '../../shared/utils/format';

type R = Record<string, unknown>;

interface Announcement {
  id: string;
  nazev: string;
  text: string;
  datum: string;
  autor: string;
  dulezite: boolean;
  propId?: string | number;
  deleted_at?: string | null;
}

interface Props {
  announcement: Announcement;
  onClose: () => void;
  onUpdated: () => void;
}

const ANN_KEY = 'estateos_announcements';

export default function AnnouncementDetailModal({ announcement: ann, onClose, onUpdated }: Props) {
  const properties = loadFromStorage<R[]>('estateos_properties', []);
  const prop = properties.find(p => String(p.id) === String(ann.propId));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = () => {
    const all = loadFromStorage<R[]>(ANN_KEY, []);
    const updated = all.map(a =>
      String(a.id) === String(ann.id) ? { ...a, deleted_at: new Date().toISOString() } : a
    );
    saveToStorage(ANN_KEY, updated);
    onUpdated();
    onClose();
  };

  return (
    <Modal open onClose={onClose} wide
      title={ann.nazev}
      subtitle={`Autor: ${ann.autor} · ${formatCzDate(ann.datum)}`}
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
          <Button onClick={onClose}>Zavrit</Button>
        </div>
      }>

      {/* Color bar */}
      <div style={{ height: 4, background: ann.dulezite ? 'var(--danger)' : 'var(--accent-blue)', borderRadius: 2, marginBottom: 14 }} />

      {/* Badges */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {ann.dulezite && <Badge variant="red">Dulezite</Badge>}
        {prop ? <Badge variant="muted">{String(prop.nazev || prop.name)}</Badge> : <Badge variant="muted">Vsechny nemovitosti</Badge>}
      </div>

      {/* Text */}
      <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 10, padding: '16px 18px', lineHeight: 1.7, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
        {ann.text}
      </div>
    </Modal>
  );
}
