import { HERO } from '../../../data/landing-content'

export function Hero() {
  return (
    <section className="hero" id="hero" aria-label="Hlavní sekce">
      <div className="container hero__inner">
        <div className="hero__badges" style={{ animationDelay: '0.1s' }}>
          {HERO.badges.map(badge => (
            <span key={badge} className="hero__badge" aria-label={badge}>{badge}</span>
          ))}
        </div>

        <h1 className="hero__title" style={{ animationDelay: '0.2s' }}>{HERO.h1}</h1>

        <p className="hero__subhead" style={{ animationDelay: '0.4s' }}>{HERO.subhead}</p>

        <div className="hero__ctas" style={{ animationDelay: '0.6s' }}>
          <a href="#demo" className="btn btn--primary btn--lg">{HERO.ctaPrimary.text}</a>
          <a href="#kontakt" className="btn btn--ghost">{HERO.ctaSecondary}</a>
        </div>
        <p className="hero__microcopy">{HERO.ctaPrimary.microcopy}</p>

        <p className="hero__trust-line">{HERO.trustLine}</p>
      </div>
    </section>
  )
}
