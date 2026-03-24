import { useI18n } from '../../../i18n/i18n'
import { ROUTE_SLUGS } from '../../../i18n/routes'

const PLATFORM_LINK_MAP: Record<string, string> = {
  'Mio AI': 'mio-ai', 'Evidence': 'evidence', 'Finance': 'finance',
  'Pracovní příkazy': 'pracovni-prikazy', 'Komunikace': 'komunikace', 'Portál': 'portal',
  'Registry': 'evidence', 'Work Orders': 'pracovni-prikazy', 'Communication': 'komunikace', 'Portal': 'portal',
}
const FEATURES_LINK_MAP: Record<string, string> = {
  'Předpisy': 'predpisy', 'Konto': 'konto', 'Revize': 'revize',
  'Měření': 'meridla', 'Vyúčtování': 'vyuctovani', 'Reporting': 'reporting',
  'Payments': 'predpisy', 'Accounts': 'konto', 'Inspections': 'revize',
  'Meters': 'meridla', 'Settlement': 'vyuctovani',
}
const COMPANY_LINK_MAP: Record<string, string> = {
  'O nás': 'about', 'Blog': 'blog', 'Kariéra': 'careers',
  'Partneři': 'partners', 'Kontakt': 'contact', 'Právní dokumenty': 'legal',
  'About': 'about', 'Careers': 'careers', 'Partners': 'partners',
  'Contact': 'contact', 'Legal': 'legal',
}

export function Footer() {
  const { locale, t, localePath } = useI18n()
  const f = t.footer
  const pSlug = ROUTE_SLUGS.platform[locale] ?? 'platforma'

  const getLink = (item: string, colIndex: number): string => {
    if (colIndex === 0) {
      const slug = PLATFORM_LINK_MAP[item]
      return slug ? localePath(`/${pSlug}/${slug}`) : '#'
    }
    if (colIndex === 1) {
      const slug = FEATURES_LINK_MAP[item]
      return slug ? localePath(`/${pSlug}/${slug}`) : '#'
    }
    const routeKey = COMPANY_LINK_MAP[item]
    if (routeKey) {
      const rSlug = ROUTE_SLUGS[routeKey]?.[locale]
      return rSlug ? localePath(`/${rSlug}`) : '#'
    }
    return '#'
  }

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
              {f.social.map(s => <a key={s} href="#" className="landing-footer__social-icon" aria-label={s}>{s}</a>)}
            </div>
          </div>

          {f.columns.map((col, ci) => (
            <div key={col.title} className="landing-footer__column">
              <h4 className="landing-footer__column-title">{col.title}</h4>
              <ul className="landing-footer__list">
                {col.items.map(item => <li key={item}><a href={getLink(item, ci)}>{item}</a></li>)}
              </ul>
            </div>
          ))}

          <div className="landing-footer__column">
            <h4 className="landing-footer__column-title">{f.contactTitle}</h4>
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
