import { useMemo, useCallback } from 'react'
import { useParams, useNavigate, Outlet } from 'react-router-dom'
import { I18nContext, isValidLocale, DEFAULT_LOCALE, getTranslations } from './i18n'
import type { Locale } from './i18n'

export function I18nProvider() {
  const { locale: localeParam } = useParams()
  const navigate = useNavigate()

  const locale: Locale = isValidLocale(localeParam ?? '') ? (localeParam as Locale) : DEFAULT_LOCALE
  const t = useMemo(() => getTranslations(locale), [locale])

  const switchLocale = useCallback((newLocale: Locale) => {
    const currentPath = window.location.pathname
    const parts = currentPath.split('/')
    // Replace locale segment (index 1)
    if (parts.length >= 2 && isValidLocale(parts[1])) {
      parts[1] = newLocale
    }
    navigate(parts.join('/') || `/${newLocale}`)
  }, [navigate])

  const localePath = useCallback((path: string) => {
    const clean = path.startsWith('/') ? path : `/${path}`
    return `/${locale}${clean}`
  }, [locale])

  const value = useMemo(() => ({ locale, t, switchLocale, localePath }), [locale, t, switchLocale, localePath])

  return (
    <I18nContext.Provider value={value}>
      <Outlet />
    </I18nContext.Provider>
  )
}
