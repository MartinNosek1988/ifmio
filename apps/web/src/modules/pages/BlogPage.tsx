import { PageLayout } from './PageLayout'
import './pages.css'

export default function BlogPage() {
  return (
    <PageLayout>
      <div className="page-hero"><h1 className="page-hero__title" style={{ color: 'var(--dark)' }}>Blog</h1></div>
      <div className="page-content page-content--narrow" style={{ textAlign: 'center' }}>
        <span className="placeholder-badge">Připravujeme</span>
        <p style={{ color: 'var(--gray-500)', lineHeight: 1.7 }}>
          Brzy zde najdete články o správě nemovitostí, AI a facility managementu.
        </p>
      </div>
    </PageLayout>
  )
}
