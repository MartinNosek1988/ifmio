import { LOCALES, LOCALE_CONFIGS, LOCALE_COUNTRY_CODE, ACTIVE_LOCALES, useI18n } from './i18n'

function Flag({ locale, size = 20 }: { locale: string; size?: number }) {
  const cc = LOCALE_COUNTRY_CODE[locale as keyof typeof LOCALE_COUNTRY_CODE] ?? locale
  return (
    <img
      src={`https://flagcdn.com/w${size}/${cc}.png`}
      srcSet={`https://flagcdn.com/w${size * 2}/${cc}.png 2x`}
      width={size}
      height={Math.round(size * 0.75)}
      alt=""
      style={{ borderRadius: 2, objectFit: 'cover' }}
    />
  )
}

export function LanguageSwitcher() {
  const { locale, switchLocale } = useI18n()
  const current = LOCALE_CONFIGS[locale]

  return (
    <div className="nav-dropdown lang-switcher">
      <button className="landing-nav__link lang-switcher__trigger">
        <Flag locale={locale} size={20} /> {current.shortLabel} ▾
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
              <Flag locale={code} size={20} />
              <span className="lang-switcher__label">{cfg.label}</span>
              {!isActive && <span className="lang-switcher__soon">coming soon</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
