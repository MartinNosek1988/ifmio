import { MID_CTA } from '../../../data/landing-content'

export function MidCta() {
  return (
    <section className="section section--teal" aria-label="Výzva k akci">
      <div className="container" style={{ textAlign: 'center' }}>
        <h2 className="section__headline section__headline--white">{MID_CTA.headline}</h2>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.1rem', maxWidth: 600, margin: '0 auto 32px' }}>
          {MID_CTA.subhead}
        </p>
        <a href="#demo" className="btn btn--white">{MID_CTA.cta}</a>
      </div>
    </section>
  )
}
