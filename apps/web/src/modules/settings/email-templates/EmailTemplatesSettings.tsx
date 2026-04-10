import { useState, useRef } from 'react'
import {
  useEmailTemplates,
  useSaveEmailTemplate,
  useResetEmailTemplate,
  usePreviewEmailTemplate,
} from '../../admin/api/admin.queries'
import { LoadingState, ErrorState, Button } from '../../../shared/components'
import { Save, RotateCcw, Eye, EyeOff, Code, Check } from 'lucide-react'

interface TemplateItem {
  code: string
  label: string
  subject: string
  body: string
  isCustom: boolean
  placeholders: string[]
  updatedAt: string | null
}

export function EmailTemplatesSettings() {
  const { data: templates, isLoading, error } = useEmailTemplates()
  const [selected, setSelected] = useState<string | null>(null)

  if (isLoading) return <LoadingState text="Nacitam sablony..." />
  if (error) return <ErrorState message="Nepodarilo se nacist sablony." />

  const list = (templates ?? []) as TemplateItem[]
  const current = list.find(t => t.code === selected) ?? list[0] ?? null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20, alignItems: 'start' }}>
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13 }}>
          Email sablony
        </div>
        {list.map(t => (
          <button
            key={t.code}
            onClick={() => setSelected(t.code)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '10px 16px', border: 'none',
              background: (current?.code === t.code) ? 'var(--bg-active, #f3f4f6)' : 'transparent',
              cursor: 'pointer', textAlign: 'left', fontSize: 13,
              borderLeft: (current?.code === t.code) ? '3px solid var(--primary, #6366f1)' : '3px solid transparent',
            }}
          >
            <span style={{ flex: 1 }}>{t.label}</span>
            {t.isCustom && (
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 4,
                background: 'var(--primary, #6366f1)', color: '#fff',
              }}>
                upraveno
              </span>
            )}
          </button>
        ))}
      </div>

      {current && <TemplateEditor key={current.code} template={current} />}
    </div>
  )
}

function TemplateEditor({ template }: { template: TemplateItem }) {
  const [subject, setSubject] = useState(template.subject)
  const [body, setBody] = useState(template.body)
  const [showPreview, setShowPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [saved, setSaved] = useState(false)

  const saveMutation = useSaveEmailTemplate()
  const resetMutation = useResetEmailTemplate()
  const previewMutation = usePreviewEmailTemplate()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleSave = async () => {
    await saveMutation.mutateAsync({ code: template.code, subject, body })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = async () => {
    if (!confirm('Obnovit vychozi sablonu? Vase upravy budou ztraceny.')) return
    await resetMutation.mutateAsync(template.code)
  }

  const handlePreview = async () => {
    if (showPreview) {
      setShowPreview(false)
      return
    }
    const result = await previewMutation.mutateAsync(template.code)
    setPreviewHtml(result.body)
    setShowPreview(true)
  }

  const insertPlaceholder = (ph: string) => {
    const textarea = document.getElementById('tpl-body') as HTMLTextAreaElement | null
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const tag = `{{${ph}}}`
    const newBody = body.substring(0, start) + tag + body.substring(end)
    setBody(newBody)
    setTimeout(() => {
      textarea.focus()
      textarea.selectionStart = textarea.selectionEnd = start + tag.length
    }, 0)
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>{template.label}</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant="default" onClick={handlePreview} disabled={previewMutation.isPending}>
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPreview ? 'Editor' : 'Nahled'}
          </Button>
          {template.isCustom && (
            <Button size="sm" variant="default" onClick={handleReset} disabled={resetMutation.isPending}>
              <RotateCcw size={14} /> Obnovit vychozi
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
            {saved ? <Check size={14} /> : <Save size={14} />}
            {saved ? 'Ulozeno' : 'Ulozit'}
          </Button>
        </div>
      </div>

      {/* Placeholders */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', display: 'block', marginBottom: 4 }}>
          Dostupne promenne:
        </label>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {template.placeholders.map(ph => (
            <button
              key={ph}
              onClick={() => insertPlaceholder(ph)}
              style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 4,
                border: '1px solid var(--border, #e5e7eb)',
                background: 'var(--bg-subtle, #f9fafb)',
                cursor: 'pointer', fontFamily: 'monospace',
              }}
            >
              <Code size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
              {`{{${ph}}}`}
            </button>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Predmet</label>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          className="input"
          style={{ width: '100%' }}
        />
      </div>

      {showPreview ? (
        <div style={{ border: '1px solid var(--border, #e5e7eb)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-subtle, #f9fafb)', fontSize: 12, fontWeight: 600, borderBottom: '1px solid var(--border, #e5e7eb)' }}>
            Nahled
          </div>
          <iframe
            ref={iframeRef}
            srcDoc={previewHtml}
            style={{ width: '100%', minHeight: 400, border: 'none' }}
            title="Email preview"
            sandbox=""
          />
        </div>
      ) : (
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Telo emailu (HTML)</label>
          <textarea
            id="tpl-body"
            value={body}
            onChange={e => setBody(e.target.value)}
            className="input"
            style={{
              width: '100%', minHeight: 350, fontFamily: 'monospace', fontSize: 12,
              lineHeight: 1.5, resize: 'vertical',
            }}
          />
        </div>
      )}

      {template.updatedAt && (
        <p style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', marginTop: 8, marginBottom: 0 }}>
          Naposledy upraveno: {new Date(template.updatedAt).toLocaleString('cs-CZ')}
        </p>
      )}
    </div>
  )
}
