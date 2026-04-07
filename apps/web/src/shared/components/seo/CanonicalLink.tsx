import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function CanonicalLink() {
  const { pathname } = useLocation()

  useEffect(() => {
    const canonical = `https://ifmio.com${pathname}`

    let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!el) {
      el = document.createElement('link')
      el.rel = 'canonical'
      document.head.appendChild(el)
    }
    el.href = canonical
  }, [pathname])

  return null
}
