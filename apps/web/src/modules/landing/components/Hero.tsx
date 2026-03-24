import { useI18n } from '../../../i18n/i18n'
import { ROUTE_SLUGS } from '../../../i18n/routes'

export function Hero() {
  const { locale, t, localePath } = useI18n()
  const h = t.hero

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
        <div className="hero__ctas animate-on-scroll visible" style={{ animationDelay: '0.45s' }}>
          <a href={localePath(`/${ROUTE_SLUGS.demo[locale] ?? 'demo'}`)} className="btn btn--primary btn--lg">{h.ctaPrimary}</a>
          <a href={localePath(`/${ROUTE_SLUGS.contact[locale] ?? 'kontakt'}`)} className="btn btn--ghost">{h.ctaSecondary}</a>
        </div>
      </div>
    </section>
  )
}
