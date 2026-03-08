import { useState } from 'react';
import { Modal, Button } from '../../shared/components';
import type { Person, PersonType, PersonRole } from '../../shared/schema/person';
import { usePersonStore } from './person-store';

interface Props {
  person?: Person;
  onClose: () => void;
}

const ALL_ROLES: { value: PersonRole; label: string }[] = [
  { value: 'najemce', label: 'Najemnik' },
  { value: 'vlastnik', label: 'Vlastnik' },
  { value: 'dodavatel', label: 'Dodavatel' },
  { value: 'spravce', label: 'Spravce' },
  { value: 'druzstevnik', label: 'Druzstevnik' },
  { value: 'kontakt', label: 'Kontakt' },
];

export default function PersonForm({ person, onClose }: Props) {
  const { create, update } = usePersonStore();
  const isEdit = !!person;

  const [form, setForm] = useState({
    type: (person?.type || 'fyzicka') as PersonType,
    jmeno: person?.jmeno || '',
    prijmeni: person?.prijmeni || '',
    nazev_firmy: person?.nazev_firmy || '',
    ico: person?.ico || '',
    dic: person?.dic || '',
    email: person?.email || '',
    telefon: person?.telefon || '',
    ulice: person?.ulice || '',
    mesto: person?.mesto || '',
    psc: person?.psc || '',
    cislo_uctu: person?.cislo_uctu || '',
    roles: [...(person?.roles || [])] as PersonRole[],
    poznamka: person?.poznamka || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const toggleRole = (role: PersonRole) => {
    setForm(f => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter(r => r !== role) : [...f.roles, role],
    }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (form.type === 'fyzicka' && !form.jmeno.trim() && !form.prijmeni.trim())
      errs.jmeno = 'Jmeno nebo prijmeni je povinne';
    if (form.type === 'pravnicka' && !form.nazev_firmy.trim())
      errs.nazev_firmy = 'Nazev firmy je povinny';
    if (form.roles.length === 0)
      errs.roles = 'Vyberte alespon jednu roli';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (isEdit) {
      update(person!.id, form);
    } else {
      create(form);
    }
    onClose();
  };

  const inputStyle = (field?: string) => ({
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box' as const,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  });

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Upravit kontakt' : 'Novy kontakt'}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrusit</Button>
          <Button variant="primary" onClick={handleSubmit}>{isEdit ? 'Ulozit' : 'Vytvorit'}</Button>
        </div>
      }>

      {/* Type toggle */}
      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Typ osoby</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {([{ v: 'fyzicka', l: 'Fyzicka osoba' }, { v: 'pravnicka', l: 'Pravnicka osoba' }] as const).map(opt => (
            <button key={opt.v} type="button" onClick={() => set('type', opt.v)}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem',
                border: `2px solid ${form.type === opt.v ? 'var(--accent-blue)' : 'var(--border)'}`,
                background: form.type === opt.v ? 'rgba(80,200,240,0.08)' : 'transparent',
                color: form.type === opt.v ? 'var(--accent-blue)' : 'var(--text)',
                fontWeight: form.type === opt.v ? 600 : 400,
              }}>
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {/* Name fields */}
      {form.type === 'fyzicka' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label className="form-label">Jmeno</label>
            <input value={form.jmeno} onChange={e => set('jmeno', e.target.value)} style={inputStyle('jmeno')} />
          </div>
          <div>
            <label className="form-label">Prijmeni</label>
            <input value={form.prijmeni} onChange={e => set('prijmeni', e.target.value)} style={inputStyle()} />
          </div>
          {errors.jmeno && <div style={{ gridColumn: '1/-1', color: 'var(--danger)', fontSize: '0.8rem', marginTop: -8 }}>{errors.jmeno}</div>}
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Nazev firmy *</label>
          <input value={form.nazev_firmy} onChange={e => set('nazev_firmy', e.target.value)} style={inputStyle('nazev_firmy')} />
          {errors.nazev_firmy && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.nazev_firmy}</div>}
        </div>
      )}

      {/* ICO/DIC for pravnicka */}
      {form.type === 'pravnicka' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label className="form-label">ICO</label>
            <input value={form.ico} onChange={e => set('ico', e.target.value)} style={inputStyle()} />
          </div>
          <div>
            <label className="form-label">DIC</label>
            <input value={form.dic} onChange={e => set('dic', e.target.value)} style={inputStyle()} />
          </div>
        </div>
      )}

      {/* Contact */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Email</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Telefon</label>
          <input value={form.telefon} onChange={e => set('telefon', e.target.value)} style={inputStyle()} />
        </div>
      </div>

      {/* Address */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Ulice</label>
          <input value={form.ulice} onChange={e => set('ulice', e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Mesto</label>
          <input value={form.mesto} onChange={e => set('mesto', e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">PSC</label>
          <input value={form.psc} onChange={e => set('psc', e.target.value)} style={inputStyle()} />
        </div>
      </div>

      {/* Bank */}
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Cislo uctu</label>
        <input value={form.cislo_uctu} onChange={e => set('cislo_uctu', e.target.value)} style={inputStyle()} placeholder="123456789/0100" />
      </div>

      {/* Roles */}
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">
          Role *
          {errors.roles && <span style={{ color: 'var(--danger)', fontWeight: 400, marginLeft: 8, fontSize: '0.8rem' }}>{errors.roles}</span>}
        </label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ALL_ROLES.map(r => (
            <button key={r.value} type="button" onClick={() => toggleRole(r.value)}
              style={{
                padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontSize: '0.82rem',
                border: `1.5px solid ${form.roles.includes(r.value) ? 'var(--accent-blue)' : 'var(--border)'}`,
                background: form.roles.includes(r.value) ? 'rgba(80,200,240,0.1)' : 'transparent',
                color: form.roles.includes(r.value) ? 'var(--accent-blue)' : 'var(--text)',
                fontWeight: form.roles.includes(r.value) ? 600 : 400,
              }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="form-label">Poznamka</label>
        <textarea value={form.poznamka} onChange={e => set('poznamka', e.target.value)}
          rows={2} style={{ ...inputStyle(), resize: 'vertical' as const }} />
      </div>
    </Modal>
  );
}
