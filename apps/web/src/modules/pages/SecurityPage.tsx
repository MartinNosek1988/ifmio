import { PageLayout } from './PageLayout'
import { SeoHead } from '../../i18n/SeoHead'
import { useI18n } from '../../i18n/i18n'
import { ROUTE_SLUGS, getSlug, getLocalePair } from '../../i18n/routes'

// ─── Reusable patterns ──────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold tracking-widest uppercase mb-2.5" style={{ color: '#0D9B8A' }}>
      {children}
    </p>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3" style={{ color: '#111C2B' }}>
      {children}
    </h2>
  )
}

function SectionIntro({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-relaxed max-w-xl mb-10" style={{ color: '#6B7A8D' }}>
      {children}
    </p>
  )
}

function Card({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white border rounded-2xl p-7 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
         style={{ borderColor: '#DFF0EC' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4"
           style={{ backgroundColor: '#E6F7F4' }}>
        {icon}
      </div>
      <h3 className="font-bold mb-2 tracking-tight" style={{ color: '#111C2B' }}>{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: '#6B7A8D' }}>{desc}</p>
    </div>
  )
}

function Divider() {
  return <hr className="mt-16" style={{ borderColor: '#DFF0EC' }} />
}

// ─── Main component ─────────────────────────────────────────────

export default function SecurityPage() {
  const { t, locale } = useI18n()
  const lp = getLocalePair(locale)
  const s = t.security
  const seo = t.seo.security

  return (
    <PageLayout>
      <SeoHead
        title={seo.title}
        description={seo.description}
        canonicalPath={`/${lp.canonical}/${getSlug(ROUTE_SLUGS.security, lp.canonical)}/`}
        alternatePath={`/${lp.alternate}/${getSlug(ROUTE_SLUGS.security, lp.alternate)}/`}
      />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="pt-20 pb-16 text-center px-4"
               style={{ background: 'linear-gradient(180deg, #DFF7F3 0%, #EDF9F6 50%, #F8FFFE 100%)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-wrap justify-center gap-2.5 mb-6">
            {[s.hero_pill_1, s.hero_pill_2, s.hero_pill_3].map((pill) => (
              <span key={pill} className="text-xs font-semibold px-3.5 py-1.5 rounded-full"
                    style={{ backgroundColor: '#E6F7F4', color: '#0D9B8A' }}>
                {pill}
              </span>
            ))}
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-5" style={{ color: '#111C2B' }}>
            {s.hero_h1_1} <em className="not-italic" style={{ color: '#0D9B8A' }}>{s.hero_h1_em}</em> {s.hero_h1_2}
          </h1>
          <p className="text-base leading-relaxed max-w-lg mx-auto mb-8" style={{ color: '#6B7A8D' }}>
            {s.hero_sub}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="mailto:security@ifmio.com"
               className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-semibold text-white shadow-md hover:opacity-90 transition"
               style={{ backgroundColor: '#0D9B8A' }}>
              {s.hero_cta_primary}
            </a>
            <a href="#compliance"
               className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-semibold border-2 hover:opacity-80 transition"
               style={{ color: '#0D9B8A', borderColor: '#0D9B8A' }}>
              {s.hero_cta_secondary}
            </a>
          </div>
        </div>
      </section>

      {/* ── Trust bar ─────────────────────────────────────────── */}
      <section className="py-5 border-y px-4" style={{ borderColor: '#DFF0EC' }}>
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-6 md:gap-10">
          {[
            ['🛡', s.trust_1], ['🧱', s.trust_2], ['🔍', s.trust_3],
            ['🤖', s.trust_4], ['⚡', s.trust_5],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                   style={{ backgroundColor: '#E6F7F4' }}>
                {icon}
              </div>
              <span className="text-xs font-semibold" style={{ color: '#3A4A5C' }}>{text}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4">
        {/* ── 01 — Ochrana dat ──────────────────────────────────── */}
        <section className="pt-16">
          <SectionLabel>{s.s01_label}</SectionLabel>
          <SectionTitle>{s.s01_h2}</SectionTitle>
          <SectionIntro>{s.s01_intro}</SectionIntro>
          <div className="grid md:grid-cols-3 gap-5">
            <Card icon="🎯" title={s.s01_c1_title} desc={s.s01_c1_desc} />
            <Card icon="🤖" title={s.s01_c2_title} desc={s.s01_c2_desc} />
            <Card icon="🗂" title={s.s01_c3_title} desc={s.s01_c3_desc} />
          </div>
          <Divider />
        </section>

        {/* ── 02 — AI ──────────────────────────────────────────── */}
        <section className="pt-16">
          <SectionLabel>{s.s02_label}</SectionLabel>
          <SectionTitle>{s.s02_h2}</SectionTitle>
          <div className="grid md:grid-cols-2 gap-8 mt-8">
            {/* Left col */}
            <div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: '#6B7A8D' }}>
                {s.s02_p1.split(s.s02_p1_em)[0]}
                <em className="not-italic font-semibold" style={{ color: '#0D9B8A' }}>{s.s02_p1_em}</em>
                {s.s02_p1.split(s.s02_p1_em)[1]}
              </p>
              <p className="text-sm leading-relaxed mb-6" style={{ color: '#6B7A8D' }}>
                {s.s02_p2.split(s.s02_p2_em)[0]}
                <em className="not-italic font-semibold" style={{ color: '#0D9B8A' }}>{s.s02_p2_em}</em>
                {s.s02_p2.split(s.s02_p2_em)[1]}
              </p>
              <div className="space-y-3">
                {[s.s02_check1, s.s02_check2, s.s02_check3, s.s02_check4].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0 mt-0.5"
                         style={{ backgroundColor: '#E6F7F4', color: '#0D9B8A' }}>
                      ✓
                    </div>
                    <span className="text-sm leading-relaxed" style={{ color: '#3A4A5C' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Right col — protection cards */}
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#6B7A8D' }}>
                {s.s02_protections_label}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['🛡', s.s02_p1_title, s.s02_p1_desc],
                  ['🔑', s.s02_p2_title, s.s02_p2_desc],
                  ['🧹', s.s02_p3_title, s.s02_p3_desc],
                  ['⚡', s.s02_p4_title, s.s02_p4_desc],
                ].map(([icon, title, desc]) => (
                  <div key={title} className="border rounded-xl p-4 hover:shadow-sm transition"
                       style={{ borderColor: '#DFF0EC' }}>
                    <div className="text-lg mb-2">{icon}</div>
                    <h4 className="text-sm font-bold mb-1" style={{ color: '#111C2B' }}>{title}</h4>
                    <p className="text-xs leading-relaxed" style={{ color: '#6B7A8D' }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Divider />
        </section>

        {/* ── 03 — Monitoring ──────────────────────────────────── */}
        <section className="pt-16">
          <SectionLabel>{s.s03_label}</SectionLabel>
          <SectionTitle>{s.s03_h2}</SectionTitle>
          <SectionIntro>{s.s03_intro}</SectionIntro>
          <div className="grid md:grid-cols-3 gap-5">
            <Card icon="📊" title={s.s03_c1_title} desc={s.s03_c1_desc} />
            <Card icon="🔔" title={s.s03_c2_title} desc={s.s03_c2_desc} />
            <Card icon="📋" title={s.s03_c3_title} desc={s.s03_c3_desc} />
          </div>
          <Divider />
        </section>

        {/* ── 04 — Přístup ─────────────────────────────────────── */}
        <section className="pt-16">
          <SectionLabel>{s.s04_label}</SectionLabel>
          <SectionTitle>{s.s04_h2}</SectionTitle>
          <SectionIntro>{s.s04_intro}</SectionIntro>
          <div className="grid md:grid-cols-3 gap-5">
            <Card icon="🏗" title={s.s04_c1_title} desc={s.s04_c1_desc} />
            <Card icon="🔑" title={s.s04_c2_title} desc={s.s04_c2_desc} />
            <Card icon="🛑" title={s.s04_c3_title} desc={s.s04_c3_desc} />
          </div>
          <Divider />
        </section>

        {/* ── 05 — Testování ───────────────────────────────────── */}
        <section className="pt-16">
          <SectionLabel>{s.s05_label}</SectionLabel>
          <SectionTitle>{s.s05_h2}</SectionTitle>
          <SectionIntro>{s.s05_intro}</SectionIntro>
          <div className="grid md:grid-cols-3 gap-5">
            <Card icon="🧪" title={s.s05_c1_title} desc={s.s05_c1_desc} />
            <Card icon="🚨" title={s.s05_c2_title} desc={s.s05_c2_desc} />
            <Card icon="🔄" title={s.s05_c3_title} desc={s.s05_c3_desc} />
          </div>
          <Divider />
        </section>

        {/* ── 06 — Compliance ──────────────────────────────────── */}
        <section id="compliance" className="pt-16">
          <SectionLabel>{s.s06_label}</SectionLabel>
          <SectionTitle>{s.s06_h2}</SectionTitle>
          <SectionIntro>{s.s06_intro}</SectionIntro>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              ['🇪🇺', s.s06_c1_title, s.s06_c1_sub],
              ['⚖️', s.s06_c2_title, s.s06_c2_sub],
              ['🤖', s.s06_c3_title, s.s06_c3_sub],
              ['📋', s.s06_c4_title, s.s06_c4_sub],
            ].map(([icon, title, sub]) => (
              <div key={title} className="bg-white border rounded-2xl p-7 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                   style={{ borderColor: '#DFF0EC' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4"
                     style={{ backgroundColor: '#E6F7F4' }}>
                  {icon}
                </div>
                <h3 className="font-bold mb-1 tracking-tight" style={{ color: '#111C2B' }}>{title}</h3>
                <p className="text-sm" style={{ color: '#6B7A8D' }}>{sub}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section id="contact" className="mt-20 py-16 px-4 text-center"
               style={{ background: 'linear-gradient(135deg, #0D9B8A 0%, #0A8578 100%)' }}>
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-4">
            {s.cta_h2}
          </h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {s.cta_p}
          </p>
          <a href="mailto:security@ifmio.com"
             className="inline-flex items-center px-8 py-3.5 rounded-xl text-sm font-bold shadow-lg hover:opacity-90 transition"
             style={{ backgroundColor: '#fff', color: '#0D9B8A' }}>
            {s.cta_btn}
          </a>
          <p className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {s.cta_sub}
          </p>
        </div>
      </section>
    </PageLayout>
  )
}
