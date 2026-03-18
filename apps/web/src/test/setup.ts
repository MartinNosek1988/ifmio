import '@testing-library/jest-dom'
import i18n from '../core/i18n'

// Force Czech language for tests synchronously
// LanguageDetector picks up navigator.language (en) in jsdom
i18n.changeLanguage('cs')
// Also set it as the resolved language to avoid async race
if (i18n.language !== 'cs') {
  i18n.language = 'cs'
}
