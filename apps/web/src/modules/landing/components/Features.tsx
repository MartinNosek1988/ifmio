import { FEATURES } from '../../../data/landing-content'
import { FeatureCard } from './FeatureCard'
import { useIntersectionObserver } from '../hooks/useIntersectionObserver'

export function Features() {
  const { ref, isIntersecting } = useIntersectionObserver<HTMLElement>({ threshold: 0.05 })

  return (
    <section ref={ref} className="section section--dark" id="funkce" aria-label="Funkce">
      <div className="container">
        <p className="section__label">EFEKTIVITA</p>
        <h2 className="section__headline section__headline--light">Co ifmio umí pro vaši správu</h2>
        <div className={`features-grid${isIntersecting ? ' visible' : ''}`}>
          {FEATURES.map((f, i) => (
            <div key={f.id} className="animate-on-scroll" style={{ transitionDelay: `${i * 0.08}s` }}>
              <FeatureCard
                icon={f.icon}
                title={f.title}
                benefit={f.benefit}
                details={f.details}
                kpi={f.kpi}
                ctaText={f.ctaText}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
