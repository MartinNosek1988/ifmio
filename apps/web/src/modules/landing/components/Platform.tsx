import { useState } from 'react'
import { PLATFORM } from '../../../data/landing-content'

export function Platform() {
  const [activeTab, setActiveTab] = useState(0)
  const activeKey = PLATFORM.tabKeys[activeTab]

  const filtered = activeKey === 'vse'
    ? PLATFORM.features
    : PLATFORM.features.filter(f => (f.audiences as readonly string[]).includes(activeKey))

  return (
    <section className="section section--gray" id="platforma" aria-label="Platforma">
      <div className="container">
        <p className="section__label">{PLATFORM.sectionLabel}</p>
        <h2 className="section__headline">{PLATFORM.headline}</h2>

        <div className="platform-tabs" role="tablist">
          {PLATFORM.tabs.map((tab, i) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === i}
              className={`platform-tab${activeTab === i ? ' platform-tab--active' : ''}`}
              onClick={() => setActiveTab(i)}
            >
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
          <a href="#demo" className="btn btn--primary">Vyzkoušet demo →</a>
        </div>
      </div>
    </section>
  )
}
