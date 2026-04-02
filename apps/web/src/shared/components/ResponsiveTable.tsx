import type { ReactNode } from 'react'
import { useIsMobile } from '../hooks/useMediaQuery'
import { MoreVertical } from 'lucide-react'

interface RColumn<T> {
  key: string
  header: string
  render: (item: T) => ReactNode
  hideOnMobile?: boolean
  isPrimary?: boolean
  isSecondary?: boolean
  align?: 'left' | 'right' | 'center'
}

interface ResponsiveTableProps<T> {
  data: T[]
  columns: RColumn<T>[]
  onRowClick?: (item: T) => void
  isLoading?: boolean
  emptyState?: ReactNode
  keyExtractor: (item: T) => string
  actions?: (item: T) => ReactNode
}

export type { RColumn }

export function ResponsiveTable<T>({
  data,
  columns,
  onRowClick,
  emptyState,
  keyExtractor,
  actions,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile()

  if (data.length === 0 && emptyState) return <>{emptyState}</>

  // Mobile: card layout
  if (isMobile) {
    const primaryCols = columns.filter((c) => c.isPrimary)
    const secondaryCols = columns.filter((c) => c.isSecondary)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((item) => (
          <div
            key={keyExtractor(item)}
            onClick={() => onRowClick?.(item)}
            style={{
              background: 'var(--color-surface, #fff)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 14px',
              cursor: onRowClick ? 'pointer' : 'default',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                {primaryCols.map((col) => (
                  <div key={col.key} style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--dark)' }}>
                    {col.render(item)}
                  </div>
                ))}
              </div>
              {actions && (
                <div onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
                  {actions(item)}
                </div>
              )}
            </div>
            {secondaryCols.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                {secondaryCols.map((col) => (
                  <span key={col.key} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {col.render(item)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  // Desktop: standard table
  const visibleCols = columns.filter((c) => !c.hideOnMobile || !isMobile)

  return (
    <div style={{ overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)' }}>
            {visibleCols.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: '10px 12px',
                  textAlign: (col.align || 'left') as 'left' | 'right' | 'center',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  fontSize: '0.78rem',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.03em',
                }}
              >
                {col.header}
              </th>
            ))}
            {actions && <th style={{ width: 40 }} />}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              style={{
                borderBottom: '1px solid var(--gray-100)',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background 0.1s',
              }}
              onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--gray-50)' }}
              onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
            >
              {visibleCols.map((col) => (
                <td
                  key={col.key}
                  style={{
                    padding: '10px 12px',
                    textAlign: (col.align || 'left') as 'left' | 'right' | 'center',
                    color: 'var(--dark)',
                  }}
                >
                  {col.render(item)}
                </td>
              ))}
              {actions && (
                <td style={{ padding: '10px 4px' }} onClick={(e) => e.stopPropagation()}>
                  {actions(item)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
