import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Navigation } from '../landing/components/Navigation'
import { Footer } from '../landing/components/Footer'
import { SeoHead } from '../../i18n/SeoHead'
import { useI18n } from '../../i18n/i18n'
import { ROUTE_SLUGS, getSlug, getLocalePair } from '../../i18n/routes'
import { PRICING_HEADER, AUDIENCES, FAQ, BOTTOM_CTA } from './pricing-data'
import '../landing/landing.css'
import './pricing.css'

export default function PricingPage() {
  const { t, locale } = useI18n()
  const lp = getLocalePair(locale)
  const seo = t.seo.pricing
  const [activeTab, setActiveTab] = useState(0)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const audience = AUDIENCES[activeTab]

  return (
    <div className="landing-page">
      <SeoHead title={seo.title} description={seo.description} canonicalPath={`/${lp.canonical}/${getSlug(ROUTE_SLUGS.pricing, lp.canonical)}/`} alternatePath={`/${lp.alternate}/${getSlug(ROUTE_SLUGS.pricing, lp.alternate)}/`} />
      <Navigation />

      <div className="pricing-page">
        {/* Header */}
        <div className="pricing-header">
          <h1 className="pricing-header__title">{PRICING_HEADER.title}</h1>
          <p className="pricing-header__subtitle">{PRICING_HEADER.subtitle}</p>
        </div>

        <div className="container">
          {/* Tabs */}
          <div className="pricing-tabs" role="tablist">
            {AUDIENCES.map((a, i) => (
              <button
                key={a.key}
                role="tab"
                aria-selected={activeTab === i}
                className={`pricing-tab${activeTab === i ? ' pricing-tab--active' : ''}`}
                onClick={() => setActiveTab(i)}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Audience description */}
          <p className="pricing-audience-desc">{audience.description}</p>

          {/* Pricing cards */}
          <div className="pricing-grid">
            {audience.tiers.map(tier => (
              <div key={tier.name} className={`pricing-card${tier.featured ? ' pricing-card--featured' : ''}`}>
                {tier.featured && <div className="pricing-card__badge">Nejoblíbenější</div>}
                <div className="pricing-card__name">{tier.name}</div>
                <div className="pricing-card__range">{tier.range}</div>
                {tier.price && (
                  <div className="pricing-card__price">
                    <span className="pricing-card__price-value">{tier.price}</span>
                    {tier.priceSuffix && <span className="pricing-card__price-suffix">{tier.priceSuffix}</span>}
                  </div>
                )}
                <div className="pricing-card__note">{tier.note}</div>
                {tier.cta && (
                  <Link to="/register" className={`btn ${tier.ctaStyle === 'primary' ? 'btn--primary' : 'btn--ghost'} pricing-card__cta`}>
                    {tier.cta}
                  </Link>
                )}
                <div className="pricing-card__separator" />
                <ul className="pricing-card__features">
                  {tier.features.map(f => <li key={f}>{f}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="pricing-faq">
          <h2 className="pricing-faq__title">Často kladené dotazy</h2>
          {FAQ.map((item, i) => (
            <div key={i} className="pricing-faq__item">
              <button
                className="pricing-faq__question"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
              >
                <span>{item.q}</span>
                <span className={`pricing-faq__toggle${openFaq === i ? ' pricing-faq__toggle--open' : ''}`}>+</span>
              </button>
              <div className={`pricing-faq__answer${openFaq === i ? ' pricing-faq__answer--open' : ''}`}>
                {item.a}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="pricing-bottom-cta">
          <h2 className="pricing-bottom-cta__headline">{BOTTOM_CTA.headline}</h2>
          <p className="pricing-bottom-cta__subhead">{BOTTOM_CTA.subhead}</p>
          <Link to="/register" className="btn btn--white btn--lg">{BOTTOM_CTA.cta}</Link>
        </div>
      </div>

      <Footer />
    </div>
  )
}
