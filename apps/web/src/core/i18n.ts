import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import cs from '../locales/cs.json'
import en from '../locales/en.json'
import sk from '../locales/sk.json'
import de from '../locales/de.json'
import uk from '../locales/uk.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      cs: { translation: cs },
      en: { translation: en },
      sk: { translation: sk },
      de: { translation: de },
      uk: { translation: uk },
    },
    fallbackLng: 'cs',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'ifmio_lang',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  })

export default i18n
