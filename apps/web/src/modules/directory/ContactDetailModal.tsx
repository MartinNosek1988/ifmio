import { useState } from 'react';
import { Modal, Badge, Button } from '../../shared/components';
import type { BadgeVariant } from '../../shared/components';
import type { Person, PersonRole } from '../../shared/schema/person';
import { usePersonStore } from './person-store';
import { loadFromStorage } from '../../core/storage';
import { formatCzDate } from '../../shared/utils/format';
import PersonForm from './PersonForm';

interface Props {
  person: Person;
  onClose: () => void;
  onUpdated: () => void;
}

type R = Record<string, unknown>;

const ROLE_LABELS: Record<string, string> = {
  najemce: 'Najemnik', vlastnik: 'Vlastnik', dodavatel: 'Dodavatel',
  spravce: 'Spravce', druzstevnik: 'Druzstevnik', kontakt: 'Kontakt',
};
const ROLE_COLOR: Record<string, BadgeVariant> = {
  najemce: 'green', vlastnik: 'purple', dodavatel: 'blue',
  spravce: 'yellow', druzstevnik: 'muted', kontakt: 'muted',
};

export default function ContactDetailModal({ person, onClose, onUpdated }: Props) {
  const { remove } = usePersonStore();
  const [tab, setTab] = useState<'prehled' | 'vazby'>('prehled');
  const [showEdit, setShowEdit] = useState(false);

  const leases = loadFromStorage<R[]>('estateos_lease_agreements', []);
  const workOrders = loadFromStorage<R[]>('estateos_work_orders', []);
  const tickets = loadFromStorage<R[]>('estateos_tickets', []);

  const firstName = (person.display_name || '').split(' ')[0]?.toLowerCase() || '___';
  const myLeases = leases.filter(l => String(l.najemnik || '').toLowerCase().includes(firstName));
  const myWO = workOrders.filter(w =>
    String(w.resitel || '').toLowerCase().includes(firstName) ||
    String(w.zadavatel || '').toLowerCase().includes(firstName)
  );
  const myTickets = tickets.filter(t => String(t.zadavatel || '').toLowerCase().includes(firstName));
  const vazbyCount = myLeases.length + myWO.length + myTickets.length;

  const initials = (person.display_name || '?').split(' ').map(w => w[0] || '').slice(0, 2).join('').toUpperCase();

  const handleDelete = () => {
    if (!confirm(`Smazat kontakt ${person.display_name}?`)) return;
    remove(person.id);
    onUpdated();
  };

  const tabs = ['prehled', 'vazby'] as const;
  const tabLabels = { prehled: 'Prehled', vazby: `Vazby (${vazbyCount})` };

  return (
    <>
      <Modal open onClose={onClose} wide
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <div>{person.display_name}</div>
              {person.nazev_firmy && person.type === 'pravnicka' && (
                <div style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>{person.nazev_firmy}</div>
              )}
            </div>
          </div>
        }
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            <Button size="sm" onClick={handleDelete} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>Smazat</Button>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={() => setShowEdit(true)}>Upravit</Button>
              <Button onClick={onClose}>Zavrit</Button>
            </div>
          </div>
        }>

        {/* Roles */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {(person.roles || []).map(role => (
            <Badge key={role} variant={ROLE_COLOR[role] || 'muted'}>{ROLE_LABELS[role] || role}</Badge>
          ))}
          <Badge variant={person.type === 'pravnicka' ? 'yellow' : 'muted'}>
            {person.type === 'pravnicka' ? 'Pravnicka osoba' : 'Fyzicka osoba'}
          </Badge>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          {tabs.map(t => (
            <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {tabLabels[t]}
            </button>
          ))}
        </div>

        {tab === 'prehled' && (
          <div>
            {/* Contact info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              {person.jmeno && <InfoCell label="Jmeno" value={person.jmeno} />}
              {person.prijmeni && <InfoCell label="Prijmeni" value={person.prijmeni} />}
              {person.email && (
                <div>
                  <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 2 }}>EMAIL</div>
                  <a href={`mailto:${person.email}`} style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}>{person.email}</a>
                </div>
              )}
              {person.telefon && (
                <div>
                  <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 2 }}>TELEFON</div>
                  <a href={`tel:${person.telefon}`} style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}>{person.telefon}</a>
                </div>
              )}
              <InfoCell label="V systemu od" value={formatCzDate(person.created_at)} />
            </div>

            {/* Address */}
            {(person.ulice || person.mesto) && (
              <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 4 }}>ADRESA</div>
                <div>{[person.ulice, person.mesto, person.psc].filter(Boolean).join(', ')}</div>
              </div>
            )}

            {/* Company info */}
            {(person.type === 'pravnicka' || person.ico) && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.9rem' }}>Firemni udaje</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {person.nazev_firmy && <InfoCell label="Nazev firmy" value={person.nazev_firmy} />}
                  {person.ico && <InfoCell label="ICO" value={person.ico} />}
                  {person.dic && <InfoCell label="DIC" value={person.dic} />}
                </div>
              </div>
            )}

            {/* Bank */}
            {(person.cislo_uctu || person.iban) && (
              <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 4 }}>BANKOVNI UCET</div>
                {person.cislo_uctu && <div>{person.cislo_uctu}</div>}
                {person.iban && <div className="text-muted text-sm">{person.iban}</div>}
              </div>
            )}

            {/* Note */}
            {person.poznamka && (
              <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: 12 }}>
                <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 4 }}>POZNAMKA</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{person.poznamka}</div>
              </div>
            )}
          </div>
        )}

        {tab === 'vazby' && (
          <div>
            {myLeases.length > 0 && (
              <VazbySection title="Najemni smlouvy" count={myLeases.length}>
                {myLeases.map(l => (
                  <div key={String(l.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                    <span style={{ fontWeight: 500 }}>{String(l.najemnik || l.id)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Badge variant={l.status === 'aktivni' ? 'green' : 'muted'}>{l.status === 'aktivni' ? 'Aktivni' : 'Ukoncena'}</Badge>
                      <span className="text-muted text-sm">{formatCzDate(String(l.datumOd || ''))}</span>
                    </div>
                  </div>
                ))}
              </VazbySection>
            )}

            {myWO.length > 0 && (
              <VazbySection title="Work Orders" count={myWO.length}>
                {myWO.map(w => (
                  <div key={String(w.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                    <span style={{ fontWeight: 500 }}>{String(w.nazev || '')}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Badge variant={w.stav === 'nova' ? 'blue' : w.stav === 'v_reseni' ? 'yellow' : 'green'}>{String(w.stav || '')}</Badge>
                      <span className="text-muted text-sm">{formatCzDate(String(w.datumVytvoreni || ''))}</span>
                    </div>
                  </div>
                ))}
              </VazbySection>
            )}

            {myTickets.length > 0 && (
              <VazbySection title="HelpDesk tikety" count={myTickets.length}>
                {myTickets.map(t => (
                  <div key={String(t.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                    <span style={{ fontWeight: 500 }}>{String(t.nazev || t.cisloProtokolu || '')}</span>
                    <span className="text-muted text-sm">{formatCzDate(String(t.datumVytvoreni || ''))}</span>
                  </div>
                ))}
              </VazbySection>
            )}

            {vazbyCount === 0 && (
              <div className="text-muted" style={{ textAlign: 'center', padding: 32 }}>Zadne vazby nenalezeny</div>
            )}
          </div>
        )}
      </Modal>

      {showEdit && (
        <PersonForm person={person} onClose={() => { setShowEdit(false); onUpdated(); }} />
      )}
    </>
  );
}

function InfoCell({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
}

function VazbySection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 8 }}>{title} <span className="text-muted" style={{ fontWeight: 400 }}>({count})</span></div>
      {children}
    </div>
  );
}
