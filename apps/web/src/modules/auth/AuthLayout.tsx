import { Link } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import i18n from '../../core/i18n'

const LANGS = ['cs', 'en', 'sk', 'de', 'uk'] as const
const LANG_LABELS: Record<string, string> = { cs: 'CZ', en: 'EN', sk: 'SK', de: 'DE', uk: 'UA' }

interface Props {
  children: React.ReactNode
  headline: string
  subtext: string
  features?: { text: string }[]
}

export function AuthLayout({ children, headline, subtext, features }: Props) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Left panel — brand */}
      <div style={{
        flex: '0 0 55%', background: 'linear-gradient(135deg, #134E4A 0%, #0F766E 40%, #0D9488 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 80px',
        position: 'relative', overflow: 'hidden',
      }} className="auth-left-panel">
        {/* Decorative orbs */}
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-15%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48, textDecoration: 'none', position: 'relative', zIndex: 1 }}>
          <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Mono', monospace", fontSize: 14, color: '#fff', fontWeight: 700 }}>if</div>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '1.2rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>ifmio</span>
        </Link>

        <h1 style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 700, color: '#fff', lineHeight: 1.15, marginBottom: 16, position: 'relative', zIndex: 1 }}>
          {headline}
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, maxWidth: 420, marginBottom: 36, position: 'relative', zIndex: 1 }}>
          {subtext}
        </p>

        {features && features.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', zIndex: 1 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle size={18} style={{ color: '#5EEAD4', flexShrink: 0 }} />
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '.95rem' }}>{f.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right panel — form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff' }}>
        {/* Language switcher */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 24px', gap: 2 }}>
          {LANGS.map(lang => (
            <button key={lang} onClick={() => i18n.changeLanguage(lang)}
              style={{
                background: i18n.language === lang ? '#0D9488' : 'transparent',
                color: i18n.language === lang ? '#fff' : '#9CA3AF',
                border: '1px solid ' + (i18n.language === lang ? '#0D9488' : '#E5E7EB'),
                borderRadius: 6, padding: '3px 8px', fontSize: '11px', fontWeight: 600,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}>
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 40px 40px' }}>
          <div style={{ width: '100%', maxWidth: 420 }}>
            {children}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .auth-left-panel { display: none !important; }
        }
      `}</style>
    </div>
  )
}
