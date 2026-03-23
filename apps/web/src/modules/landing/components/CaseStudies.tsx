import { CASE_STUDIES } from '../../../data/landing-content'
import { TestimonialCard } from './TestimonialCard'

export function CaseStudies() {
  return (
    <section className="section" id="reference" aria-label="Reference" role="region" aria-roledescription="carousel">
      <div className="container">
        <p className="section__label">REFERENCE</p>
        <h2 className="section__headline">Co říkají naši klienti</h2>
        <div className="case-studies__track">
          {CASE_STUDIES.map(cs => (
            <TestimonialCard
              key={cs.client}
              client={cs.client}
              resultHeadline={cs.resultHeadline}
              quote={cs.quote}
              name={cs.name}
              role={cs.role}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
