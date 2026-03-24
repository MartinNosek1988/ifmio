import { createContext, useContext } from 'react'
import { cs } from './locales/cs'
import { en } from './locales/en'

export const LOCALES = ['cs', 'en', 'sk', 'de', 'pl', 'uk', 'es', 'it'] as const
export type Locale = typeof LOCALES[number]
export const DEFAULT_LOCALE: Locale = 'cs'
export const ACTIVE_LOCALES: Locale[] = ['cs', 'en']

export interface LocaleConfig {
  code: Locale
  label: string
  flag: string
  shortLabel: string
}

export const LOCALE_CONFIGS: Record<Locale, LocaleConfig> = {
  cs: { code: 'cs', label: 'Čeština', flag: '🇨🇿', shortLabel: 'CZ' },
  en: { code: 'en', label: 'English', flag: '🇬🇧', shortLabel: 'EN' },
  sk: { code: 'sk', label: 'Slovenčina', flag: '🇸🇰', shortLabel: 'SK' },
  de: { code: 'de', label: 'Deutsch', flag: '🇩🇪', shortLabel: 'DE' },
  pl: { code: 'pl', label: 'Polski', flag: '🇵🇱', shortLabel: 'PL' },
  uk: { code: 'uk', label: 'Українська', flag: '🇺🇦', shortLabel: 'UA' },
  es: { code: 'es', label: 'Español', flag: '🇪🇸', shortLabel: 'ES' },
  it: { code: 'it', label: 'Italiano', flag: '🇮🇹', shortLabel: 'IT' },
}

export const LOCALE_COUNTRY_CODE: Record<Locale, string> = {
  cs: 'cz', en: 'gb', sk: 'sk', de: 'de', pl: 'pl', uk: 'ua', es: 'es', it: 'it',
}

// Translation data per locale — use loose typing for cross-locale compatibility
type TranslationData = typeof cs
const translations: Record<string, Record<string, unknown>> = { cs, en }

export interface I18nContextValue {
  locale: Locale
  t: TranslationData
  switchLocale: (locale: Locale) => void
  localePath: (path: string) => string
}

export const I18nContext = createContext<I18nContextValue>({
  locale: 'cs',
  t: cs,
  switchLocale: () => {},
  localePath: (p) => `/cs${p}`,
})

export function useI18n() {
  return useContext(I18nContext)
}

export function getTranslations(locale: Locale): TranslationData {
  return (translations[locale] ?? translations.en ?? cs) as TranslationData
}

export function isValidLocale(s: string): s is Locale {
  return (LOCALES as readonly string[]).includes(s)
}
