import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import {
  useNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
} from './api/notifications.queries'
import type { Notification } from './api/notifications.api'
import { TYPE_ICON, TYPE_COLOR } from './notification-utils'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'prave ted'
  if (m < 60) return `pred ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `pred ${h} h`
  return `pred ${Math.floor(h / 24)} dny`
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const { data: count = 0 } = useUnreadCount()
  const { data: notifications = [] } = useNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleClick = (notif: Notification) => {
    if (!notif.isRead) markRead.mutate(notif.id)
    if (notif.url) {
      navigate(notif.url)
      setOpen(false)
    }
  }

  const recent = notifications.slice(0, 10)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="topbar__icon-btn"
        onClick={() => setOpen((o) => !o)}
        title="Notifikace"
        style={{ position: 'relative' }}
      >
        <Bell size={18} />
        {count > 0 && (
          <span style={{
            position: 'absolute',
            top: 2, right: 2,
            background: '#ef4444', color: '#fff',
            borderRadius: '50%',
            width: 16, height: 16,
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 380, maxHeight: 500,
          background: 'var(--card-bg, #fff)',
          border: '1px solid var(--border, #e5e7eb)',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 1000, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid var(--border, #f3f4f6)',
          }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>
              Notifikace
              {count > 0 && (
                <span style={{
                  marginLeft: 6, background: '#eff6ff', color: '#1d4ed8',
                  borderRadius: 10, padding: '1px 7px', fontSize: 12,
                }}>
                  {count}
                </span>
              )}
            </span>
            {count > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                style={{
                  background: 'none', border: 'none',
                  color: '#6366f1', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                }}
              >
                Vse precist
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {recent.length === 0 ? (
              <div style={{
                padding: 40, textAlign: 'center',
                color: 'var(--text-muted, #9ca3af)', fontSize: 14,
              }}>
                Zadne notifikace
              </div>
            ) : (
              recent.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className="notif-dd-item"
                  style={{
                    display: 'flex', gap: 10, padding: '10px 16px',
                    cursor: n.url ? 'pointer' : 'default',
                    background: n.isRead ? 'transparent' : 'var(--accent-bg, #fafafe)',
                    borderBottom: '1px solid var(--border-light, #f3f4f6)',
                  }}
                >
                  <span style={{
                    fontSize: 14, flexShrink: 0, marginTop: 2,
                    width: 24, height: 24, borderRadius: 6,
                    background: `${TYPE_COLOR[n.type] ?? '#6366f1'}15`,
                    color: TYPE_COLOR[n.type] ?? '#6366f1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {TYPE_ICON[n.type] ?? TYPE_ICON.info}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: n.isRead ? 400 : 600,
                      color: 'var(--text-primary, #111827)', marginBottom: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {n.title}
                    </div>
                    <div style={{
                      fontSize: 12, color: 'var(--text-muted, #6b7280)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {n.body}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)', marginTop: 2 }}>
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>
                  {!n.isRead && (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#6366f1', flexShrink: 0, marginTop: 6,
                    }} />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '10px 16px', borderTop: '1px solid var(--border, #f3f4f6)',
            textAlign: 'center',
          }}>
            <button
              onClick={() => { setOpen(false); navigate('/notifications'); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#6366f1', fontSize: 13, fontWeight: 600,
              }}
            >
              Zobrazit vsechny notifikace
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
