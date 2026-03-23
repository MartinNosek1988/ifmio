import { Navigation } from './components/Navigation'
import { Hero } from './components/Hero'
import { TrustLine } from './components/TrustLine'
import { Features } from './components/Features'
import { Stats } from './components/Stats'
import { Platform } from './components/Platform'
import { CaseStudies } from './components/CaseStudies'
import { FinalCta } from './components/FinalCta'
import { Footer } from './components/Footer'
import { MioChatWidget } from './components/MioChatWidget'
import './landing.css'

export default function LandingPage() {
  return (
    <>
      <Navigation />
      <Hero />
      <TrustLine />
      <Features />
      <Stats />
      <Platform />
      <CaseStudies />
      <FinalCta />
      <Footer />
      <MioChatWidget />
    </>
  )
}
