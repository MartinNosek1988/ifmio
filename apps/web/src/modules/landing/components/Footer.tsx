import { useI18n } from '../../../i18n/i18n'

export function Footer() {
  const { t, localePath } = useI18n()
  const f = t.footer

  return (
    <footer className="landing-footer" id="kontakt" aria-label="Footer">
      <div className="container">
        <div className="landing-footer__grid">
          <div className="landing-footer__brand">
            <a href={localePath('/')} className="landing-nav__logo" style={{ marginBottom: 12, display: 'inline-block' }}>if<span className="landing-nav__logo-accent">mio</span></a>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', lineHeight: 1.6, maxWidth: 260, margin: '0 0 16px' }}>
              {f.desc} IFMIO Ltd.
            </p>
            <div className="landing-footer__social">
              {f.social.map(s => (
                <a key={s} href="#" className="landing-footer__social-icon" aria-label={s}>{s}</a>
              ))}
            </div>
          </div>

          {f.columns.map(col => (
            <div key={col.title} className="landing-footer__column">
              <h4 className="landing-footer__column-title">{col.title}</h4>
              <ul className="landing-footer__list">
                {col.items.map(item => <li key={item}><a href="#">{item}</a></li>)}
              </ul>
            </div>
          ))}

          <div className="landing-footer__column">
            <h4 className="landing-footer__column-title">{f.columns[2]?.title === 'Společnost' ? 'Kontakt' : 'Contact'}</h4>
            <ul className="landing-footer__list">
              <li><a href={`mailto:${f.contact.email}`}>✉ {f.contact.email}</a></li>
              <li>☎ {f.contact.phone}</li>
              <li>◎ {f.contact.city}</li>
            </ul>
          </div>
        </div>

        <div className="landing-footer__bottom"><p>{f.copyright}</p></div>
      </div>
    </footer>
  )
}
