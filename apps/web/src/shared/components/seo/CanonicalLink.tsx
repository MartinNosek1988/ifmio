import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'

export function CanonicalLink() {
  const { pathname } = useLocation()

  const configuredBaseUrl = import.meta.env.VITE_PUBLIC_BASE_URL?.trim()
  const baseUrl = (configuredBaseUrl || window.location.origin).replace(/\/+$/, '')
  const normalizedPathname = pathname.startsWith('/') ? pathname : `/${pathname}`
  const canonical = `${baseUrl}${normalizedPathname}`

  return (
    <Helmet>
      <link rel="canonical" href={canonical} />
    </Helmet>
  )
}
