import { useEffect, useState } from 'react'

export function MobileStickyBar() {
  const [showBar, setShowBar] = useState(false)

  useEffect(() => {
    const hero = document.getElementById('hero')
    if (!hero) return

    const observer = new IntersectionObserver(
      ([entry]) => setShowBar(!entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(hero)
    return () => observer.disconnect()
  }, [])

  return (
    <div className={`mobile-sticky-bar${showBar ? ' mobile-sticky-bar--visible' : ''}`} aria-hidden={!showBar}>
      <span className="mobile-sticky-bar__text">Vyzkoušejte ifmio</span>
      <a href="#demo" className="btn btn--primary btn--sm">Demo zdarma</a>
    </div>
  )
}
