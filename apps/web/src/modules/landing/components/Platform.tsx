import { PLATFORM } from '../../../data/landing-content'
import { useIntersectionObserver } from '../hooks/useIntersectionObserver'

export function Platform() {
  const { ref, isIntersecting } = useIntersectionObserver<HTMLElement>()

  return (
    <section ref={ref} className={`section section--gray animate-on-scroll${isIntersecting ? ' visible' : ''}`} id="platforma" aria-label="Platforma">
      <div className="container platform">
        <div className="platform__text">
          <p className="section__label">{PLATFORM.sectionLabel}</p>
          <h2 className="section__headline">{PLATFORM.headline}</h2>
          <div className="platform__bullets">
            {PLATFORM.bullets.map(b => (
              <div key={b.title} className="platform__bullet">
                <span className="platform__bullet-icon" aria-hidden="true">{b.icon}</span>
                <div>
                  <strong className="platform__bullet-title">{b.title}</strong>
                  <p className="platform__bullet-desc">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="platform__ctas">
            <a href="#demo" className="btn btn--primary">{PLATFORM.ctaPrimary}</a>
            <a href="#funkce" className="btn btn--ghost">{PLATFORM.ctaSecondary}</a>
          </div>
        </div>
        <div className="platform__visual">
          <div className="platform__screenshot">
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.9rem' }}>
              Dashboard screenshot
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
