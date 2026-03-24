import type { Locale } from './i18n'

export const ROUTE_SLUGS: Record<string, Record<string, string>> = {
  pricing: { cs: 'cenik', en: 'pricing' },
  solutions: { cs: 'reseni', en: 'solutions' },
  platform: { cs: 'platforma', en: 'platform' },
  partners: { cs: 'partneri', en: 'partners' },
  contact: { cs: 'kontakt', en: 'contact' },
  demo: { cs: 'demo', en: 'demo' },
  about: { cs: 'o-nas', en: 'about' },
  careers: { cs: 'kariera', en: 'careers' },
  blog: { cs: 'blog', en: 'blog' },
  legal: { cs: 'pravni-dokumenty', en: 'legal' },
}

export const SOLUTION_SLUGS: Record<string, Record<string, string>> = {
  svj: { cs: 'svj', en: 'hoa' },
  spravce: { cs: 'spravce', en: 'property-managers' },
  fm: { cs: 'facility-management', en: 'facility-management' },
  udrzba: { cs: 'udrzba', en: 'maintenance' },
  investori: { cs: 'investori', en: 'investors' },
}

export const PLATFORM_SLUGS: Record<string, Record<string, string>> = {
  evidence: { cs: 'evidence', en: 'property-registry' },
  finance: { cs: 'finance', en: 'finance' },
  predpisy: { cs: 'predpisy', en: 'payment-orders' },
  konto: { cs: 'konto', en: 'owner-accounts' },
  revize: { cs: 'revize', en: 'inspections' },
  workOrders: { cs: 'pracovni-prikazy', en: 'work-orders' },
  komunikace: { cs: 'komunikace', en: 'communication' },
  meridla: { cs: 'meridla', en: 'meters' },
  vyuctovani: { cs: 'vyuctovani', en: 'settlement' },
  mioAi: { cs: 'mio-ai', en: 'mio-ai' },
  portal: { cs: 'portal', en: 'portal' },
  reporting: { cs: 'reporting', en: 'reporting' },
  shromazdeni: { cs: 'shromazdeni', en: 'meetings' },
  mobile: { cs: 'mobilni-aplikace', en: 'mobile-app' },
  banka: { cs: 'banka', en: 'banking' },
}

/** Get localized route path */
export function getLocalizedPath(routeKey: string, locale: Locale): string {
  const slug = ROUTE_SLUGS[routeKey]
  return slug?.[locale] ?? slug?.cs ?? routeKey
}

/** Get all route variants for a page (both CS and EN slugs) */
export function getAllRouteSlugs(slugMap: Record<string, Record<string, string>>): string[] {
  const all = new Set<string>()
  for (const entry of Object.values(slugMap)) {
    for (const slug of Object.values(entry)) {
      all.add(slug)
    }
  }
  return Array.from(all)
}
