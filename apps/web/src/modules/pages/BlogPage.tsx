import { PageLayout } from './PageLayout'
import { SeoHead } from '../../i18n/SeoHead'
import { useI18n } from '../../i18n/i18n'
import { ROUTE_SLUGS } from '../../i18n/routes'
import './pages.css'

export default function BlogPage() {
  const { t, locale } = useI18n()
  const seo = t.seo.blog
  return (
    <PageLayout>
      <SeoHead title={seo.title} description={seo.description} canonicalPath={`/${locale}/${ROUTE_SLUGS.blog[locale]}/`} alternatePath={locale === 'cs' ? `/en/${ROUTE_SLUGS.blog.en}/` : `/cs/${ROUTE_SLUGS.blog.cs}/`} />
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
