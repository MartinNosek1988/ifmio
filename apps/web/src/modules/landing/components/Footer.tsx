import { FOOTER, META } from '../../../data/landing-content'

export function Footer() {
  return (
    <footer className="landing-footer" id="kontakt" aria-label="Patička">
      <div className="container">
        <div className="landing-footer__grid">
          <div className="landing-footer__brand">
            <div className="landing-nav__logo" style={{ marginBottom: 12 }}>if<span className="landing-nav__logo-accent">mio</span></div>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', lineHeight: 1.6, maxWidth: 260, margin: '0 0 16px' }}>
              {FOOTER.desc} {META.legalEntity}
            </p>
            <div className="landing-footer__social">
              {FOOTER.socialLinks.map(s => (
                <a key={s} href="#" className="landing-footer__social-icon" aria-label={s}>{s}</a>
              ))}
            </div>
          </div>

          {FOOTER.columns.map(col => (
            <div key={col.title} className="landing-footer__column">
              <h4 className="landing-footer__column-title">{col.title}</h4>
              <ul className="landing-footer__list">{col.items.map(item => <li key={item}><a href="#">{item}</a></li>)}</ul>
            </div>
          ))}

          <div className="landing-footer__column">
            <h4 className="landing-footer__column-title">Kontakt</h4>
            <ul className="landing-footer__list">
              <li><a href={`mailto:${FOOTER.contact.email}`}>✉ {FOOTER.contact.email}</a></li>
              <li>☎ {FOOTER.contact.phone}</li>
              <li>◎ {FOOTER.contact.city}</li>
            </ul>
          </div>
        </div>

        <div className="landing-footer__bottom">
          <p>{FOOTER.copyright}</p>
        </div>
      </div>
    </footer>
  )
}
