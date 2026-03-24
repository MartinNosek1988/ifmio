import { LOCALES, LOCALE_CONFIGS, LOCALE_COUNTRY_CODE, ACTIVE_LOCALES, useI18n } from './i18n'
import type { Locale } from './i18n'
import { saveLocaleChoice } from './detectLocale'
import type { SupportedLocale } from './detectLocale'

function Flag({ locale }: { locale: Locale }) {
  const cc = (LOCALE_COUNTRY_CODE[locale] ?? locale).toUpperCase()
  return (
    <img
      src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${cc}.svg`}
      width={21}
      height={14}
      alt=""
      style={{ borderRadius: 2, objectFit: 'cover', flexShrink: 0 }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
    />
  )
}

export function LanguageSwitcher() {
  const { locale, switchLocale } = useI18n()
  const current = LOCALE_CONFIGS[locale]

  return (
    <div className="nav-dropdown lang-switcher">
      <button className="landing-nav__link lang-switcher__trigger">
        <Flag locale={locale} /> {current.shortLabel} ▾
      </button>
      <div className="mega-menu lang-switcher__menu">
        {LOCALES.map(code => {
          const cfg = LOCALE_CONFIGS[code]
          const isActive = (ACTIVE_LOCALES as readonly string[]).includes(code)
          const isCurrent = code === locale
          return (
            <button key={code} className={`lang-switcher__item${isCurrent ? ' lang-switcher__item--current' : ''}`} onClick={() => { if (!isActive) return; saveLocaleChoice(code as SupportedLocale); switchLocale(code) }} disabled={!isActive}>
              <Flag locale={code} />
              <span className="lang-switcher__label">{cfg.label}</span>
              {!isActive && <span className="lang-switcher__soon">coming soon</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
