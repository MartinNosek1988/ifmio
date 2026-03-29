import { useState, useEffect } from 'react'
import { useI18n } from '../../../i18n/i18n'
import { LanguageSwitcher } from '../../../i18n/LanguageSwitcher'
import { ROUTE_SLUGS } from '../../../i18n/routes'

const COL1_KEYS = ['evidence', 'finance', 'predpisy', 'konto', 'komunikace'] as const
const COL2_KEYS = ['workOrders', 'revize', 'meridla', 'dokumenty', 'vyuctovani'] as const
const COL3_KEYS = ['mioAi', 'portal', 'reporting', 'shromazdeni', 'mobile'] as const
const SOLUTION_KEYS = ['svj', 'spravce', 'fm', 'udrzba', 'investori'] as const
const PARTNER_COL1 = ['spravci', 'fm'] as const
const PARTNER_COL2 = ['remeslnici', 'revizni'] as const

const PLATFORM_PATH: Record<string, string> = {
  evidence: 'evidence', finance: 'finance', predpisy: 'predpisy', konto: 'konto',
  komunikace: 'komunikace', workOrders: 'pracovni-prikazy', revize: 'revize', meridla: 'meridla',
  dokumenty: 'dokumenty', vyuctovani: 'vyuctovani', mioAi: 'mio-ai', portal: 'portal',
  reporting: 'reporting', shromazdeni: 'shromazdeni', mobile: 'mobilni-aplikace',
}
const SOLUTION_PATH: Record<string, string> = { svj: 'svj', spravce: 'spravce', fm: 'facility-management', udrzba: 'udrzba', investori: 'investori' }
const PARTNER_PATH: Record<string, string> = { spravci: 'spravci', fm: 'facility-management', remeslnici: 'remeslnici', revizni: 'revizni-technici' }

export function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { locale, t, localePath } = useI18n()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const pSlug = ROUTE_SLUGS.platform[locale] ?? 'platforma'
  const sSlug = ROUTE_SLUGS.solutions[locale] ?? 'reseni'
  const prSlug = ROUTE_SLUGS.partners[locale] ?? 'partneri'
  const pi = t.nav.platformItems
  const si = t.nav.solutionItems
  const pri = t.nav.partnerItems
  const cols = t.nav.platformCols

  return (
    <nav className={`landing-nav${scrolled ? ' landing-nav--scrolled' : ''}`} aria-label="Main navigation">
      <div className="container landing-nav__inner">
        <a href={localePath('/')} className="landing-nav__logo">if<span className="landing-nav__logo-accent">mio</span></a>

        <button className="landing-nav__hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Menu">
          <span /><span /><span />
        </button>

        <div className={`landing-nav__links${menuOpen ? ' is-open' : ''}`}>
          {/* Platform */}
          <div className="nav-dropdown">
            <button className="landing-nav__link">{t.nav.platform} ▾</button>
            <div className="mega-menu mega-menu--platform">
              {[
                { label: cols.col1, keys: COL1_KEYS },
                { label: cols.col2, keys: COL2_KEYS },
                { label: cols.col3, keys: COL3_KEYS, teal: true },
              ].map((col, ci) => (
                <div key={ci} className={`mega-menu__section${col.teal ? ' mega-menu__teal' : ''}`}>
                  <div className="mega-menu__section-title">{col.label}</div>
                  {col.keys.map(k => {
                    const item = pi[k]
                    return (
                      <a key={k} href={localePath(`/${pSlug}/${PLATFORM_PATH[k]}`)} className="mega-menu__item">
                        <div><div className="mega-menu__item-title">{item.title}</div><div className="mega-menu__item-desc">{item.desc}</div></div>
                      </a>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Solutions */}
          <div className="nav-dropdown">
            <button className="landing-nav__link">{t.nav.solutions} ▾</button>
            <div className="mega-menu mega-menu--solutions">
              <div className="mega-menu__section">
                {SOLUTION_KEYS.map(k => (
                  <a key={k} href={localePath(`/${sSlug}/${SOLUTION_PATH[k]}`)} className="mega-menu__item">
                    <div><div className="mega-menu__item-title">{si[k].title}</div><div className="mega-menu__item-desc">{si[k].desc}</div></div>
                  </a>
                ))}
              </div>
              <div className="mega-menu__sidebar">
                <div className="mega-menu__sidebar-label">{t.nav.sidebar.label}</div>
                <blockquote className="mega-menu__sidebar-quote">{t.nav.sidebar.quote}</blockquote>
                <div className="mega-menu__sidebar-author">{t.nav.sidebar.author}</div>
              </div>
            </div>
          </div>

          {/* Knowledge */}
          <div className="nav-dropdown">
            <button className="landing-nav__link">{t.nav.knowledge} ▾</button>
            <div className="mega-menu mega-menu--knowledge">
              <div className="mega-menu__section">
                <div className="mega-menu__section-title">{t.nav.knowledgeCols.col1}</div>
                {([
                  ['🏢', 'about', ROUTE_SLUGS.about[locale] ?? 'o-nas'],
                  ['📣', 'news', ROUTE_SLUGS.blog[locale] ?? 'blog'],
                  ['🤝', 'partnersLink', `${prSlug}`],
                  ['💼', 'careers', ROUTE_SLUGS.careers[locale] ?? 'kariera'],
                ] as const).map(([ico, key, slug]) => (
                  <a key={key} href={localePath(`/${slug}`)} className="mega-menu__item">
                    <div><div className="mega-menu__item-title">{ico} {t.nav.knowledgeItems[key].title}</div><div className="mega-menu__item-desc">{t.nav.knowledgeItems[key].desc}</div></div>
                  </a>
                ))}
              </div>
              <div className="mega-menu__section">
                <div className="mega-menu__section-title">{t.nav.knowledgeCols.col2}</div>
                {([
                  ['📖', 'blog', ROUTE_SLUGS.blog[locale] ?? 'blog'],
                  ['🎓', 'academy', ROUTE_SLUGS.blog[locale] ?? 'blog'],
                  ['📋', 'templates', ROUTE_SLUGS.blog[locale] ?? 'blog'],
                  ['📅', 'webinars', ROUTE_SLUGS.blog[locale] ?? 'blog'],
                ] as const).map(([ico, key, slug]) => (
                  <a key={key} href={localePath(`/${slug}`)} className="mega-menu__item">
                    <div><div className="mega-menu__item-title">{ico} {t.nav.knowledgeItems[key].title}</div><div className="mega-menu__item-desc">{t.nav.knowledgeItems[key].desc}</div></div>
                  </a>
                ))}
              </div>
              <div className="mega-menu__section">
                <div className="mega-menu__section-title">{t.nav.knowledgeCols.col3}</div>
                {([
                  ['📚', 'docs', ROUTE_SLUGS.blog[locale] ?? 'blog'],
                  ['💬', 'helpdesk', ROUTE_SLUGS.contact[locale] ?? 'kontakt'],
                  ['🔒', 'security', ROUTE_SLUGS.security[locale] ?? 'bezpecnost'],
                  ['📜', 'legal', ROUTE_SLUGS.legal[locale] ?? 'pravni-dokumenty'],
                ] as const).map(([ico, key, slug]) => (
                  <a key={key} href={localePath(`/${slug}`)} className="mega-menu__item">
                    <div><div className="mega-menu__item-title">{ico} {t.nav.knowledgeItems[key].title}</div><div className="mega-menu__item-desc">{t.nav.knowledgeItems[key].desc}</div></div>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Partners */}
          <div className="nav-dropdown">
            <button className="landing-nav__link">{t.nav.partners} ▾</button>
            <div className="mega-menu mega-menu--partners">
              {[
                { label: t.nav.partnerCols.col1, keys: PARTNER_COL1 },
                { label: t.nav.partnerCols.col2, keys: PARTNER_COL2 },
              ].map((col, ci) => (
                <div key={ci} className="mega-menu__section">
                  <div className="mega-menu__section-title">{col.label}</div>
                  {col.keys.map(k => (
                    <a key={k} href={localePath(`/${prSlug}/${PARTNER_PATH[k]}`)} className="mega-menu__item">
                      <div><div className="mega-menu__item-title">{pri[k].title}</div><div className="mega-menu__item-desc">{pri[k].desc}</div></div>
                    </a>
                  ))}
                </div>
              ))}
              <div className="mega-menu__cta-card">
                <strong>{t.nav.partnerCta.title}</strong>
                <a href={localePath(`/${prSlug}/${ROUTE_SLUGS.partnerRegister[locale] ?? 'registrace'}`)} className="mega-menu__cta-link">{t.nav.partnerCta.link}</a>
              </div>
            </div>
          </div>

          <a href={localePath(`/${ROUTE_SLUGS.pricing[locale] ?? 'cenik'}`)} className="landing-nav__link" onClick={() => setMenuOpen(false)}>{t.nav.pricing}</a>
          <a href={localePath(`/${ROUTE_SLUGS.contact[locale] ?? 'kontakt'}`)} className="landing-nav__link" onClick={() => setMenuOpen(false)}>{t.nav.contact}</a>
        </div>

        <div className="landing-nav__ctas">
          <LanguageSwitcher />
          <a href="/login" className="btn btn--ghost btn--sm">{t.nav.login}</a>
          <a href={localePath(`/${ROUTE_SLUGS.demo[locale] ?? 'demo'}`)} className="btn btn--primary btn--sm">{t.nav.demo}</a>
        </div>
      </div>
    </nav>
  )
}
