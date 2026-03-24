import { useI18n } from '../../../i18n/i18n'

export function FinalCta() {
  const { t, localePath } = useI18n()
  return (
    <section className="final-cta" aria-label="Final CTA">
      <div className="container final-cta__inner">
        <h2 className="final-cta__headline">{t.finalCta.headline}</h2>
        <a href={localePath('/demo')} className="btn btn--dark btn--lg">{t.finalCta.cta}</a>
      </div>
    </section>
  )
}
