import { useState } from 'react'
import { useI18n } from '../../../i18n/i18n'
import { ROUTE_SLUGS } from '../../../i18n/routes'

export function Hero() {
  const { locale, t, localePath } = useI18n()
  const h = t.hero
  const [heroEmail, setHeroEmail] = useState('')

  const handleHeroSubmit = () => {
    if (!heroEmail) return
    sessionStorage.setItem('prefill_email', heroEmail)
    window.location.href = localePath(`/${ROUTE_SLUGS.demo[locale] ?? 'demo'}`)
  }

  return (
    <section className="hero" id="hero">
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="hero__badges animate-on-scroll visible" style={{ animationDelay: '0s' }}>
          {h.badges.map(b => <span key={b} className="hero__badge">{b}</span>)}
        </div>
        <h1 className="hero__title animate-on-scroll visible" style={{ animationDelay: '0.15s' }}>
          {h.h1Before}<em>{h.h1Em}</em>
        </h1>
        <p className="hero__subhead animate-on-scroll visible" style={{ animationDelay: '0.3s' }}>{h.subhead}</p>
        <div className="hero-email-capture animate-on-scroll visible" style={{ animationDelay: '0.45s' }}>
          <input
            type="email"
            placeholder={h.emailPlaceholder}
            value={heroEmail}
            onChange={e => setHeroEmail(e.target.value)}
            className="hero-email-input"
            onKeyDown={e => e.key === 'Enter' && handleHeroSubmit()}
          />
          <button onClick={handleHeroSubmit} className="hero-email-btn">
            {h.ctaEmail}
          </button>
        </div>
      </div>
    </section>
  )
}
