import { Helmet } from 'react-helmet-async'
import { useI18n } from './i18n'

const BASE_URL = 'https://ifmio.com'

interface Props {
  title: string
  description: string
  canonicalPath: string
  alternatePath?: string
}

export function SeoHead({ title, description, canonicalPath, alternatePath }: Props) {
  const { locale } = useI18n()
  const fullTitle = `${title} | ifmio`
  const canonicalUrl = `${BASE_URL}${canonicalPath}`

  const csUrl = alternatePath
    ? `${BASE_URL}${locale === 'cs' ? canonicalPath : alternatePath}`
    : undefined
  const enUrl = alternatePath
    ? `${BASE_URL}${locale === 'en' ? canonicalPath : alternatePath}`
    : undefined

  return (
    <Helmet>
      <html lang={locale} />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {csUrl && <link rel="alternate" hrefLang="cs" href={csUrl} />}
      {enUrl && <link rel="alternate" hrefLang="en" href={enUrl} />}
      {alternatePath && <link rel="alternate" hrefLang="x-default" href={`${BASE_URL}/cs/`} />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={`${BASE_URL}/og-image.png`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  )
}
