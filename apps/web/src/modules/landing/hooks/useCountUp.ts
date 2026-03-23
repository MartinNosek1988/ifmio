import { useEffect, useState } from 'react'

function easeOutCubic(t: number): number { return 1 - Math.pow(1 - t, 3) }

export function useCountUp(endValue: number, duration = 2000, trigger = false): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!trigger) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || endValue === 0) { setValue(endValue); return }
    let start: number | null = null
    let raf: number
    const animate = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      setValue(Math.round(easeOutCubic(p) * endValue))
      if (p < 1) raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [endValue, duration, trigger])
  return value
}
