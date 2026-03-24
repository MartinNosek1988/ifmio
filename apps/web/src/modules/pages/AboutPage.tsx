import { PageLayout } from './PageLayout'
import { SeoHead } from '../../i18n/SeoHead'
import { useI18n } from '../../i18n/i18n'
import { ROUTE_SLUGS } from '../../i18n/routes'
import './pages.css'

export default function AboutPage() {
  const { t, locale } = useI18n()
  const seo = t.seo.about
  return (
    <PageLayout>
      <SeoHead title={seo.title} description={seo.description} canonicalPath={`/${locale}/${ROUTE_SLUGS.about[locale]}/`} alternatePath={locale === 'cs' ? `/en/${ROUTE_SLUGS.about.en}/` : `/cs/${ROUTE_SLUGS.about.cs}/`} />
      <div className="page-hero"><h1 className="page-hero__title" style={{ color: 'var(--dark)' }}>O ifmio</h1></div>
      <div className="page-content page-content--narrow">
        <p style={{ fontSize: '1.05rem', color: 'var(--gray-600)', lineHeight: 1.7, marginBottom: 32 }}>
          ifmio je AI-native platforma pro správu nemovitostí. Pomáháme správcům, SVJ, majitelům a facility manažerům
          automatizovat administrativu a mít kompletní přehled nad svými nemovitostmi.
        </p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: 16 }}>Naše mise</h2>
        <p style={{ color: 'var(--gray-600)', lineHeight: 1.7, marginBottom: 32 }}>
          Věříme, že správa nemovitostí by měla být jednoduchá, přehledná a bez papírování.
          Náš AI asistent Mio pomáhá snižovat zátěž administrativy až o 80 % a odpovídá
          vlastníkům a nájemníkům 24/7.
        </p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: 16 }}>Společnost</h2>
        <p style={{ color: 'var(--gray-600)', lineHeight: 1.7 }}>IFMIO Ltd. · Praha, Česká republika</p>
      </div>
    </PageLayout>
  )
}
