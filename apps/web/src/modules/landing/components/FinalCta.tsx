import { FINAL_CTA } from '../../../data/landing-content'

export function FinalCta() {
  return (
    <section className="final-cta" aria-label="Závěrečná výzva">
      <div className="container final-cta__inner">
        <h2 className="final-cta__headline">{FINAL_CTA.headline}</h2>
        <a href="#demo" className="btn btn--dark btn--lg">{FINAL_CTA.cta}</a>
      </div>
    </section>
  )
}
