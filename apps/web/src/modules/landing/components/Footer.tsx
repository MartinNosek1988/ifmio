import { FOOTER, META } from '../../../data/landing-content'

export function Footer() {
  return (
    <footer className="landing-footer section section--dark" id="kontakt" aria-label="Kontakt a patička">
      <div className="container">
        <div className="landing-footer__grid">
          <div className="landing-footer__brand">
            <div className="landing-nav__logo" style={{ marginBottom: 16 }}>
              <span>if</span><span className="landing-nav__logo-accent">mio</span>
            </div>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', lineHeight: 1.6, maxWidth: 280 }}>
              AI-native platforma pro správu nemovitostí. {META.legalEntity}
            </p>
            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              {FOOTER.socialLinks.map(s => (
                <span key={s} style={{ color: 'var(--gray-400)', fontSize: '0.82rem' }}>{s}</span>
              ))}
            </div>
          </div>

          {FOOTER.columns.map(col => (
            <div key={col.title} className="landing-footer__column">
              <h4 className="landing-footer__column-title">{col.title}</h4>
              <ul className="landing-footer__column-list">
                {col.items.map(item => (
                  <li key={item}><a href="#">{item}</a></li>
                ))}
              </ul>
            </div>
          ))}

          <div className="landing-footer__column">
            <h4 className="landing-footer__column-title">Kontakt</h4>
            <ul className="landing-footer__column-list">
              <li><a href={`mailto:${FOOTER.contact.email}`}>{FOOTER.contact.email}</a></li>
              <li>{FOOTER.contact.phone}</li>
              <li>{FOOTER.contact.address}</li>
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
