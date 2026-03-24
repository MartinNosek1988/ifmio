import { useState } from 'react'
import { Navigation } from '../landing/components/Navigation'
import { Footer } from '../landing/components/Footer'
import '../landing/landing.css'
import './pages.css'

export default function DemoPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', units: '', gdpr: false })
  const [submitted, setSubmitted] = useState(false)
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Demo form:', form)
    setSubmitted(true)
  }

  return (
    <div className="landing-page">
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
                  <input className="page-form__input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                <div className="page-form__field">
                  <label className="page-form__label">Společnost / SVJ</label>
                  <input className="page-form__input" value={form.company} onChange={e => set('company', e.target.value)} />
                </div>
                <div className="page-form__field">
                  <label className="page-form__label">Počet spravovaných jednotek *</label>
                  <select className="page-form__input" required value={form.units} onChange={e => set('units', e.target.value)}>
                    <option value="">Vyberte...</option>
                    <option>do 50</option><option>50–200</option><option>200–500</option><option>500+</option><option>Nevím</option>
                  </select>
                </div>
                <label className="page-form__gdpr">
                  <input type="checkbox" required checked={form.gdpr} onChange={e => set('gdpr', e.target.checked)} />
                  <span>Souhlasím se zpracováním osobních údajů a obchodními podmínkami</span>
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
