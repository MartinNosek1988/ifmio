import { useI18n } from '../../../i18n/i18n'
import { useIntersectionObserver } from '../hooks/useIntersectionObserver'
import { useCountUp } from '../hooks/useCountUp'

function StatCard({ value, suffix, label, trigger, delay }: { value: number; suffix: string; label: string; trigger: boolean; delay: number }) {
  const count = useCountUp(value, 2000, trigger)
  return (
    <div className={`stat-card animate-on-scroll${trigger ? ' visible' : ''}`} style={trigger ? { transitionDelay: `${delay}s` } : undefined}>
      <div className="stat-card__value">{count}{suffix}</div>
      <div className="stat-card__label">{label}</div>
    </div>
  )
}

export function Stats() {
  const { ref, isIntersecting } = useIntersectionObserver<HTMLElement>()
  const { t } = useI18n()
  return (
    <section ref={ref} className="section section--gray">
      <div className="container">
        <p className="section__label">{t.stats.label}</p>
        <h2 className="section__headline">{t.stats.title}</h2>
        <div className="stats-grid">
          {t.stats.items.map((s, i) => (
            <StatCard key={i} value={s.value} suffix={s.suffix} label={s.label} trigger={isIntersecting} delay={i * 0.15} />
          ))}
        </div>
      </div>
    </section>
  )
}
