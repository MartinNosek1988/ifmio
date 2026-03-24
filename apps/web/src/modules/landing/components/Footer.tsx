import { FOOTER, META } from '../../../data/landing-content'

const FOOTER_LINKS: Record<string, string> = {
  'Mio AI': '/platforma/mio-ai', 'Evidence': '/platforma/evidence', 'Finance': '/platforma/finance',
  'Pracovní příkazy': '/platforma/pracovni-prikazy', 'Komunikace': '/platforma/komunikace', 'Portál': '/platforma/portal',
  'Předpisy': '/platforma/predpisy', 'Konto': '/platforma/konto', 'Revize': '/platforma/revize',
  'Měření': '/platforma/meridla', 'Vyúčtování': '/platforma/vyuctovani', 'Reporting': '/platforma/reporting',
  'O nás': '/o-nas', 'Blog': '/blog', 'Kariéra': '/kariera',
  'Partneři': '/partneri/spravci', 'Kontakt': '/kontakt', 'Právní dokumenty': '/pravni-dokumenty',
}

export function Footer() {
  return (
    <footer className="landing-footer" id="kontakt" aria-label="Patička">
      <div className="container">
        <div className="landing-footer__grid">
          <div className="landing-footer__brand">
            <a href="/" className="landing-nav__logo" style={{ marginBottom: 12, display: 'inline-block' }}>if<span className="landing-nav__logo-accent">mio</span></a>
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
              <ul className="landing-footer__list">
                {col.items.map(item => (
                  <li key={item}><a href={FOOTER_LINKS[item] ?? '#'}>{item}</a></li>
                ))}
              </ul>
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
