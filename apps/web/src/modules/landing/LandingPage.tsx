import { Navigation } from './components/Navigation'
import { Hero } from './components/Hero'
import { TrustBar } from './components/TrustBar'
import { Features } from './components/Features'
import { MidCta } from './components/MidCta'
import { Stats } from './components/Stats'
import { Platform } from './components/Platform'
import { CaseStudies } from './components/CaseStudies'
import { PricingTeaser } from './components/PricingTeaser'
import { DemoForm } from './components/DemoForm'
import { FinalCta } from './components/FinalCta'
import { Footer } from './components/Footer'
import { MioChatWidget } from './components/MioChatWidget'
import { MobileStickyBar } from './components/MobileStickyBar'
import './landing.css'

export default function LandingPage() {
  return (
    <>
      <Navigation />
      <Hero />
      <TrustBar />
      <Features />
      <MidCta />
      <Stats />
      <Platform />
      <CaseStudies />
      <PricingTeaser />
      <DemoForm />
      <FinalCta />
      <Footer />
      <MioChatWidget />
      <MobileStickyBar />
    </>
  )
}
