import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from '../../core/i18n'

const LANGS = ['cs', 'en', 'sk', 'de', 'uk'] as const

export default function LegalLayout({ titleKey, headingsKey, children }: {
  titleKey: string
  headingsKey?: string
  children?: React.ReactNode
}) {
  const { t } = useTranslation()
  const headings: string[] = headingsKey ? (t(headingsKey, { returnObjects: true }) as string[]) : []
  const placeholder = t('legal.placeholder')

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', color: '#1f2937' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <Link to="/login" style={{ color: '#6366f1', textDecoration: 'none', fontSize: '.85rem' }}>
            {t('legal.backToLogin')}
          </Link>
          <div>
            {LANGS.map(lang => (
              <button key={lang} onClick={() => i18n.changeLanguage(lang)}
                style={{ background: 'none', border: 'none', color: i18n.language === lang ? '#6366f1' : '#9ca3af', cursor: 'pointer', fontSize: '12px', padding: '0 5px', fontWeight: i18n.language === lang ? 600 : 400 }}>
                {t(`language.${lang}`)}
              </button>
            ))}
          </div>
        </div>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 32, color: '#111827' }}>
          {t(titleKey)}
        </h1>

        {children}

        {!children && headings.map((heading, i) => (
          <section key={i} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8, color: '#374151' }}>
              {i + 1}. {heading}
            </h2>
            <p style={{ color: '#6b7280', fontSize: '.9rem', lineHeight: 1.6 }}>{placeholder}</p>
          </section>
        ))}

        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24, marginTop: 40, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
            <Link to="/terms" style={{ color: '#6b7280', fontSize: '.8rem', textDecoration: 'none' }}>{t('legal.terms')}</Link>
            <Link to="/privacy" style={{ color: '#6b7280', fontSize: '.8rem', textDecoration: 'none' }}>{t('legal.privacy')}</Link>
            <Link to="/gdpr" style={{ color: '#6b7280', fontSize: '.8rem', textDecoration: 'none' }}>{t('legal.gdpr')}</Link>
            <Link to="/cookies" style={{ color: '#6b7280', fontSize: '.8rem', textDecoration: 'none' }}>{t('legal.cookies')}</Link>
          </div>
          <div style={{ color: '#9ca3af', fontSize: '.75rem' }}>
            {t('legal.copyright', { year: new Date().getFullYear() })}
          </div>
        </div>
      </div>
    </div>
  )
}
