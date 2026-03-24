import { Navigation } from '../landing/components/Navigation'
import { Footer } from '../landing/components/Footer'
import '../landing/landing.css'

export function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      <main style={{ paddingTop: 68 }}>{children}</main>
      <Footer />
    </>
  )
}
