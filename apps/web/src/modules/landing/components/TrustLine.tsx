import { useI18n } from '../../../i18n/i18n'

export function TrustLine() {
  const { t } = useI18n()
  return <div className="trust-line"><p>{t.trust.text}</p></div>
}
