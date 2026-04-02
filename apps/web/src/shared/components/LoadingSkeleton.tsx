interface LoadingSkeletonProps {
  variant: 'table' | 'detail' | 'card'
  rows?: number
  columns?: number
}

function Pulse({ width, height = 14 }: { width: string | number; height?: number }) {
  return (
    <div style={{
      width, height, borderRadius: 4,
      background: 'var(--gray-200)',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    }} />
  )
}

export function LoadingSkeleton({ variant, rows = 5, columns = 4 }: LoadingSkeletonProps) {
  if (variant === 'table') {
    return (
      <div style={{ overflow: 'hidden' }}>
        {/* Header row */}
        <div style={{ display: 'flex', gap: 16, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Pulse key={i} width={`${100 / columns}%`} height={12} />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} style={{ display: 'flex', gap: 16, padding: '14px 16px', borderBottom: '1px solid var(--gray-100)' }}>
            {Array.from({ length: columns }).map((_, c) => (
              <Pulse key={c} width={`${60 + Math.random() * 30}%`} />
            ))}
          </div>
        ))}
        <style>{`@keyframes skeleton-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </div>
    )
  }

  if (variant === 'detail') {
    return (
      <div style={{ padding: 16 }}>
        <Pulse width="40%" height={24} />
        <div style={{ marginTop: 8 }}><Pulse width="60%" height={14} /></div>
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <Pulse width="30%" height={10} />
              <div style={{ marginTop: 6 }}><Pulse width="70%" /></div>
            </div>
          ))}
        </div>
        <style>{`@keyframes skeleton-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </div>
    )
  }

  // card variant
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ padding: 16, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--color-surface, #fff)' }}>
          <Pulse width="60%" height={16} />
          <div style={{ marginTop: 12 }}><Pulse width="80%" /></div>
          <div style={{ marginTop: 8 }}><Pulse width="40%" /></div>
        </div>
      ))}
      <style>{`@keyframes skeleton-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}
