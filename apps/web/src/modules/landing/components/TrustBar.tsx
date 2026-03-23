import { TRUST_BAR } from '../../../data/landing-content'

export function TrustBar() {
  const logos = TRUST_BAR.logos
  // Duplicate for seamless loop
  const doubled = [...logos, ...logos]

  return (
    <section className="trust-bar" aria-label={TRUST_BAR.label} role="marquee">
      <div className="container">
        <p className="trust-bar__label">{TRUST_BAR.label}</p>
      </div>
      <div className="trust-bar__track-wrapper">
        <div
          className="trust-bar__track"
          style={{ animationDuration: `${TRUST_BAR.scrollDurationSeconds}s` }}
        >
          {doubled.map((logo, i) => (
            <span key={`${logo}-${i}`} className="trust-bar__logo">{logo}</span>
          ))}
        </div>
      </div>
    </section>
  )
}
