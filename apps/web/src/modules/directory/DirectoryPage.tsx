import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { KpiCard, Table, Badge, SearchBar, Button } from '../../shared/components';
import type { Column, BadgeVariant } from '../../shared/components';
import type { Person, PersonRole } from '../../shared/schema/person';
import { usePersonStore } from './person-store';
import ContactDetailModal from './ContactDetailModal';
import PersonForm from './PersonForm';

const ROLE_COLOR: Record<string, BadgeVariant> = {
  najemce: 'green', vlastnik: 'purple', dodavatel: 'blue',
  spravce: 'yellow', druzstevnik: 'muted', kontakt: 'muted',
};
const ROLE_LABEL: Record<string, string> = {
  najemce: 'Najemnik', vlastnik: 'Vlastnik', dodavatel: 'Dodavatel',
  spravce: 'Spravce', druzstevnik: 'Druzstevnik', kontakt: 'Kontakt',
};

export default function DirectoryPage() {
  const { persons, load } = usePersonStore();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selected, setSelected] = useState<Person | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const najemnici = persons.filter(p => p.roles.includes('najemce')).length;
    const dodavatele = persons.filter(p => p.roles.includes('dodavatel')).length;
    const vlastnici = persons.filter(p => p.roles.includes('vlastnik')).length;
    return { celkem: persons.length, najemnici, dodavatele, vlastnici };
  }, [persons]);

  const filtered = useMemo(() => {
    return persons.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !search ||
        p.display_name.toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.nazev_firmy || '').toLowerCase().includes(q) ||
        (p.telefon || '').includes(search);
      const matchRole = filterRole === 'all' || p.roles.includes(filterRole as PersonRole);
      return matchSearch && matchRole;
    });
  }, [persons, search, filterRole]);

  const columns: Column<Person>[] = [
    { key: 'display_name', label: 'Jmeno', render: p => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
          {p.display_name.split(' ').map(w => w[0] || '').slice(0, 2).join('').toUpperCase()}
        </div>
        <span style={{ fontWeight: 600 }}>{p.display_name}</span>
      </div>
    )},
    { key: 'roles', label: 'Role', render: p => (
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {(p.roles || []).slice(0, 2).map(r => (
          <Badge key={r} variant={ROLE_COLOR[r] || 'muted'}>{ROLE_LABEL[r] || r}</Badge>
        ))}
        {(p.roles || []).length > 2 && <Badge variant="muted">+{p.roles.length - 2}</Badge>}
      </div>
    )},
    { key: 'nazev_firmy', label: 'Firma', render: p => <span className="text-muted">{p.nazev_firmy || '—'}</span> },
    { key: 'email', label: 'Email', render: p => p.email
      ? <a href={`mailto:${p.email}`} onClick={e => e.stopPropagation()} className="text-sm" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>{p.email}</a>
      : <span className="text-muted">—</span>
    },
    { key: 'telefon', label: 'Telefon', render: p => p.telefon || '—' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Adresar</h1>
          <p className="page-subtitle">{stats.celkem} kontaktu</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>Novy kontakt</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Celkem" value={String(stats.celkem)} color="var(--accent-blue)" />
        <KpiCard label="Najemnici" value={String(stats.najemnici)} color="var(--accent-green)" />
        <KpiCard label="Dodavatele" value={String(stats.dodavatele)} color="var(--accent-blue)" />
        <KpiCard label="Vlastnici" value={String(stats.vlastnici)} color="var(--accent-purple)" />
      </div>

      <div className="flex-bar" style={{ marginBottom: 16 }}>
        <SearchBar placeholder="Hledat kontakty..." onSearch={setSearch} />
        <select className="btn" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="all">Vse</option>
          <option value="najemce">Najemnici</option>
          <option value="dodavatel">Dodavatele</option>
          <option value="vlastnik">Vlastnici</option>
          <option value="spravce">Spravci</option>
        </select>
      </div>

      <Table data={filtered} columns={columns} rowKey={p => p.id} onRowClick={p => setSelected(p)} emptyText="Zadne kontakty" />

      {selected && (
        <ContactDetailModal
          person={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { load(); setSelected(null); }}
        />
      )}

      {showForm && (
        <PersonForm onClose={() => { setShowForm(false); load(); }} />
      )}
    </div>
  );
}
