import { useState, useEffect } from 'react';
import { Modal, Badge, Button } from '../../shared/components';
import { loadFromStorage, saveToStorage } from '../../core/storage';
import { formatCzDate } from '../../shared/utils/format';

type R = Record<string, unknown>;

interface Message {
  id: string;
  od: string;
  komu: string;
  predmet: string;
  text: string;
  datum: string;
  precteno: boolean;
  propId?: string | number;
  deleted_at?: string | null;
}

interface Props {
  message: Message;
  onClose: () => void;
  onUpdated: () => void;
}

const MSGS_KEY = 'estateos_messages';

export default function MessageDetailModal({ message: msg, onClose, onUpdated }: Props) {
  const properties = loadFromStorage<R[]>('estateos_properties', []);
  const prop = properties.find(p => String(p.id) === String(msg.propId));
  const [replyText, setReplyText] = useState('');
  const [replied, setReplied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Mark as read on open
  useEffect(() => {
    if (!msg.precteno) {
      const all = loadFromStorage<R[]>(MSGS_KEY, []);
      const updated = all.map(m =>
        String(m.id) === String(msg.id) ? { ...m, precteno: true, updated_at: new Date().toISOString() } : m
      );
      saveToStorage(MSGS_KEY, updated);
      onUpdated();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = () => {
    const all = loadFromStorage<R[]>(MSGS_KEY, []);
    const updated = all.map(m =>
      String(m.id) === String(msg.id) ? { ...m, deleted_at: new Date().toISOString() } : m
    );
    saveToStorage(MSGS_KEY, updated);
    onUpdated();
    onClose();
  };

  const handleReply = () => {
    if (!replyText.trim()) return;
    setReplied(true);
    setReplyText('');
  };

  const handleCreateTicket = () => {
    const tickets = loadFromStorage<R[]>('estateos_tickets', []);
    const newTicket = {
      id: `ticket-${Date.now()}`,
      nazev: msg.predmet,
      popis: msg.text,
      od: msg.od,
      propId: msg.propId,
      stav: 'nova',
      priorita: 'normalni',
      tenant_id: 'tenant-demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    saveToStorage('estateos_tickets', [...tickets, newTicket]);
    alert('Ticket "' + msg.predmet + '" vytvoren v HelpDesk');
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))',
    color: 'var(--text)', resize: 'vertical' as const, fontSize: '0.9rem', boxSizing: 'border-box' as const,
  };

  return (
    <Modal open onClose={onClose} wide
      title={msg.predmet}
      subtitle={`Od: ${msg.od} \u2192 Komu: ${msg.komu}`}
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

      {/* Badges */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {!msg.precteno && <Badge variant="blue">Nove</Badge>}
        {prop && <Badge variant="muted">{String(prop.nazev || prop.name)}</Badge>}
      </div>

      {/* Date */}
      <div className="text-muted" style={{ fontSize: '0.82rem', marginBottom: 16 }}>
        {formatCzDate(msg.datum)}
      </div>

      {/* Message text */}
      <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 10, padding: '14px 16px', marginBottom: 20, lineHeight: 1.65, fontSize: '0.925rem', whiteSpace: 'pre-wrap' }}>
        {msg.text}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <Button size="sm" onClick={handleCreateTicket}>Vytvorit HelpDesk ticket</Button>
        <Button size="sm" onClick={() => alert('Preposlani zpravy neni v demo verzi dostupne.')}>Preposlat</Button>
      </div>

      {/* Reply */}
      {!replied ? (
        <div>
          <div className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ODPOVEDЕТ</div>
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            rows={3}
            placeholder={`Odpovedет ${msg.od}...`}
            style={inputStyle}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="primary" size="sm" disabled={!replyText.trim()} onClick={handleReply}>Odeslat odpoved</Button>
          </div>
        </div>
      ) : (
        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid var(--accent-green)', borderRadius: 8, padding: '10px 14px', color: 'var(--accent-green)', fontWeight: 500, fontSize: '0.9rem' }}>
          Odpoved odeslana
        </div>
      )}
    </Modal>
  );
}
