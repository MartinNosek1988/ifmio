import { PRICING } from '../../../data/landing-content'

export function PricingTeaser() {
  return (
    <section className="section section--gray" id="cenik" aria-label="Ceník">
      <div className="container" style={{ textAlign: 'center' }}>
        <h2 className="section__headline">{PRICING.headline}</h2>
        <p className="section__subhead">{PRICING.modelSummary}</p>
        <div className="pricing-grid">
          {PRICING.tiers.map((tier, i) => (
            <div key={tier.name} className={`pricing-tier${i === 1 ? ' pricing-tier--featured' : ''}`}>
              <h3 className="pricing-tier__name">{tier.name}</h3>
              <p className="pricing-tier__range">{tier.range}</p>
              <p className="pricing-tier__price">{tier.price}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#demo" className="btn btn--primary">{PRICING.ctaSecondary}</a>
          <a href="#" className="btn btn--ghost">{PRICING.ctaPrimary}</a>
        </div>
      </div>
    </section>
  )
}
