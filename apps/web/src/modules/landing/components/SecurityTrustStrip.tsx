import { ShieldCheck, Globe, Bot, Lock } from 'lucide-react'
import { useI18n } from '../../../i18n/i18n'
import { ROUTE_SLUGS } from '../../../i18n/routes'

const ITEMS = [
  { icon: ShieldCheck, key: 'gdpr' as const },
  { icon: Globe,       key: 'infra' as const },
  { icon: Bot,         key: 'ai' as const },
  { icon: Lock,        key: 'tenant' as const },
]

export function SecurityTrustStrip() {
  const { t, locale, localePath } = useI18n()
  const s = t.trustStrip
  const securitySlug = ROUTE_SLUGS.security?.[locale] ?? 'security'

  return (
    <div className="security-trust-strip">
      <div className="security-trust-strip__inner">
        {ITEMS.map(({ icon: Icon, key }, i) => (
          <div key={key} className="security-trust-strip__item">
            {i > 0 && <span className="security-trust-strip__divider" aria-hidden>·</span>}
            <Icon size={15} className="security-trust-strip__icon" aria-hidden />
            <span className="security-trust-strip__label">{s[key].label}</span>
          </div>
        ))}
        <a href={localePath(`/${securitySlug}`)} className="security-trust-strip__cta">
          {s.cta} →
        </a>
      </div>
    </div>
  )
}
