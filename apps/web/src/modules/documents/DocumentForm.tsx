import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, Button } from '../../shared/components';
import { useUploadDocument } from './api/documents.queries';
import { DOC_TYPE_LABELS } from '../../constants/labels';
import { propertiesApi } from '../properties/properties-api';
import type { DocCategory } from './api/documents.api';

const CATEGORIES: DocCategory[] = ['contract', 'invoice', 'protocol', 'photo', 'plan', 'regulation', 'other'];

interface Props {
  onClose: () => void;
}

export default function DocumentForm({ onClose }: Props) {
  const uploadMutation = useUploadDocument();

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.list(),
  });

  const [form, setForm] = useState({
    name: '',
    category: 'other' as DocCategory,
    propertyId: '',
    unitId: '',
    description: '',
    tags: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const selectedProp = properties?.find(p => p.id === form.propertyId);
  const availableUnits = useMemo(() => selectedProp?.units ?? [], [selectedProp]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Nazev je povinny';
    if (!file) errs.file = 'Vyberte soubor';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!form.name) set('name', f.name);
    }
  };

  const handleSubmit = () => {
    if (!validate() || !file) return;
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    uploadMutation.mutate({
      file,
      meta: {
        name: form.name,
        category: form.category,
        description: form.description || undefined,
        tags: tags.length ? tags : undefined,
        entityType: form.propertyId ? 'property' : undefined,
        entityId: form.propertyId || undefined,
      },
    }, { onSuccess: () => onClose() });
  };

  const inputStyle = (field?: string) => ({
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box' as const,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  });

  return (
    <Modal open onClose={onClose} title="Nahrat dokument"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrusit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? 'Nahravam...' : 'Nahrat'}
          </Button>
        </div>
      }>

      {/* Upload zone */}
      <div style={{
        border: `2px dashed ${errors.file ? 'var(--danger)' : 'var(--border)'}`,
        borderRadius: 10, padding: 20, textAlign: 'center', marginBottom: 16,
      }}>
        <div style={{ fontSize: '2rem', marginBottom: 6 }}>{'\u{1F4C2}'}</div>
        <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 8 }}>
          {file ? `\u2713 ${file.name} (${Math.round(file.size / 1024)} KB)` : 'Vyberte soubor'}
        </div>
        <label style={{ cursor: 'pointer' }}>
          <input type="file" style={{ display: 'none' }} onChange={handleFile}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.txt,.csv" />
          <Button size="sm" onClick={() => {}}>Vybrat soubor</Button>
        </label>
        <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 6 }}>PDF, DOCX, XLSX, JPG, PNG (max 20 MB)</div>
        {errors.file && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 4 }}>{errors.file}</div>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Nazev dokumentu *</label>
        <input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle('name')} placeholder="napr. Revizni zprava elektro 2024" />
        {errors.name && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.name}</div>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Kategorie</label>
        <select value={form.category} onChange={e => set('category', e.target.value)} style={inputStyle()}>
          {CATEGORIES.map(c => <option key={c} value={c}>{DOC_TYPE_LABELS[c]}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Nemovitost</label>
          <select value={form.propertyId} onChange={e => { set('propertyId', e.target.value); set('unitId', ''); }} style={inputStyle()}>
            <option value="">-- Obecny --</option>
            {(properties ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Jednotka</label>
          <select value={form.unitId} onChange={e => set('unitId', e.target.value)}
            disabled={!form.propertyId || availableUnits.length === 0} style={inputStyle()}>
            <option value="">-- Cela nemovitost --</option>
            {availableUnits.map(u => <option key={u.id} value={u.id}>{u.name}{u.area ? ` · ${u.area} m2` : ''}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Popis</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          rows={2} placeholder="Volitelny popis dokumentu..." style={{ ...inputStyle(), resize: 'vertical' as const }} />
      </div>

      <div>
        <label className="form-label">Stitky (oddelte carkou)</label>
        <input value={form.tags} onChange={e => set('tags', e.target.value)}
          placeholder="2024, vyrocni, SVJ..." style={inputStyle()} />
      </div>
    </Modal>
  );
}
