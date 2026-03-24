import { useState, useEffect } from 'react'
import { NAV } from '../../../data/landing-content'

const PLATFORM_SLUGS: Record<string, string> = {
  'Evidence nemovitostí': '/platforma/evidence', 'Finance & doklady': '/platforma/finance',
  'Předpisy plateb': '/platforma/predpisy', 'Konto vlastníků': '/platforma/konto',
  'Komunikace': '/platforma/komunikace', 'Pracovní příkazy': '/platforma/pracovni-prikazy',
  'Revize & TZB': '/platforma/revize', 'Měřidla & odečty': '/platforma/meridla',
  'Dokumenty': '/platforma/dokumenty', 'Vyúčtování': '/platforma/vyuctovani',
  'Mio AI Asistent': '/platforma/mio-ai', 'Portál vlastníků': '/platforma/portal',
  'Reporting': '/platforma/reporting', 'Shromáždění SVJ': '/platforma/shromazdeni',
  'Mobilní aplikace': '/platforma/mobilni-aplikace',
}
const SOLUTION_SLUGS: Record<string, string> = {
  'Pro SVJ': '/reseni/svj', 'Pro správce': '/reseni/spravce',
  'Pro facility management': '/reseni/facility-management', 'Pro údržbu': '/reseni/udrzba',
  'Pro investory': '/reseni/investori',
}
const PARTNER_SLUGS: Record<string, string> = {
  'Najít správce nemovitostí': '/partneri/spravci', 'Najít facility managera': '/partneri/facility-management',
  'Databáze řemeslníků': '/partneri/remeslnici', 'Revizní technici': '/partneri/revizni-technici',
}

export function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`landing-nav${scrolled ? ' landing-nav--scrolled' : ''}`} aria-label="Hlavní navigace">
      <div className="container landing-nav__inner">
        <a href="/" className="landing-nav__logo">if<span className="landing-nav__logo-accent">mio</span></a>

        <button className="landing-nav__hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Menu">
          <span /><span /><span />
        </button>

        <div className={`landing-nav__links${menuOpen ? ' landing-nav__links--open' : ''}`}>
          <div className="nav-dropdown">
            <button className="landing-nav__link">{NAV.platformMenu.title} ▾</button>
            <div className="mega-menu mega-menu--platform">
              {NAV.platformMenu.columns.map((col, ci) => (
                <div key={col.title} className={`mega-menu__section${ci === 2 ? ' mega-menu__teal' : ''}`}>
                  <div className="mega-menu__section-title">{col.title}</div>
                  {col.items.map(item => (
                    <a key={item.title} href={PLATFORM_SLUGS[item.title] ?? '#'} className="mega-menu__item">
                      <span className="mega-menu__icon">{item.icon}</span>
                      <div><div className="mega-menu__item-title">{item.title}</div><div className="mega-menu__item-desc">{item.desc}</div></div>
                    </a>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="nav-dropdown">
            <button className="landing-nav__link">{NAV.solutionsMenu.title} ▾</button>
            <div className="mega-menu mega-menu--solutions">
              <div className="mega-menu__section">
                {NAV.solutionsMenu.items.map(item => (
                  <a key={item.title} href={SOLUTION_SLUGS[item.title] ?? '#'} className="mega-menu__item">
                    <span className="mega-menu__icon">{item.icon}</span>
                    <div><div className="mega-menu__item-title">{item.title}</div><div className="mega-menu__item-desc">{item.desc}</div></div>
                  </a>
                ))}
              </div>
              <div className="mega-menu__sidebar">
                <div className="mega-menu__sidebar-label">{NAV.solutionsMenu.sidebar.label}</div>
                <blockquote className="mega-menu__sidebar-quote">{NAV.solutionsMenu.sidebar.quote}</blockquote>
                <div className="mega-menu__sidebar-author">{NAV.solutionsMenu.sidebar.author}</div>
              </div>
            </div>
          </div>

          <div className="nav-dropdown">
            <button className="landing-nav__link">{NAV.partnersMenu.title} ▾</button>
            <div className="mega-menu mega-menu--partners">
              {NAV.partnersMenu.columns.map(col => (
                <div key={col.title} className="mega-menu__section">
                  <div className="mega-menu__section-title">{col.title}</div>
                  {col.items.map(item => (
                    <a key={item.title} href={PARTNER_SLUGS[item.title] ?? '#'} className="mega-menu__item">
                      <span className="mega-menu__icon">{item.icon}</span>
                      <div><div className="mega-menu__item-title">{item.title}</div><div className="mega-menu__item-desc">{item.desc}</div></div>
                    </a>
                  ))}
                </div>
              ))}
              <div className="mega-menu__cta-card">
                <strong>{NAV.partnersMenu.cta.label}</strong>
                <a href="/partneri/registrace" className="mega-menu__cta-link">{NAV.partnersMenu.cta.link}</a>
              </div>
            </div>
          </div>

          <a href="/cenik" className="landing-nav__link" onClick={() => setMenuOpen(false)}>Ceník</a>
          <a href="/kontakt" className="landing-nav__link" onClick={() => setMenuOpen(false)}>Kontakt</a>
        </div>

        <div className="landing-nav__ctas">
          <a href="/login" className="btn btn--ghost btn--sm">{NAV.ctaSecondary}</a>
          <a href="/demo" className="btn btn--primary btn--sm">{NAV.ctaPrimary}</a>
        </div>
      </div>
    </nav>
  )
}
