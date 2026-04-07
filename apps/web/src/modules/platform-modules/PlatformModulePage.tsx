import { useParams } from 'react-router-dom'
import { PageLayout } from '../pages/PageLayout'
import { SeoHead } from '../../i18n/SeoHead'
import { useI18n } from '../../i18n/i18n'
import { ROUTE_SLUGS, getSlug, getLocalePair } from '../../i18n/routes'
import { PLATFORM_MODULES } from './platform-data'
import {
  Building2, Receipt, FileText, Wallet, ClipboardCheck,
  Wrench, MessageSquare, Gauge, Landmark,
  Users, Smartphone, BarChart3, CalendarCheck, FileCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import '../pages/pages.css'

const ICON_MAP: Record<string, LucideIcon> = {
  Building2, Receipt, FileText, Wallet, ClipboardCheck,
  Wrench, MessageSquare, Gauge, Landmark,
  Users, Smartphone, BarChart3, CalendarCheck, FileCheck,
}

function ModuleIcon({ name }: { name: string }) {
  if (name.length <= 2 || /\p{Emoji}/u.test(name)) {
    return <div className="page-hero__icon">{name}</div>
  }
  const Icon = ICON_MAP[name]
  if (!Icon) return null
  return (
    <div className="page-hero__icon-wrap">
      <Icon size={28} strokeWidth={1.5} />
    </div>
  )
}

export default function PlatformModulePage() {
  const { slug } = useParams()
  const { t, locale, localePath } = useI18n()
  const lp = getLocalePair(locale)
  const mod = PLATFORM_MODULES.find(m => m.slug === slug)

  if (!mod) return <PageLayout><div className="page-content" style={{ textAlign: 'center', padding: 120 }}><h1>Modul nenalezen</h1></div></PageLayout>

  const isMobileApp = slug === 'mobilni-aplikace' || slug === 'mobile-app'
  const demoUrl = localePath('/demo/')

  return (
    <PageLayout>
      <SeoHead title={`${mod.title} — ${t.seo.platform.title}`} description={mod.subtitle} canonicalPath={`/${lp.canonical}/${getSlug(ROUTE_SLUGS.platform, lp.canonical)}/${slug}/`} />
      <div className="page-hero">
        <ModuleIcon name={mod.icon} />
        <h1 className="page-hero__title" style={{ color: 'var(--dark)' }}>{mod.title}</h1>
        <p className="page-hero__subtitle" style={{ color: 'var(--gray-600)' }}>{mod.subtitle}</p>
      </div>
      <div className="page-content page-content--narrow">
        <ul className="feature-list">
          {mod.features.map(f => <li key={f}>{f}</li>)}
        </ul>
        {isMobileApp && (
          <div style={{ marginTop: 24, padding: '12px 20px', background: '#FEF9EC', borderRadius: 8, border: '1px solid #F5D77A', textAlign: 'center', fontSize: 14, color: '#7A5C00' }}>
            Mobilní aplikace je ve vývoji — spuštění plánováno v Q3 2026.
            <br />
            <a href={demoUrl} style={{ color: '#0D9B8A', fontWeight: 500 }}>Zaregistrujte zájem o beta přístup →</a>
          </div>
        )}
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <a href={demoUrl} className="btn btn--primary btn--lg">Vyzkoušet demo zdarma →</a>
        </div>
      </div>
    </PageLayout>
  )
}
