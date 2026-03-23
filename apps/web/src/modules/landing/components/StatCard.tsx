import { useCountUp } from '../hooks/useCountUp'

interface Props {
  value: number
  suffix: string
  label: string
  trigger: boolean
}

export function StatCard({ value, suffix, label, trigger }: Props) {
  const count = useCountUp(value, 2000, trigger)

  return (
    <div className="stat-card" tabIndex={0}>
      <div className="stat-card__value">
        {count}{suffix}
      </div>
      <div className="stat-card__label">{label}</div>
    </div>
  )
}
