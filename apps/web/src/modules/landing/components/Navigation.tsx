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
        <a href="#" className="landing-nav__logo" aria-label="ifmio domů">
          <span>if</span><span className="landing-nav__logo-accent">mio</span>
        </a>

        <button
          className="landing-nav__hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-label="Menu"
        >
          <span /><span /><span />
        </button>

        <div className={`landing-nav__links${menuOpen ? ' landing-nav__links--open' : ''}`}>
          {NAV.links.map(link => (
            <a key={link.href} href={link.href} className="landing-nav__link" onClick={() => setMenuOpen(false)}>
              {link.label}
            </a>
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
