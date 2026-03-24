import { useParams } from 'react-router-dom'
import { PageLayout } from '../pages/PageLayout'
import { SeoHead } from '../../i18n/SeoHead'
import { useI18n } from '../../i18n/i18n'
import { ROUTE_SLUGS, getSlug, getLocalePair } from '../../i18n/routes'
import { PLATFORM_MODULES } from './platform-data'
import '../pages/pages.css'

export default function PlatformModulePage() {
  const { slug } = useParams()
  const { t, locale } = useI18n()
  const lp = getLocalePair(locale)
  const mod = PLATFORM_MODULES.find(m => m.slug === slug)

  if (!mod) return <PageLayout><div className="page-content" style={{ textAlign: 'center', padding: 120 }}><h1>Modul nenalezen</h1></div></PageLayout>

  return (
    <PageLayout>
      <SeoHead title={`${mod.title} — ${t.seo.platform.title}`} description={mod.subtitle} canonicalPath={`/${lp.canonical}/${getSlug(ROUTE_SLUGS.platform, lp.canonical)}/${slug}/`} />
      <div className="page-hero">
        <div className="page-hero__icon">{mod.icon}</div>
        <h1 className="page-hero__title" style={{ color: 'var(--dark)' }}>{mod.title}</h1>
        <p className="page-hero__subtitle" style={{ color: 'var(--gray-600)' }}>{mod.subtitle}</p>
      </div>
      <div className="page-content page-content--narrow">
        <ul className="feature-list">
          {mod.features.map(f => <li key={f}>{f}</li>)}
        </ul>
        <div className="screenshot-placeholder">Screenshot modulu</div>
        <div style={{ textAlign: 'center' }}>
          <a href="/demo" className="btn btn--primary btn--lg">Vyzkoušet demo zdarma →</a>
        </div>
      </div>
    </PageLayout>
  )
}
