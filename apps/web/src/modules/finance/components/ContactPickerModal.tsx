import { useState } from 'react';
import { Modal, SearchBar } from '../../../shared/components';
import { useResidents } from '../../residents/api/residents.queries';

export function ContactPickerModal({ onClose, onSelect }: {
  onClose: () => void;
  onSelect: (contact: { firstName: string; lastName: string; email?: string; phone?: string }) => void;
}) {
  const [search, setSearch] = useState('');
  const { data: resData } = useResidents({ limit: 200 });
  const residents = resData?.data ?? [];

  const filtered = residents.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
      (r.email?.toLowerCase().includes(q)) ||
      (r.phone?.includes(q));
  });

  return (
    <Modal open onClose={onClose} title="Vybrat z adresáře">
      <div style={{ marginBottom: 12 }}>
        <SearchBar placeholder="Hledat kontakt..." onSearch={setSearch} />
      </div>
      <div style={{ maxHeight: 350, overflow: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>Žádné kontakty</div>
        )}
        {filtered.map(r => (
          <div key={r.id} onClick={() => onSelect(r)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer', borderRadius: 4 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2, rgba(255,255,255,0.05))')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.firstName} {r.lastName}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {r.role === 'owner' ? 'Vlastník' : r.role === 'tenant' ? 'Nájemník' : r.role === 'member' ? 'Člen' : 'Kontakt'}
                {r.email && ` · ${r.email}`}
              </div>
            </div>
            {r.property && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.property.name}</span>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
