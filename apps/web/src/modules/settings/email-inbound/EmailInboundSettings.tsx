import { useState } from 'react'
import { Mail, Copy, Check, Loader2 } from 'lucide-react'
import { useEmailInboundConfig, useUpsertEmailInboundConfig } from './email-inbound.api'

export function EmailInboundSettings() {
  const { data: config, isLoading } = useEmailInboundConfig()
  const upsert = useUpsertEmailInboundConfig()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!config?.address) return
    navigator.clipboard.writeText(config.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleActivate = () => upsert.mutate({ isActive: true })
  const handleToggle = (field: 'isActive' | 'autoApprove', value: boolean) =>
    upsert.mutate({ [field]: value })

  if (isLoading) return <div style={{ padding: 20, color: 'var(--text-muted)' }}>Načítám...</div>

  // Not yet configured
  if (!config) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Mail size={18} style={{ color: 'var(--primary)' }} />
          <h3 style={{ margin: 0, fontWeight: 700 }}>Příjem faktur emailem</h3>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 16, lineHeight: 1.6 }}>
          Pošlete fakturu (PDF nebo ISDOC XML) jako přílohu na vaši unikátní adresu
          a automaticky se zařadí do Dokladů jako draft.
        </p>
        <button
          className="btn btn--primary btn--sm"
          onClick={handleActivate}
          disabled={upsert.isPending}
        >
          {upsert.isPending ? <Loader2 size={14} className="spin" /> : <Mail size={14} />}
          Aktivovat příjem emailů
        </button>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Mail size={18} style={{ color: 'var(--primary)' }} />
        <h3 style={{ margin: 0, fontWeight: 700 }}>Příjem faktur emailem</h3>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 16, lineHeight: 1.6 }}>
        Pošlete fakturu (PDF nebo ISDOC XML) jako přílohu na tuto adresu
        a automaticky se zařadí do Dokladů.
      </p>

      {/* Address display */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
          Vaše adresa:
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <code style={{
            flex: 1, padding: '10px 14px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg-subtle, #f8f9fa)',
            fontSize: '0.9rem', fontFamily: 'monospace',
          }}>
            {config.address}
          </code>
          <button
            className="btn btn--ghost btn--sm"
            onClick={handleCopy}
            title="Kopírovat adresu"
          >
            {copied ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
            {copied ? 'Zkopírováno!' : 'Kopírovat'}
          </button>
        </div>
      </div>

      {/* Toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={config.isActive}
            onChange={e => handleToggle('isActive', e.target.checked)}
          />
          <span style={{ fontSize: '0.875rem' }}>Aktivní</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={config.autoApprove}
            onChange={e => handleToggle('autoApprove', e.target.checked)}
          />
          <span style={{ fontSize: '0.875rem' }}>Automaticky schvalovat faktury od známých dodavatelů</span>
        </label>
      </div>

      <p style={{ marginTop: 16, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        💡 Tuto adresu nastavte u dodavatelů (PVK, ČEZ, PRE...) jako kontakt pro zasílání faktur.
      </p>
    </div>
  )
}
