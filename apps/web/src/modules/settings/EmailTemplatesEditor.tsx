import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Modal, LoadingSpinner } from '../../shared/components'
import { FormField } from '../../shared/components/FormField'
import { apiClient } from '../../core/api/client'
import { Mail, RotateCcw, Eye, Save } from 'lucide-react'

interface Template {
  code: string
  label: string
  subject: string
  body: string
  isCustom: boolean
  placeholders: string[]
  updatedAt: string | null
}

export default function EmailTemplatesEditor() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Template | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null)

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ['admin', 'email-templates'],
    queryFn: () => apiClient.get('/admin/email-templates').then(r => r.data),
  })

  const saveMut = useMutation({
    mutationFn: ({ code, subject, body }: { code: string; subject: string; body: string }) =>
      apiClient.put(`/admin/email-templates/${code}`, { subject, body }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'email-templates'] }); setEditing(null) },
  })

  const resetMut = useMutation({
    mutationFn: (code: string) => apiClient.post(`/admin/email-templates/${code}/reset`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'email-templates'] }); setEditing(null) },
  })

  const previewMut = useMutation({
    mutationFn: (code: string) =>
      apiClient.post<{ subject: string; body: string }>(`/admin/email-templates/${code}/preview`).then(r => r.data),
    onSuccess: (data) => setPreview(data),
  })

  const openEditor = (t: Template) => {
    setEditing(t)
    setSubject(t.subject)
    setBody(t.body)
    setPreview(null)
  }

  const insertPlaceholder = (p: string) => {
    setBody(prev => prev + `{{${p}}}`)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Email šablony</h2>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{templates.length} šablon</span>
      </div>

      {/* Template list */}
      {templates.map(t => (
        <div
          key={t.code}
          onClick={() => openEditor(t)}
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 8,
            marginBottom: 6, cursor: 'pointer', background: 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mail size={16} style={{ color: 'var(--text-muted)' }} />
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{t.label}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{t.code}</div>
            </div>
          </div>
          <Badge variant={t.isCustom ? 'blue' : 'muted'}>
            {t.isCustom ? 'Upraveno' : 'Výchozí'}
          </Badge>
        </div>
      ))}

      {/* Editor modal */}
      {editing && (
        <Modal
          open
          onClose={() => setEditing(null)}
          title={`Upravit: ${editing.label}`}
          wide
        >
          <FormField label="Předmět" name="subject">
            <input
              className="input"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              style={{ width: '100%' }}
            />
          </FormField>

          <FormField label="Tělo emailu (HTML)" name="body">
            <textarea
              className="input"
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={12}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.82rem', resize: 'vertical' }}
            />
          </FormField>

          {/* Placeholders */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 500, marginBottom: 6 }}>Dostupné proměnné:</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {editing.placeholders.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => insertPlaceholder(p)}
                  style={{
                    padding: '3px 8px', fontSize: '0.78rem', fontFamily: 'monospace',
                    background: 'var(--surface-2, #f3f4f6)', border: '1px solid var(--border)',
                    borderRadius: 4, cursor: 'pointer', color: 'var(--primary)',
                  }}
                >
                  {'{{' + p + '}}'}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 16, background: 'var(--surface-2, #f9fafb)' }}>
              <div style={{ fontWeight: 500, fontSize: '0.85rem', marginBottom: 8 }}>Náhled:</div>
              <div style={{ fontSize: '0.82rem', marginBottom: 4 }}><strong>Předmět:</strong> {preview.subject}</div>
              <div style={{ fontSize: '0.82rem', maxHeight: 200, overflow: 'auto' }} dangerouslySetInnerHTML={{ __html: preview.body }} />
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            <div>
              {editing.isCustom && (
                <Button variant="danger" size="sm" icon={<RotateCcw size={14} />} onClick={() => resetMut.mutate(editing.code)} disabled={resetMut.isPending}>
                  Reset na výchozí
                </Button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" icon={<Eye size={14} />} onClick={() => previewMut.mutate(editing.code)} disabled={previewMut.isPending}>
                Náhled
              </Button>
              <Button onClick={() => setEditing(null)}>Zrušit</Button>
              <Button variant="primary" icon={<Save size={14} />} onClick={() => saveMut.mutate({ code: editing.code, subject, body })} disabled={saveMut.isPending}>
                {saveMut.isPending ? 'Ukládám...' : 'Uložit'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
