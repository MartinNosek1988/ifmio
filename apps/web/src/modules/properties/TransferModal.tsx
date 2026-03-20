import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { Modal } from '../../shared/components/Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  unitId: string;
  unitName: string;
  currentOwner: {
    occupancyId: string;
    name: string;
    ownershipShare?: number | null;
  };
}

export default function TransferModal({ open, onClose, propertyId, unitId, unitName, currentOwner }: Props) {
  const queryClient = useQueryClient();
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState<'existing' | 'new'>('new');
  const [partySearch, setPartySearch] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [generateVs, setGenerateVs] = useState(true);
  const [note, setNote] = useState('');

  // Party search
  const [partyResults, setPartyResults] = useState<{ id: string; displayName: string }[]>([]);
  const searchParties = async (term: string) => {
    setPartySearch(term);
    if (term.length < 2) { setPartyResults([]); return; }
    try {
      const { data } = await apiClient.get(`/parties/search?term=${encodeURIComponent(term)}`);
      setPartyResults(data);
    } catch { setPartyResults([]); }
  };

  const mutation = useMutation({
    mutationFn: () => apiClient.post(`/properties/${propertyId}/units/${unitId}/transfer`, {
      currentOwnerId: currentOwner.occupancyId,
      transferDate,
      newOwner: mode === 'existing'
        ? { partyId: selectedPartyId }
        : { firstName, lastName, email: email || undefined, phone: phone || undefined },
      generateVariableSymbol: generateVs,
      note: note || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', propertyId] });
      onClose();
    },
  });

  const canSubmit = mode === 'existing' ? !!selectedPartyId : (!!firstName && !!lastName);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
    borderRadius: 6, fontSize: '0.85rem', background: 'var(--card-bg)', color: 'var(--text)',
  };

  return (
    <Modal open={open} onClose={onClose} title="Stěhování" subtitle={`Jednotka: ${unitName}`}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn--sm" onClick={onClose}>Zrušit</button>
          <button className="btn btn--primary btn--sm" disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Provádím...' : 'Provést stěhování'}
          </button>
        </div>
      }>
      {mutation.isError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px', color: '#dc2626', fontSize: '0.82rem', marginBottom: 12 }}>
          {(mutation.error as any)?.response?.data?.message ?? 'Chyba při stěhování'}
        </div>
      )}

      {/* Current owner */}
      <div style={{ background: 'var(--surface, #f8fafc)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 2 }}>Stávající vlastník</div>
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{currentOwner.name}</div>
      </div>

      {/* Transfer date */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Datum přechodu</label>
        <input type="date" value={transferDate} onChange={e => setTransferDate(e.target.value)} style={inputStyle} />
      </div>

      {/* New owner mode */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 6 }}>Nový vlastník</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button className={`btn btn--sm${mode === 'new' ? ' btn--primary' : ''}`} onClick={() => setMode('new')}>Nový</button>
          <button className={`btn btn--sm${mode === 'existing' ? ' btn--primary' : ''}`} onClick={() => setMode('existing')}>Z adresáře</button>
        </div>

        {mode === 'existing' && (
          <div>
            <input placeholder="Hledat v adresáři..." value={partySearch} onChange={e => searchParties(e.target.value)} style={{ ...inputStyle, marginBottom: 6 }} />
            {partyResults.length > 0 && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 6, maxHeight: 150, overflowY: 'auto' }}>
                {partyResults.map(p => (
                  <div key={p.id} onClick={() => { setSelectedPartyId(p.id); setPartySearch(p.displayName); setPartyResults([]); }}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem', background: p.id === selectedPartyId ? 'var(--primary-light, #eff6ff)' : 'transparent' }}>
                    {p.displayName}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === 'new' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Jméno *</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Příjmení *</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Telefon</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
            </div>
          </div>
        )}
      </div>

      {/* Options */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', marginBottom: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={generateVs} onChange={e => setGenerateVs(e.target.checked)} />
        Generovat variabilní symbol
      </label>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Poznámka</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Důvod stěhování..." />
      </div>
    </Modal>
  );
}
