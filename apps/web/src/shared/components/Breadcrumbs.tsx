import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, ArrowLeft } from 'lucide-react'
import { useIsMobile } from '../hooks/useMediaQuery'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  className?: string
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  properties: 'Nemovitosti',
  units: 'Jednotky',
  residents: 'Osoby',
  finance: 'Finance',
  helpdesk: 'HelpDesk',
  'workorders': 'Pracovní příkazy',
  'work-orders': 'Pracovní příkazy',
  assets: 'Zařízení',
  meters: 'Měřidla',
  documents: 'Dokumenty',
  contracts: 'Smlouvy',
  calendar: 'Kalendář',
  assemblies: 'Shromáždění',
  revisions: 'Revize',
  protocols: 'Protokoly',
  team: 'Tým',
  settings: 'Nastavení',
  profile: 'Profil',
  audit: 'Audit log',
  notifications: 'Notifikace',
  reporting: 'Reporting',
  reports: 'Výkazy',
  communication: 'Komunikace',
  kanban: 'Pipeline',
  principals: 'Klienti',
  parties: 'Adresář',
  settlements: 'Vyúčtování',
  portal: 'Portál',
  mio: 'Mio AI',
  onboarding: 'Onboarding',
  'my-agenda': 'Moje agenda',
  'asset-types': 'Typy zařízení',
  'super-admin': 'Super Admin',
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

function isAlphanumericId(s: string): boolean {
  return /^[a-z0-9]{20,}$/i.test(s) // cuid pattern
}

/**
 * Auto-generates breadcrumbs from current URL path.
 * Skips UUID/cuid segments (shows parent label instead).
 */
export function Breadcrumbs({ items: customItems, className }: BreadcrumbsProps) {
  const location = useLocation()
  const isMobile = useIsMobile()

  // Build items from URL if not provided
  const items: BreadcrumbItem[] = customItems ?? buildFromPath(location.pathname)

  if (items.length <= 1) return null

  // Mobile: show only back link
  if (isMobile && items.length > 1) {
    const parent = items[items.length - 2]
    return (
      <nav className={className} style={{ padding: '8px 0', fontSize: '0.82rem' }}>
        <Link
          to={parent.href ?? '/dashboard'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--primary)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={14} />
          Zpět na {parent.label}
        </Link>
      </nav>
    )
  }

  // Desktop: full breadcrumbs
  // Collapse middle items if > 4
  let displayItems = items
  if (items.length > 4) {
    displayItems = [
      items[0],
      { label: '…' },
      items[items.length - 2],
      items[items.length - 1],
    ]
  }

  return (
    <nav
      className={className}
      aria-label="Navigace"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '8px 0',
        fontSize: '0.82rem',
        color: 'var(--text-muted)',
        flexWrap: 'wrap',
      }}
    >
      {displayItems.map((item, i) => {
        const isLast = i === displayItems.length - 1
        return (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && <ChevronRight size={12} style={{ color: 'var(--gray-300)', flexShrink: 0 }} />}
            {isLast || !item.href ? (
              <span style={{ fontWeight: isLast ? 600 : 400, color: isLast ? 'var(--dark)' : undefined }}>
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                style={{
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                }}
                onMouseOver={(e) => { (e.target as HTMLElement).style.textDecoration = 'underline' }}
                onMouseOut={(e) => { (e.target as HTMLElement).style.textDecoration = 'none' }}
              >
                {item.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}

function buildFromPath(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const items: BreadcrumbItem[] = []
  let currentPath = ''

  for (const segment of segments) {
    currentPath += `/${segment}`

    // Skip ID-like segments (UUIDs, CUIDs) — they belong to the previous entity
    if (isUuid(segment) || isAlphanumericId(segment)) {
      // Append " (detail)" context to previous item but don't add new breadcrumb
      continue
    }

    const label = ROUTE_LABELS[segment] ?? segment
    items.push({ label, href: currentPath })
  }

  // Last item has no href (current page)
  if (items.length > 0) {
    delete items[items.length - 1].href
  }

  return items
}
