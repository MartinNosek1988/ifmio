import { LOCALES, LOCALE_CONFIGS, ACTIVE_LOCALES, useI18n } from './i18n'

export function LanguageSwitcher() {
  const { locale, switchLocale } = useI18n()
  const current = LOCALE_CONFIGS[locale]

  return (
    <div className="nav-dropdown lang-switcher">
      <button className="landing-nav__link lang-switcher__trigger">
        {current.flag} {current.shortLabel} ▾
      </button>
      <div className="mega-menu lang-switcher__menu">
        {LOCALES.map(code => {
          const cfg = LOCALE_CONFIGS[code]
          const isActive = (ACTIVE_LOCALES as readonly string[]).includes(code)
          const isCurrent = code === locale
          return (
            <button
              key={code}
              className={`lang-switcher__item${isCurrent ? ' lang-switcher__item--current' : ''}`}
              onClick={() => isActive && switchLocale(code)}
              disabled={!isActive}
            >
              <span className="lang-switcher__flag">{cfg.flag}</span>
              <span className="lang-switcher__label">{cfg.label}</span>
              {!isActive && <span className="lang-switcher__soon">coming soon</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
