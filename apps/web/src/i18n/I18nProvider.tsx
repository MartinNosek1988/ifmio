import { useMemo, useCallback, useEffect } from 'react'
import { useParams, useNavigate, useLocation, Outlet, Navigate } from 'react-router-dom'
import { I18nContext, isValidLocale, getTranslations } from './i18n'
import type { Locale } from './i18n'
import { detectPreferredLocale, saveLocaleChoice } from './detectLocale'
import type { SupportedLocale } from './detectLocale'

export function I18nProvider() {
  const { locale: localeParam } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const isValid = isValidLocale(localeParam ?? '')
  const locale: Locale = isValid ? (localeParam as Locale) : 'cs'
  const t = useMemo(() => getTranslations(locale), [locale])

  const switchLocale = useCallback((newLocale: Locale) => {
    const parts = location.pathname.split('/')
    if (parts.length >= 2 && isValidLocale(parts[1])) parts[1] = newLocale
    navigate(`${parts.join('/') || `/${newLocale}`}${location.search}${location.hash}`)
  }, [navigate, location.pathname, location.search, location.hash])

  const localePath = useCallback((path: string) => `/${locale}${path.startsWith('/') ? path : `/${path}`}`, [locale])

  const value = useMemo(() => ({ locale, t, switchLocale, localePath }), [locale, t, switchLocale, localePath])

  useEffect(() => { document.documentElement.lang = locale }, [locale])
  useEffect(() => { saveLocaleChoice(locale as SupportedLocale) }, [locale])

  if (!isValid) {
    const preferred = detectPreferredLocale()
    return <Navigate to={`/${preferred}/`} replace />
  }

  return <I18nContext.Provider value={value}><Outlet /></I18nContext.Provider>
}
