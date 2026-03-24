const SUPPORTED_LOCALES = ['cs', 'en'] as const
type SupportedLocale = typeof SUPPORTED_LOCALES[number]
const STORAGE_KEY = 'ifmio_locale_detected'

export function detectPreferredLocale(): SupportedLocale {
  // 1. Already visited — skip detection
  if (sessionStorage.getItem(STORAGE_KEY)) return 'cs'

  // 2. Mark as detected for this session
  sessionStorage.setItem(STORAGE_KEY, '1')

  // 3. Read browser Accept-Language (navigator.languages or navigator.language)
  const langs = navigator.languages?.length
    ? [...navigator.languages]
    : [navigator.language || 'cs']

  for (const lang of langs) {
    const code = lang.toLowerCase().split('-')[0]
    if (code === 'cs' || code === 'sk') return 'cs' // Czech + Slovak → CS
    if (code === 'en') return 'en'
  }

  // 4. Default fallback
  return 'cs'
}
