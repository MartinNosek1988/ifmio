import { useI18n } from '../../../i18n/i18n'

export function CaseStudies() {
  const { t, localePath } = useI18n()
  const c = t.cases

  return (
    <section className="section" id="reference" aria-label="References">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p className="section__label">{c.label}</p>
            <h2 className="section__headline" style={{ marginBottom: 0 }}>{c.title}</h2>
          </div>
          <a href={localePath('/demo')} className="btn btn--primary">{c.cta}</a>
        </div>
        <div className="case-studies-grid">
          {c.items.map(cs => (
            <article key={cs.client} className="case-study-card">
              <div className="case-study-card__header">
                <div className="case-study-card__badge">{cs.client}</div>
                <div className="case-study-card__stat">{cs.stat}</div>
              </div>
              <div className="case-study-card__body">
                <blockquote className="case-study-card__quote">{cs.quote}</blockquote>
                <div className="case-study-card__author">
                  <div className="case-study-card__avatar">{cs.initials}</div>
                  <div>
                    <div className="case-study-card__name">{cs.name}</div>
                    <div className="case-study-card__role">{cs.role}</div>
                  </div>
                </div>
                <a href="#" className="case-study-card__link">{c.readMore}</a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
