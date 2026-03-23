import { FINAL_CTA } from '../../../data/landing-content'

export function FinalCta() {
  return (
    <section className="section section--teal" aria-label="Závěrečná výzva">
      <div className="container" style={{ textAlign: 'center' }}>
        <h2 className="section__headline section__headline--white" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
          {FINAL_CTA.headline}
        </h2>
        <a href="#demo" className="btn btn--white btn--lg" style={{ marginTop: 24 }}>{FINAL_CTA.cta}</a>
      </div>
    </section>
  )
}
