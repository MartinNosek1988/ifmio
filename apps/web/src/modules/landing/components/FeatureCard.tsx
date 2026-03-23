interface Props {
  icon: string
  title: string
  benefit: string
  details: string
  kpi: string | null
  ctaText: string
}

export function FeatureCard({ icon, title, benefit, details, kpi, ctaText }: Props) {
  return (
    <article className="feature-card" tabIndex={0}>
      <div className="feature-card__icon" aria-hidden="true">{icon}</div>
      <h3 className="feature-card__title">{title}</h3>
      <p className="feature-card__benefit">{benefit}</p>
      <p className="feature-card__details">{details}</p>
      {kpi && <p className="feature-card__kpi">{kpi}</p>}
      <a href="#demo" className="feature-card__cta">{ctaText}</a>
    </article>
  )
}
