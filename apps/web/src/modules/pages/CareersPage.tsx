import { PageLayout } from './PageLayout'
import { SeoHead } from '../../i18n/SeoHead'
import { useI18n } from '../../i18n/i18n'
import { ROUTE_SLUGS } from '../../i18n/routes'
import './pages.css'

export default function CareersPage() {
  const { t, locale } = useI18n()
  const seo = t.seo.careers
  return (
    <PageLayout>
      <SeoHead title={seo.title} description={seo.description} canonicalPath={`/${locale}/${ROUTE_SLUGS.careers[locale]}/`} alternatePath={locale === 'cs' ? `/en/${ROUTE_SLUGS.careers.en}/` : `/cs/${ROUTE_SLUGS.careers.cs}/`} />
      <div className="page-hero"><h1 className="page-hero__title" style={{ color: 'var(--dark)' }}>Kariéra v ifmio</h1></div>
      <div className="page-content page-content--narrow" style={{ textAlign: 'center' }}>
        <span className="placeholder-badge">Připravujeme</span>
        <p style={{ color: 'var(--gray-500)', lineHeight: 1.7, marginBottom: 24 }}>
          Momentálně nehledáme nové kolegy. Sledujte nás pro aktuální nabídky.
        </p>
        <p style={{ color: 'var(--gray-400)', fontSize: '0.88rem' }}>
          Pro spontánní přihlášky nám napište na <a href="mailto:kariera@ifmio.com" style={{ color: 'var(--teal)' }}>kariera@ifmio.com</a>
        </p>
      </div>
    </PageLayout>
  )
}
