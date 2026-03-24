import { useParams } from 'react-router-dom'
import { PageLayout } from '../pages/PageLayout'
import { SeoHead } from '../../i18n/SeoHead'
import { useI18n } from '../../i18n/i18n'
import { ROUTE_SLUGS } from '../../i18n/routes'
import '../pages/pages.css'

const TYPES: Record<string, { title: string; subtitle: string }> = {
  spravci: { title: 'Najít správce nemovitostí', subtitle: 'Ověření profesionální správci ve vašem regionu.' },
  'facility-management': { title: 'Najít facility managera', subtitle: 'Specialisté na facility management.' },
  remeslnici: { title: 'Databáze řemeslníků', subtitle: 'Elektrikáři, instalatéři, zámečníci a další.' },
  'revizni-technici': { title: 'Revizní technici', subtitle: 'Certifikovaní pro elektro, plyn, komíny.' },
}

export default function PartnerSearchPage() {
  const { type } = useParams()
  const { t, locale } = useI18n()
  const seo = t.seo.partners
  const data = TYPES[type ?? ''] ?? { title: 'Partneři', subtitle: '' }

  return (
    <PageLayout>
      <SeoHead title={`${data.title} — ${seo.title}`} description={data.subtitle || seo.description} canonicalPath={`/${locale}/${ROUTE_SLUGS.partners[locale]}/${type ?? ''}/`} />
      <div className="page-hero">
        <h1 className="page-hero__title" style={{ color: 'var(--dark)' }}>{data.title}</h1>
        <p className="page-hero__subtitle" style={{ color: 'var(--gray-500)' }}>{data.subtitle}</p>
      </div>
      <div className="page-content page-content--narrow" style={{ textAlign: 'center' }}>
        <span className="placeholder-badge">Připravujeme</span>
        <p style={{ color: 'var(--gray-500)', marginBottom: 32 }}>Databáze bude spuštěna brzy. Chcete být mezi prvními?</p>
        <a href="/partneri/registrace" className="btn btn--primary">Zaregistrujte se jako partner</a>
      </div>
    </PageLayout>
  )
}
