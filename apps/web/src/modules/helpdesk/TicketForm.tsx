import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, Button } from '../../shared/components';
import { useCreateTicket } from './api/helpdesk.queries';
import { useProperties } from '../properties/use-properties';
import { apiClient } from '../../core/api/client';
import { useAuthStore } from '../../core/auth/auth.store';
import { documentsApi } from '../documents/api/documents.api';
import type { ApiProperty } from '../properties/properties-api';

const CATEGORIES = [
  { value: 'general', label: 'Obecné' },
  { value: 'plumbing', label: 'Vodovod a kanalizace' },
  { value: 'electrical', label: 'Elektroinstalace' },
  { value: 'hvac', label: 'Vytápění / VZT' },
  { value: 'structural', label: 'Stavební práce' },
  { value: 'cleaning', label: 'Úklid' },
  { value: 'other', label: 'Ostatní' },
];

const PRIORITIES = [
  { value: 'low', label: 'Nízká' },
  { value: 'medium', label: 'Normální' },
  { value: 'high', label: 'Vysoká' },
  { value: 'urgent', label: 'Urgentní' },
];

interface Props {
  onClose: () => void;
}

interface TenantUser { id: string; name: string; email: string; role: string; isActive: boolean }
interface AssetOption { id: string; name: string; location: string | null; property?: { name: string } | null }

export default function TicketForm({ onClose }: Props) {
  const createMutation = useCreateTicket();
  const { data: properties = [] } = useProperties();
  const currentUser = useAuthStore((s) => s.user);

  const { data: users = [] } = useQuery<TenantUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => apiClient.get('/admin/users').then((r) => r.data),
  });

  const { data: assetsData } = useQuery<{ data: AssetOption[] }>({
    queryKey: ['assets', 'list-picker'],
    queryFn: () => apiClient.get('/assets', { params: { limit: 500 } }).then((r) => r.data),
  });
  const assets = assetsData?.data ?? [];

  const activeUsers = users.filter((u: TenantUser) => u.isActive);

  const [form, setForm] = useState({
    title: '',
    description: '',
    propertyId: '',
    unitId: '',
    priority: 'medium',
    category: 'general',
    assetId: '',
    requesterUserId: currentUser?.id ?? '',
    dispatcherUserId: '',
    assigneeId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [uploadWarning, setUploadWarning] = useState('');

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const selectedProperty = (properties as ApiProperty[]).find((p) => p.id === form.propertyId);
  const availableUnits = selectedProperty?.units ?? [];

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Název je povinný';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMutation.mutate(
      {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        priority: form.priority,
        propertyId: form.propertyId || undefined,
        unitId: form.unitId || undefined,
        assetId: form.assetId || undefined,
        requesterUserId: form.requesterUserId || undefined,
        dispatcherUserId: form.dispatcherUserId || undefined,
        assigneeId: form.assigneeId || undefined,
      },
      {
        onSuccess: async (ticket: any) => {
          // Upload files after ticket creation (two-step)
          if (files.length > 0 && ticket?.id) {
            const prefix = `HD-${String(ticket.number).padStart(4, '0')}`;
            try {
              for (const file of files) {
                await documentsApi.upload(file, {
                  name: `${prefix} — ${file.name}`,
                  category: file.type.startsWith('image/') ? 'photo' : 'other',
                  entityType: 'ticket',
                  entityId: ticket.id,
                });
              }
            } catch {
              setUploadWarning('Požadavek byl vytvořen, ale některé přílohy se nepodařilo nahrát.');
              return; // Don't close — show warning
            }
          }
          onClose();
        },
      },
    );
  };

  const inputStyle = (field?: string) => ({
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    boxSizing: 'border-box' as const,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))',
    color: 'var(--text)',
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Nový požadavek"
      wide
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Vytvářím...' : 'Vytvořit'}
          </Button>
        </div>
      }
    >
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Název *</label>
        <input
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Stručný popis problému"
          style={inputStyle('title')}
        />
        {errors.title && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.title}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Nemovitost</label>
          <select
            value={form.propertyId}
            onChange={(e) => { set('propertyId', e.target.value); set('unitId', ''); }}
            style={inputStyle()}
          >
            <option value="">— vyberte —</option>
            {(properties as ApiProperty[]).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        {availableUnits.length > 0 && (
          <div>
            <label className="form-label">Jednotka</label>
            <select value={form.unitId} onChange={(e) => set('unitId', e.target.value)} style={inputStyle()}>
              <option value="">— bez jednotky —</option>
              {availableUnits.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Kategorie</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)} style={inputStyle()}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Priorita</label>
          <select value={form.priority} onChange={(e) => set('priority', e.target.value)} style={inputStyle()}>
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {/* Asset picker */}
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Zařízení</label>
        <select value={form.assetId} onChange={(e) => set('assetId', e.target.value)} style={inputStyle()}>
          <option value="">— bez zařízení —</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}{a.location ? ` (${a.location})` : ''}{a.property ? ` · ${a.property.name}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Responsibility fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Zadavatel požadavku</label>
          <select value={form.requesterUserId} onChange={(e) => set('requesterUserId', e.target.value)} style={inputStyle()}>
            <option value="">— vyberte —</option>
            {activeUsers.map((u: TenantUser) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Dispečer požadavku</label>
          <select value={form.dispatcherUserId} onChange={(e) => set('dispatcherUserId', e.target.value)} style={inputStyle()}>
            <option value="">— bez dispečera —</option>
            {activeUsers.map((u: TenantUser) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignee picker */}
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Řešitel</label>
        <select value={form.assigneeId} onChange={(e) => set('assigneeId', e.target.value)} style={inputStyle()}>
          <option value="">— nevybráno —</option>
          {activeUsers.map((u: TenantUser) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Popis</label>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={4}
          placeholder="Detailní popis problému, umístění, okolnosti..."
          style={{ ...inputStyle(), resize: 'vertical' as const }}
        />
      </div>

      {/* File upload */}
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Přílohy</label>
        <input
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          onChange={(e) => {
            if (e.target.files) setFiles(Array.from(e.target.files));
          }}
          style={inputStyle()}
        />
        {files.length > 0 && (
          <div style={{ marginTop: 6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {files.map((f, i) => (
              <div key={i}>{f.name} ({(f.size / 1024).toFixed(0)} KB)</div>
            ))}
          </div>
        )}
      </div>

      <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: 8 }}>
        Datum a čas zadání se nastavují automaticky při založení požadavku.
        Termín „Vyřešit do" se určuje podle priority požadavku.
      </div>

      {uploadWarning && (
        <div style={{ color: 'var(--accent-orange, #f59e0b)', fontSize: '0.85rem', marginTop: 12 }}>
          {uploadWarning}
        </div>
      )}

      {createMutation.isError && (
        <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 12 }}>
          Nepodařilo se vytvořit požadavek.
        </div>
      )}
    </Modal>
  );
}
