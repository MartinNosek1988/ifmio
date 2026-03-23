import { useEffect, useRef, useState } from 'react'

export function useIntersectionObserver<T extends HTMLElement = HTMLDivElement>(
  options: { threshold?: number; rootMargin?: string; triggerOnce?: boolean } = {},
) {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options
  const ref = useRef<T>(null)
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setIsIntersecting(true); return }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsIntersecting(true); if (triggerOnce) observer.unobserve(el) } else if (!triggerOnce) setIsIntersecting(false) },
      { threshold, rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin, triggerOnce])

  return { ref, isIntersecting }
}
