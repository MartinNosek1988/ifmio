import { useState } from 'react';
import { Modal, Button } from '../../shared/components';
import { useDocumentStore, type Document, type DocTyp } from './document-store';
import { loadFromStorage } from '../../core/storage';
import { DOC_TYPE_LABELS } from '../../constants/labels';

type R = Record<string, unknown>;

const TYPY: DocTyp[] = ['smlouva', 'revize', 'faktura', 'pasport', 'pojisteni', 'ostatni'];

interface Props {
  document?: Document;
  onClose: () => void;
}

export default function DocumentForm({ document: doc, onClose }: Props) {
  const { create, update } = useDocumentStore();
  const isEdit = !!doc;
  const properties = loadFromStorage<R[]>('estateos_properties', []);
  const units = loadFromStorage<R[]>('estateos_units', []);

  const [form, setForm] = useState({
    nazev: doc?.nazev || '',
    typ: doc?.typ || ('smlouva' as DocTyp),
    propId: String(doc?.propId || ''),
    jednotkaId: String(doc?.jednotkaId || ''),
    datum: doc?.datum || new Date().toISOString().slice(0, 10),
    popis: doc?.popis || '',
    tagList: doc?.tagList?.join(', ') || '',
  });

  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(doc?.velikost || 0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));
  const filteredUnits = units.filter(u => form.propId && String(u.property_id) === form.propId);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.nazev.trim()) errs.nazev = 'Nazev je povinny';
    if (!form.datum) errs.datum = 'Datum je povinne';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFileName(f.name);
      setFileSize(f.size);
      if (!form.nazev) set('nazev', f.name);
    }
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const tags = form.tagList.split(',').map(t => t.trim()).filter(Boolean);
    const data = {
      nazev: form.nazev,
      typ: form.typ,
      propId: form.propId || undefined,
      jednotkaId: form.jednotkaId || undefined,
      datum: form.datum,
      popis: form.popis || undefined,
      velikost: fileSize || undefined,
      tagList: tags.length ? tags : undefined,
    };
    if (isEdit) update(doc!.id, data);
    else create(data);
    onClose();
  };

  const inputStyle = (field?: string) => ({
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box' as const,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  });

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Upravit dokument' : 'Nahrat dokument'}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrusit</Button>
          <Button variant="primary" onClick={handleSubmit}>{isEdit ? 'Ulozit' : 'Nahrat'}</Button>
        </div>
      }>

      {/* Upload zone */}
      {!isEdit && (
        <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: 20, textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: '2rem', marginBottom: 6 }}>{'\u{1F4C2}'}</div>
          <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 8 }}>
            {fileName ? `\u2713 ${fileName} (${Math.round(fileSize / 1024)} KB)` : 'Vyberte soubor'}
          </div>
          <label style={{ cursor: 'pointer' }}>
            <input type="file" style={{ display: 'none' }} onChange={handleFile} />
            <Button size="sm" onClick={() => {}}>Vybrat soubor</Button>
          </label>
          <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 6 }}>PDF, DOCX, XLSX, JPG, PNG</div>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Nazev dokumentu *</label>
        <input value={form.nazev} onChange={e => set('nazev', e.target.value)} style={inputStyle('nazev')} placeholder="napr. Najemni smlouva - Novak" />
        {errors.nazev && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.nazev}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Typ</label>
          <select value={form.typ} onChange={e => set('typ', e.target.value)} style={inputStyle()}>
            {TYPY.map(t => <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Datum *</label>
          <input type="date" value={form.datum} onChange={e => set('datum', e.target.value)} style={inputStyle('datum')} />
          {errors.datum && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.datum}</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Nemovitost</label>
          <select value={form.propId} onChange={e => { set('propId', e.target.value); set('jednotkaId', ''); }} style={inputStyle()}>
            <option value="">-- Obecny --</option>
            {properties.map(p => <option key={String(p.id)} value={String(p.id)}>{String(p.nazev || p.name)}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Jednotka</label>
          <select value={form.jednotkaId} onChange={e => set('jednotkaId', e.target.value)}
            disabled={!form.propId || filteredUnits.length === 0} style={inputStyle()}>
            <option value="">-- Cela nemovitost --</option>
            {filteredUnits.map(u => <option key={String(u.id)} value={String(u.id)}>c. {String(u.cislo)}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Popis</label>
        <textarea value={form.popis} onChange={e => set('popis', e.target.value)}
          rows={2} placeholder="Volitelny popis dokumentu..." style={{ ...inputStyle(), resize: 'vertical' as const }} />
      </div>

      <div>
        <label className="form-label">Stitky (oddelte carkou)</label>
        <input value={form.tagList} onChange={e => set('tagList', e.target.value)}
          placeholder="2024, vyrocni, SVJ..." style={inputStyle()} />
      </div>
    </Modal>
  );
}
