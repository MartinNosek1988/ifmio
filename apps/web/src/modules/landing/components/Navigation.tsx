import { useState, useEffect } from 'react'
import { NAV } from '../../../data/landing-content'

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
        <a href="#" className="landing-nav__logo">if<span className="landing-nav__logo-accent">mio</span></a>

        <button className="landing-nav__hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Menu">
          <span /><span /><span />
        </button>

        <div className={`landing-nav__links${menuOpen ? ' landing-nav__links--open' : ''}`}>
          {/* Platform mega-menu — always rendered, CSS :hover shows it */}
          <div className="nav-dropdown">
            <button className="landing-nav__link">{NAV.platformMenu.title} ▾</button>
            <div className="mega-menu mega-menu--platform">
              {NAV.platformMenu.columns.map((col, ci) => (
                <div key={col.title} className={`mega-menu__section${ci === 2 ? ' mega-menu__teal' : ''}`}>
                  <div className="mega-menu__section-title">{col.title}</div>
                  {col.items.map(item => (
                    <a key={item.title} href="#" className="mega-menu__item">
                      <span className="mega-menu__icon">{item.icon}</span>
                      <div><div className="mega-menu__item-title">{item.title}</div><div className="mega-menu__item-desc">{item.desc}</div></div>
                    </a>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Solutions mega-menu */}
          <div className="nav-dropdown">
            <button className="landing-nav__link">{NAV.solutionsMenu.title} ▾</button>
            <div className="mega-menu mega-menu--solutions">
              <div className="mega-menu__section">
                {NAV.solutionsMenu.items.map(item => (
                  <a key={item.title} href="#" className="mega-menu__item">
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

          {/* Partners mega-menu */}
          <div className="nav-dropdown">
            <button className="landing-nav__link">{NAV.partnersMenu.title} ▾</button>
            <div className="mega-menu mega-menu--partners">
              {NAV.partnersMenu.columns.map(col => (
                <div key={col.title} className="mega-menu__section">
                  <div className="mega-menu__section-title">{col.title}</div>
                  {col.items.map(item => (
                    <a key={item.title} href="#" className="mega-menu__item">
                      <span className="mega-menu__icon">{item.icon}</span>
                      <div><div className="mega-menu__item-title">{item.title}</div><div className="mega-menu__item-desc">{item.desc}</div></div>
                    </a>
                  ))}
                </div>
              ))}
              <div className="mega-menu__cta-card">
                <strong>{NAV.partnersMenu.cta.label}</strong>
                <a href="#" className="mega-menu__cta-link">{NAV.partnersMenu.cta.link}</a>
              </div>
            </div>
          </div>

          {NAV.links.map(link => (
            <a key={link.href} href={link.href} className="landing-nav__link" onClick={() => setMenuOpen(false)}>{link.label}</a>
          ))}

          <div className="landing-nav__ctas">
            <a href="/login" className="btn btn--ghost btn--sm">{NAV.ctaSecondary}</a>
            <a href="#demo" className="btn btn--primary btn--sm">{NAV.ctaPrimary}</a>
          </div>
        </div>
      </div>
    </nav>
  )
}
