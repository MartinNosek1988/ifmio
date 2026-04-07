import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const SHORTCUTS: Record<string, string> = {
  'g d': '/dashboard',
  'g r': '/residents',
  'g f': '/finance',
  'g h': '/helpdesk',
  'g p': '/properties',
  'g x': '/reports',
  'g a': '/audit',
  'g w': '/workorders',
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const [showHelp, setShowHelp] = useState(false)

  const closeHelp = useCallback(() => setShowHelp(false), [])

  useEffect(() => {
    let buffer = ''
    let timer: ReturnType<typeof setTimeout>

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (e.key === '?') {
        setShowHelp(v => !v)
        return
      }

      if (showHelp) return // don't navigate while overlay is open

      buffer += e.key === ' ' ? ' ' : e.key
      clearTimeout(timer)
      timer = setTimeout(() => { buffer = '' }, 500)

      const match = Object.entries(SHORTCUTS).find(
        ([shortcut]) => buffer.endsWith(shortcut),
      )
      if (match) {
        buffer = ''
        navigate(match[1])
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      clearTimeout(timer)
    }
  }, [navigate, showHelp])

  return { showHelp, closeHelp }
}
