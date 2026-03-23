import { FEATURES, BENTO_STAT, BENTO_QUOTE } from '../../../data/landing-content'
import { useIntersectionObserver } from '../hooks/useIntersectionObserver'

export function Features() {
  const { ref, isIntersecting } = useIntersectionObserver<HTMLElement>({ threshold: 0.05 })

  return (
    <section ref={ref} className="section" id="funkce" aria-label="Funkce">
      <div className="container">
        <p className="section__label">EFEKTIVITA</p>
        <h2 className="section__headline">Co ifmio umí pro vaši správu</h2>

        <div className="bento-grid">
          {/* Row 1: Mio AI (span 2) + Stat */}
          <div className={`bento-card bento-card--large animate-on-scroll${isIntersecting ? ' visible' : ''}`} style={{ transitionDelay: '0s' }}>
            <span className="bento-card__tag">{FEATURES[0].tag}</span>
            <h3 className="bento-card__title">{FEATURES[0].title}</h3>
            <p className="bento-card__desc">{FEATURES[0].desc}</p>
            <a href="#demo" className="bento-card__link">Prozkoumat</a>
          </div>
          <div className={`bento-stat animate-on-scroll${isIntersecting ? ' visible' : ''}`} style={{ transitionDelay: '0.08s' }}>
            <div className="bento-stat__value">{BENTO_STAT.value}</div>
            <div className="bento-stat__label">{BENTO_STAT.label}</div>
          </div>

          {/* Row 2: Predpisy + Work Orders + Quote */}
          {FEATURES.slice(1, 3).map((f, i) => (
            <div key={f.id} className={`bento-card animate-on-scroll${isIntersecting ? ' visible' : ''}`} style={{ transitionDelay: `${(i + 2) * 0.08}s` }}>
              <span className="bento-card__tag">{f.tag}</span>
              <h3 className="bento-card__title">{f.title}</h3>
              <p className="bento-card__desc">{f.desc}</p>
              <a href="#demo" className="bento-card__link">Prozkoumat</a>
            </div>
          ))}
          <div className={`bento-quote animate-on-scroll${isIntersecting ? ' visible' : ''}`} style={{ transitionDelay: '0.32s' }}>
            <blockquote>{BENTO_QUOTE.text}</blockquote>
            <div className="bento-quote__author">
              <div className="bento-quote__avatar">{BENTO_QUOTE.initials}</div>
              <span>{BENTO_QUOTE.name}</span>
            </div>
          </div>

          {/* Row 3: Komunikace + Compliance */}
          {FEATURES.slice(3, 5).map((f, i) => (
            <div key={f.id} className={`bento-card animate-on-scroll${isIntersecting ? ' visible' : ''}`} style={{ transitionDelay: `${(i + 5) * 0.08}s` }}>
              <span className="bento-card__tag">{f.tag}</span>
              <h3 className="bento-card__title">{f.title}</h3>
              <p className="bento-card__desc">{f.desc}</p>
              <a href="#demo" className="bento-card__link">Prozkoumat</a>
            </div>
          ))}

          {/* Row 4: Finance (span 2) */}
          <div className={`bento-card bento-card--wide animate-on-scroll${isIntersecting ? ' visible' : ''}`} style={{ transitionDelay: '0.56s' }}>
            <span className="bento-card__tag">{FEATURES[5].tag}</span>
            <h3 className="bento-card__title">{FEATURES[5].title}</h3>
            <p className="bento-card__desc">{FEATURES[5].desc}</p>
            <a href="#demo" className="bento-card__link">Prozkoumat</a>
          </div>
        </div>
      </div>
    </section>
  )
}
