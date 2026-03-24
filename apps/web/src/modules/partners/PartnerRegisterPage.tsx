import { useState } from 'react'
import { PageLayout } from '../pages/PageLayout'
import { SeoHead } from '../../i18n/SeoHead'
import { useI18n } from '../../i18n/i18n'
import { ROUTE_SLUGS, getSlug, getLocalePair } from '../../i18n/routes'
import '../pages/pages.css'

export default function PartnerRegisterPage() {
  const { t, locale } = useI18n()
  const lp = getLocalePair(locale)
  const seo = t.seo.partners
  const [submitted, setSubmitted] = useState(false)
  return (
    <PageLayout>
      <SeoHead title={seo.title} description={seo.description} canonicalPath={`/${lp.canonical}/${getSlug(ROUTE_SLUGS.partners, lp.canonical)}/${getSlug(ROUTE_SLUGS.partnerRegister, lp.canonical)}/`} alternatePath={`/${lp.alternate}/${getSlug(ROUTE_SLUGS.partners, lp.alternate)}/${getSlug(ROUTE_SLUGS.partnerRegister, lp.alternate)}/`} />
      <div className="page-hero">
        <h1 className="page-hero__title" style={{ color: 'var(--dark)' }}>Staňte se partnerem ifmio</h1>
        <p className="page-hero__subtitle" style={{ color: 'var(--gray-500)' }}>Zaregistrujte se do naší databáze a získejte přístup k zakázkám.</p>
      </div>
      <div className="page-content page-content--narrow">
        {submitted ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>✅</div>
            <h2 style={{ fontFamily: 'var(--font-display)' }}>Registrace odeslána</h2>
            <p style={{ color: 'var(--gray-500)' }}>Ozveme se vám do 48 hodin.</p>
          </div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); setSubmitted(true) }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="page-form__field"><label className="page-form__label">Jméno *</label><input className="page-form__input" required /></div>
              <div className="page-form__field"><label className="page-form__label">E-mail *</label><input className="page-form__input" type="email" required /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="page-form__field"><label className="page-form__label">Telefon</label><input className="page-form__input" type="tel" /></div>
              <div className="page-form__field">
                <label className="page-form__label">Typ partnera *</label>
                <select className="page-form__input" required>
                  <option value="">Vyberte...</option><option>Správce</option><option>Facility manager</option><option>Řemeslník</option><option>Revizní technik</option>
                </select>
              </div>
            </div>
            <div className="page-form__field"><label className="page-form__label">Region</label><input className="page-form__input" placeholder="např. Praha, Středočeský kraj" /></div>
            <div className="page-form__field"><label className="page-form__label">Popis služeb</label><textarea className="page-form__input page-form__input--textarea" /></div>
            <button type="submit" className="btn btn--primary" style={{ width: '100%' }}>Zaregistrovat se</button>
          </form>
        )}
      </div>
    </PageLayout>
  )
}
