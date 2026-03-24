import { useMemo, useCallback } from 'react'
import { useParams, useNavigate, useLocation, Outlet, Navigate } from 'react-router-dom'
import { I18nContext, isValidLocale, DEFAULT_LOCALE, getTranslations } from './i18n'
import type { Locale } from './i18n'

export function I18nProvider() {
  const { locale: localeParam } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // FIX 5: redirect invalid locale
  if (!isValidLocale(localeParam ?? '')) {
    return <Navigate to={`/${DEFAULT_LOCALE}/`} replace />
  }

  const locale = localeParam as Locale
  const t = useMemo(() => getTranslations(locale), [locale])

  // FIX 7: preserve query string and hash
  const switchLocale = useCallback((newLocale: Locale) => {
    const parts = location.pathname.split('/')
    if (parts.length >= 2 && isValidLocale(parts[1])) {
      parts[1] = newLocale
    }
    const newPath = parts.join('/') || `/${newLocale}`
    navigate(`${newPath}${location.search}${location.hash}`)
  }, [navigate, location.pathname, location.search, location.hash])

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
