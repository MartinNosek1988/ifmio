import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Navigation } from '../landing/components/Navigation'
import { Footer } from '../landing/components/Footer'
import { SeoHead } from '../../i18n/SeoHead'
import { useI18n } from '../../i18n/i18n'
import { ROUTE_SLUGS, getSlug, getLocalePair } from '../../i18n/routes'
import '../landing/landing.css'
import './pages.css'

export default function DemoPage() {
  const { t, locale } = useI18n()
  const lp = getLocalePair(locale)
  const seo = t.seo.demo
  const [form, setForm] = useState({ name: '', email: '', phonePrefix: '+420', phone: '', company: '', gdpr: false })
  const [submitted, setSubmitted] = useState(false)
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    const prefill = sessionStorage.getItem('prefill_email')
    if (prefill) {
      set('email', prefill)
      sessionStorage.removeItem('prefill_email')
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Demo form:', form)
    setSubmitted(true)
  }

  return (
    <div className="landing-page">
      <SeoHead title={seo.title} description={seo.description} canonicalPath={`/${lp.canonical}/${getSlug(ROUTE_SLUGS.demo, lp.canonical)}/`} alternatePath={`/${lp.alternate}/${getSlug(ROUTE_SLUGS.demo, lp.alternate)}/`} />
      <Navigation />
      <div className="demo-split">
        <div className="demo-card">
          <div className="demo-left">
            <h1 className="demo-left__title">Podívejte se na ifmio v akci</h1>
            {[
              { title: 'Bezplatná ukázka na míru', desc: 's přístupem ke všem modulům a bez závazků' },
              { title: 'Automatizujte až 80 % administrativy', desc: 's Mio AI Asistentem' },
              { title: 'Kompletní platforma „vše v jednom"', desc: 's předpisy, kontem, revizemi a komunikací' },
            ].map(b => (
              <div key={b.title} className="demo-benefit">
                <span className="demo-benefit__check">✅</span>
                <div>
                  <div className="demo-benefit__title">{b.title}</div>
                  <div className="demo-benefit__desc">{b.desc}</div>
                </div>
              </div>
            ))}
            <div className="demo-trust">DŮVĚŘUJÍ NÁM: SVJ Sokolská · BD Vinohrady · CPI Residential</div>
          </div>
          <div className="demo-right">
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>✅</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: 8 }}>Děkujeme!</h2>
                <p style={{ color: 'var(--gray-500)' }}>Ozveme se vám do 24 hodin.</p>
                <p style={{ marginTop: 24, color: 'var(--gray-500)', fontSize: '.9rem' }}>Nechcete čekat? Začněte hned:</p>
                <Link
                  to={form.email ? `/register?email=${encodeURIComponent(form.email)}` : '/register'}
                  style={{
                    display: 'inline-block',
                    marginTop: 8,
                    padding: '12px 24px',
                    backgroundColor: '#0F6E56',
                    color: '#fff',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  Zaregistrovat se zdarma →
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="page-form__field">
                  <label className="page-form__label">Celé jméno *</label>
                  <input className="page-form__input" required value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div className="page-form__field">
                  <label className="page-form__label">Firemní e-mail *</label>
                  <input className="page-form__input" type="email" required value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div className="page-form__field">
                  <label className="page-form__label">Telefon</label>
                  <div style={{ display: 'flex' }}>
                    <select
                      className="page-form__input"
                      value={form.phonePrefix}
                      onChange={e => set('phonePrefix', e.target.value)}
                      style={{ width: 110, flexShrink: 0, borderRadius: '8px 0 0 8px', borderRight: 'none' }}
                    >
                      <option value="+420">🇨🇿 +420</option>
                      <option value="+421">🇸🇰 +421</option>
                      <option value="+49">🇩🇪 +49</option>
                      <option value="+43">🇦🇹 +43</option>
                      <option value="+48">🇵🇱 +48</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+36">🇭🇺 +36</option>
                      <option value="+386">🇸🇮 +386</option>
                    </select>
                    <input
                      className="page-form__input"
                      type="tel"
                      value={form.phone}
                      onChange={e => set('phone', e.target.value)}
                      style={{ flex: 1, borderRadius: '0 8px 8px 0' }}
                    />
                  </div>
                </div>
                <div className="page-form__field">
                  <label className="page-form__label">Společnost / SVJ</label>
                  <input className="page-form__input" value={form.company} onChange={e => set('company', e.target.value)} />
                </div>
                <label className="page-form__gdpr">
                  <input type="checkbox" required checked={form.gdpr} onChange={e => set('gdpr', e.target.checked)} />
                  <span>Souhlasím se zpracováním osobních údajů pro účely demonstrace produktu (<a href="mailto:info@ifmio.com" style={{ color: 'var(--teal, #00B896)' }}>info@ifmio.com</a>)</span>
                </label>
                <button type="submit" className="btn btn--primary" style={{ width: '100%' }}>Vyzkoušet demo</button>
                <p className="page-form__reassurance">Bez závazků · Odpovíme do 24 hodin</p>
              </form>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
