import { useParams } from 'react-router-dom'
import { PageLayout } from '../pages/PageLayout'
import { PLATFORM_MODULES } from './platform-data'
import '../pages/pages.css'

export default function PlatformModulePage() {
  const { slug } = useParams()
  const mod = PLATFORM_MODULES.find(m => m.slug === slug)

  if (!mod) return <PageLayout><div className="page-content" style={{ textAlign: 'center', padding: 120 }}><h1>Modul nenalezen</h1></div></PageLayout>

  return (
    <PageLayout>
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
