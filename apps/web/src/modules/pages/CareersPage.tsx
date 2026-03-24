import { PageLayout } from './PageLayout'
import './pages.css'

export default function CareersPage() {
  return (
    <PageLayout>
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
