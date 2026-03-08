interface SkeletonProps {
  width?: string | number
  height?: string | number
  radius?: number
  style?: React.CSSProperties
}

export function Skeleton({ width = '100%', height = 16, radius = 4, style }: SkeletonProps) {
  return (
    <div
      className="skeleton-shimmer"
      style={{
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  )
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} height={14} />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--surface, #fff)',
      border: '1px solid var(--border, #e5e7eb)',
      borderRadius: 12,
      padding: 20,
    }}>
      <Skeleton width={120} height={12} style={{ marginBottom: 12 }} />
      <Skeleton width={80} height={28} style={{ marginBottom: 8 }} />
      <Skeleton width="40%" height={10} />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div style={{
      background: 'var(--surface, #fff)',
      border: '1px solid var(--border, #e5e7eb)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 16,
        padding: '12px 16px',
        background: 'var(--surface-2, #f9fafb)',
        borderBottom: '1px solid var(--border, #e5e7eb)',
      }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} height={12} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 16,
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-light, #f9fafb)',
        }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height={12} width={c === 0 ? '80%' : '60%'} />
          ))}
        </div>
      ))}
    </div>
  )
}
