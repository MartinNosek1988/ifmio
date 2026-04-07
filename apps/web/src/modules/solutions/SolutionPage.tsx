import { useParams } from 'react-router-dom'
import { PageLayout } from '../pages/PageLayout'
import { SeoHead } from '../../i18n/SeoHead'
import { useI18n } from '../../i18n/i18n'
import { ROUTE_SLUGS, getSlug, getLocalePair } from '../../i18n/routes'
import { SOLUTIONS } from './solutions-data'
import * as icons from 'lucide-react'
import '../pages/pages.css'

function SolutionIcon({ name }: { name: string }) {
  const Icon = (icons as any)[name]
  if (!Icon) return <div className="page-hero__icon">{name}</div>
  return (
    <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#E6F5F3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
      <Icon size={28} color="#0D9B8A" strokeWidth={1.5} />
    </div>
  )
}

export default function SolutionPage() {
  const { slug } = useParams()
  const { t, locale } = useI18n()
  const lp = getLocalePair(locale)
  const solution = SOLUTIONS.find(s => s.slug === slug)

  if (!solution) return <PageLayout><div className="page-content" style={{ textAlign: 'center', padding: 120 }}><h1>Stránka nenalezena</h1></div></PageLayout>

  return (
    <PageLayout>
      <SeoHead title={`${solution.title} — ${t.seo.solutions.title}`} description={solution.subtitle} canonicalPath={`/${lp.canonical}/${getSlug(ROUTE_SLUGS.solutions, lp.canonical)}/${slug}/`} />
      <div className="page-hero page-hero--gradient">
        <SolutionIcon name={solution.icon} />
        <h1 className="page-hero__title" style={{ color: 'var(--dark)' }}>{solution.title}</h1>
        <p className="page-hero__subtitle" style={{ color: 'var(--gray-600)' }}>{solution.subtitle}</p>
      </div>
      <div className="page-content">
        <div className="benefit-grid">
          {solution.benefits.map(b => (
            <div key={b.title} className="benefit-card">
              <h3 className="benefit-card__title">{b.title}</h3>
              <p className="benefit-card__desc">{b.desc}</p>
            </div>
          ))}
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', margin: '48px 0 24px' }}>Funkce</h2>
        <ul className="feature-list">
          {solution.features.map(f => <li key={f}>{f}</li>)}
        </ul>
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <a href="/cs/demo/" className="btn btn--primary btn--lg">Vyzkoušet demo zdarma →</a>
        </div>
      </div>
    </PageLayout>
  )
}
