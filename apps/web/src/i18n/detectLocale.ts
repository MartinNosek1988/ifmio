const SUPPORTED_LOCALES = ['cs', 'en', 'sk', 'de', 'pl', 'uk', 'es', 'it'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

const STORAGE_KEY = 'ifmio_locale'
const SESSION_KEY = 'ifmio_locale_detected'

const BROWSER_LANG_MAP: Record<string, SupportedLocale> = {
  cs: 'cs',
  sk: 'cs',   // Slovak → CS (jazyková příbuznost, dokud není SK verze)
  de: 'de',
  pl: 'pl',
  uk: 'uk',
  es: 'es',
  it: 'it',
  en: 'en',
}

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/** Save explicit user choice — called from language switcher */
export function saveLocaleChoice(locale: SupportedLocale): void {
  localStorage.setItem(STORAGE_KEY, locale)
}

/** Read saved choice, returns null if never set */
export function getSavedLocale(): SupportedLocale | null {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved && isSupportedLocale(saved) ? saved : null
}

/**
 * Detect preferred locale for first-time visitors.
 * Priority: localStorage → browser navigator.languages → 'en' fallback
 */
export function detectPreferredLocale(): SupportedLocale {
  // 1. Respect explicit user choice from previous visit
  const saved = getSavedLocale()
  if (saved) return saved

  // 2. Already ran browser detection this session — use fallback
  if (sessionStorage.getItem(SESSION_KEY)) return 'en'

  // 3. Mark session so we don't re-detect on every render
  sessionStorage.setItem(SESSION_KEY, '1')

  // 4. Read browser language preferences
  const langs = navigator.languages?.length
    ? [...navigator.languages]
    : [navigator.language || 'en']

  for (const lang of langs) {
    const code = lang.toLowerCase().split('-')[0]
    const mapped = BROWSER_LANG_MAP[code]
    if (mapped) return mapped
  }

  // 5. Unknown language → EN (global fallback, .com is English-primary)
  return 'en'
}
