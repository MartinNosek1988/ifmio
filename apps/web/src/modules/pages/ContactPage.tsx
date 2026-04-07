import { useState } from 'react'
import { PageLayout } from './PageLayout'
import { SeoHead } from '../../i18n/SeoHead'
import { useI18n } from '../../i18n/i18n'
import { ROUTE_SLUGS, getSlug, getLocalePair } from '../../i18n/routes'
import './pages.css'

export default function ContactPage() {
  const { t, locale } = useI18n()
  const lp = getLocalePair(locale)
  const seo = t.seo.contact
  const [submitted, setSubmitted] = useState(false)

  return (
    <PageLayout>
      <SeoHead title={seo.title} description={seo.description} canonicalPath={`/${lp.canonical}/${getSlug(ROUTE_SLUGS.contact, lp.canonical)}/`} alternatePath={`/${lp.alternate}/${getSlug(ROUTE_SLUGS.contact, lp.alternate)}/`} />
      <div className="page-hero">
        <h1 className="page-hero__title" style={{ color: 'var(--dark)' }}>Kontaktujte nás</h1>
        <p className="page-hero__subtitle" style={{ color: 'var(--gray-500)' }}>Máte dotaz nebo potřebujete poradit? Ozvěte se nám.</p>
      </div>
      <div className="page-content page-content--narrow">
        <div className="contact-cards">
          <div className="contact-card"><div className="contact-card__icon">✉</div><div className="contact-card__label">E-mail</div><div className="contact-card__value"><a href="mailto:info@ifmio.com">info@ifmio.com</a></div></div>
          <div className="contact-card"><div className="contact-card__icon">◎</div><div className="contact-card__label">Adresa</div><div className="contact-card__value">Praha, Česká republika</div></div>
        </div>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>✅</div>
            <h2 style={{ fontFamily: 'var(--font-display)' }}>Zpráva odeslána</h2>
            <p style={{ color: 'var(--gray-500)' }}>Ozveme se vám co nejdříve.</p>
          </div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); setSubmitted(true) }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="page-form__field"><label className="page-form__label">Jméno *</label><input className="page-form__input" required /></div>
              <div className="page-form__field"><label className="page-form__label">E-mail *</label><input className="page-form__input" type="email" required /></div>
            </div>
            <div className="page-form__field">
              <label className="page-form__label">Předmět</label>
              <select className="page-form__input">
                <option>Obecný dotaz</option><option>Demo</option><option>Technická podpora</option><option>Partnerství</option><option>Fakturace</option>
              </select>
            </div>
            <div className="page-form__field"><label className="page-form__label">Zpráva *</label><textarea className="page-form__input page-form__input--textarea" required /></div>
            <label className="page-form__gdpr"><input type="checkbox" required /><span>Souhlasím se zpracováním osobních údajů</span></label>
            <button type="submit" className="btn btn--primary">Odeslat zprávu</button>
          </form>
        )}
      </div>
    </PageLayout>
  )
}
