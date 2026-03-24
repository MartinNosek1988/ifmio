import { useI18n } from '../../../i18n/i18n'
import { useIntersectionObserver } from '../hooks/useIntersectionObserver'

export function Features() {
  const { ref, isIntersecting } = useIntersectionObserver<HTMLElement>({ threshold: 0.05 })
  const { t, localePath } = useI18n()
  const f = t.features
  const cards = f.cards

  return (
    <section ref={ref} className="section" id="funkce" aria-label="Features">
      <div className="container">
        <p className="section__label">{f.label}</p>
        <h2 className="section__headline">{f.title}</h2>

        <div className="bento-grid">
          {/* Row 1: Mio AI (span 2) + Stat */}
          <div className={`bento-card bento-card--large animate-on-scroll${isIntersecting ? ' visible' : ''}`} style={{ transitionDelay: '0s' }}>
            <span className="bento-card__tag">{cards[0].tag}</span>
            <h3 className="bento-card__title">{cards[0].title}</h3>
            <p className="bento-card__desc">{cards[0].desc}</p>
            <a href={localePath('/demo')} className="bento-card__link">{f.explore}</a>
          </div>
          <div className={`bento-stat animate-on-scroll${isIntersecting ? ' visible' : ''}`} style={{ transitionDelay: '0.08s' }}>
            <div className="bento-stat__value">{f.statValue}</div>
            <div className="bento-stat__label">{f.statLabel}</div>
          </div>

          {/* Row 2 */}
          {cards.slice(1, 3).map((c, i) => (
            <div key={i} className={`bento-card animate-on-scroll${isIntersecting ? ' visible' : ''}`} style={{ transitionDelay: `${(i + 2) * 0.08}s` }}>
              <span className="bento-card__tag">{c.tag}</span>
              <h3 className="bento-card__title">{c.title}</h3>
              <p className="bento-card__desc">{c.desc}</p>
              <a href={localePath('/demo')} className="bento-card__link">{f.explore}</a>
            </div>
          ))}
          <div className={`bento-quote animate-on-scroll${isIntersecting ? ' visible' : ''}`} style={{ transitionDelay: '0.32s' }}>
            <blockquote>{f.quoteText}</blockquote>
            <div className="bento-quote__author">
              <div className="bento-quote__avatar">{f.quoteInitials}</div>
              <span>{f.quoteName}</span>
            </div>
          </div>

          {/* Row 3 */}
          {cards.slice(3, 5).map((c, i) => (
            <div key={i} className={`bento-card animate-on-scroll${isIntersecting ? ' visible' : ''}`} style={{ transitionDelay: `${(i + 5) * 0.08}s` }}>
              <span className="bento-card__tag">{c.tag}</span>
              <h3 className="bento-card__title">{c.title}</h3>
              <p className="bento-card__desc">{c.desc}</p>
              <a href={localePath('/demo')} className="bento-card__link">{f.explore}</a>
            </div>
          ))}

          {/* Row 4 */}
          <div className={`bento-card bento-card--wide animate-on-scroll${isIntersecting ? ' visible' : ''}`} style={{ transitionDelay: '0.56s' }}>
            <span className="bento-card__tag">{cards[5].tag}</span>
            <h3 className="bento-card__title">{cards[5].title}</h3>
            <p className="bento-card__desc">{cards[5].desc}</p>
            <a href={localePath('/demo')} className="bento-card__link">{f.explore}</a>
          </div>
        </div>
      </div>
    </section>
  )
}
