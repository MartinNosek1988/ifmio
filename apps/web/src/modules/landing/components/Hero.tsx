import { HERO } from '../../../data/landing-content'

export function Hero() {
  return (
    <section className="hero" id="hero" aria-label="Hlavní sekce">
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="hero__badges animate-on-scroll visible" style={{ animationDelay: '0s' }}>
          {HERO.badges.map(b => <span key={b} className="hero__badge">{b}</span>)}
        </div>
        <h1 className="hero__title animate-on-scroll visible" style={{ animationDelay: '0.15s' }}>
          {HERO.h1Before}<em>{HERO.h1Em}</em>
        </h1>
        <p className="hero__subhead animate-on-scroll visible" style={{ animationDelay: '0.3s' }}>{HERO.subhead}</p>
        <div className="hero__ctas animate-on-scroll visible" style={{ animationDelay: '0.45s' }}>
          <a href="#demo" className="btn btn--primary btn--lg">{HERO.ctaPrimary}</a>
          <a href="#kontakt" className="btn btn--ghost">{HERO.ctaSecondary}</a>
        </div>
      </div>
    </section>
  )
}
