import { STATS } from '../../../data/landing-content'
import { StatCard } from './StatCard'
import { useIntersectionObserver } from '../hooks/useIntersectionObserver'

export function Stats() {
  const { ref, isIntersecting } = useIntersectionObserver<HTMLElement>()

  return (
    <section ref={ref} className="section" aria-label="Statistiky">
      <div className="container">
        <div className="stats-grid">
          {STATS.map((s, i) => (
            <StatCard key={i} value={s.value} suffix={s.suffix} label={s.label} trigger={isIntersecting} />
          ))}
        </div>
      </div>
    </section>
  )
}
