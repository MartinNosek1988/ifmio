import { useState } from 'react'
import { useI18n } from '../../../i18n/i18n'

const TAB_KEYS = ['vse', 'svj', 'majitele', 'spravce', 'najemniky', 'remeslniky']

export function Platform() {
  const [activeTab, setActiveTab] = useState(0)
  const { t, localePath } = useI18n()
  const p = t.platform
  const activeKey = TAB_KEYS[activeTab]

  const filtered = activeKey === 'vse'
    ? p.features
    : p.features.filter(f => (f.audiences as readonly string[]).includes(activeKey))

  return (
    <section className="section section--gray" id="platforma" aria-label="Platform">
      <div className="container">
        <p className="section__label">{p.label}</p>
        <h2 className="section__headline">{p.title}</h2>

        <div className="platform-tabs" role="tablist">
          {p.tabs.map((tab, i) => (
            <button key={i} role="tab" aria-selected={activeTab === i}
              className={`platform-tab${activeTab === i ? ' platform-tab--active' : ''}`}
              onClick={() => setActiveTab(i)}>
              {tab}
            </button>
          ))}
        </div>

        <div className="platform-grid">
          {filtered.map(f => (
            <div key={f.title} className="platform-card">
              <span className="platform-card__icon">{f.icon}</span>
              <h3 className="platform-card__title">{f.title}</h3>
              <p className="platform-card__desc">{f.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <a href={localePath('/demo')} className="btn btn--primary">{p.cta}</a>
        </div>
      </div>
    </section>
  )
}
