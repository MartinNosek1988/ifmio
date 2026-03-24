import { PageLayout } from './PageLayout'
import './pages.css'

export default function LegalPage() {
  return (
    <PageLayout>
      <div className="page-hero"><h1 className="page-hero__title" style={{ color: 'var(--dark)' }}>Právní dokumenty</h1></div>
      <div className="page-content page-content--narrow">
        {['Obchodní podmínky', 'Zásady ochrany osobních údajů', 'Cookies'].map(title => (
          <section key={title} style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', marginBottom: 12 }}>{title}</h2>
            <p style={{ color: 'var(--gray-500)', lineHeight: 1.7 }}>
              Tento dokument bude doplněn. Pro dotazy nás kontaktujte na info@ifmio.com.
            </p>
          </section>
        ))}
      </div>
    </PageLayout>
  )
}
