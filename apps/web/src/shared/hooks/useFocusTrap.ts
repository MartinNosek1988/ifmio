import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Traps focus inside a container element when active.
 * - Tab cycles through focusable elements
 * - Shift+Tab cycles backwards
 * - Auto-focuses first element on activation
 * - Returns focus to trigger element on deactivation
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, isActive: boolean): void {
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive || !ref.current) return

    // Remember previous focus
    previousFocus.current = document.activeElement as HTMLElement

    // Focus first element
    const focusable = ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)
    if (focusable.length > 0) {
      setTimeout(() => focusable[0].focus(), 50)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !ref.current) return

      const elements = ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (elements.length === 0) return

      const first = elements[0]
      const last = elements[elements.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Return focus
      previousFocus.current?.focus()
    }
  }, [isActive, ref])
}
