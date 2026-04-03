import { useState, useRef, useEffect, useCallback, useId } from 'react'
import { Search, MapPin, X, Loader2 } from 'lucide-react'
import { apiClient } from '../../core/api/client'

export interface AddressResult {
  id: string
  fullAddress: string
  street: string
  city: string
  postalCode: string
  lat?: number
  lng?: number
  ruianCode?: string
}

interface AddressAutocompleteProps {
  onSelect: (address: AddressResult) => void
  placeholder?: string
  defaultValue?: string
  className?: string
}

export function AddressAutocomplete({
  onSelect,
  placeholder = 'Začněte psát adresu...',
  defaultValue = '',
  className,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(defaultValue)
  const [results, setResults] = useState<AddressResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const requestIdRef = useRef(0)
  const listboxId = useId()

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setResults([]); setIsOpen(false); return }
    const currentRequestId = ++requestIdRef.current
    setIsLoading(true)
    try {
      const res = await apiClient.get('/ruian/search', { params: { q } })
      // Ignore stale responses (race condition fix)
      if (currentRequestId !== requestIdRef.current) return
      const data = Array.isArray(res.data) ? res.data : []
      setResults(data.slice(0, 10))
      setIsOpen(data.length > 0)
      setActiveIndex(-1)
    } catch {
      if (currentRequestId !== requestIdRef.current) return
      setResults([])
      setIsOpen(false)
    } finally {
      if (currentRequestId === requestIdRef.current) setIsLoading(false)
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 300)
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleSelect = (result: AddressResult) => {
    setQuery(result.fullAddress)
    setIsOpen(false)
    setResults([])
    onSelect(result)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(i => (i + 1) % results.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(i => (i - 1 + results.length) % results.length)
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0) handleSelect(results[activeIndex])
        break
      case 'Escape':
        setIsOpen(false)
        setActiveIndex(-1)
        break
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const activeOptionId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined

  return (
    <div ref={dropdownRef} className={className} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          style={{
            width: '100%', padding: '10px 36px 10px 36px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--color-surface, #fff)',
            color: 'var(--text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
          }}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={activeOptionId}
        />
        {isLoading && (
          <Loader2 size={16} style={{ position: 'absolute', right: query ? 36 : 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />
        )}
        {query && !isLoading && (
          <button type="button" onClick={handleClear} aria-label="Vymazat adresu" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && (
        <div id={listboxId} role="listbox" style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 50,
          background: 'var(--color-surface, #fff)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: 'var(--shadow-lg)', maxHeight: 300, overflowY: 'auto',
        }}>
          {results.length === 0 && !isLoading && (
            <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
              Žádné výsledky
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={r.id}
              id={`${listboxId}-option-${i}`}
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => handleSelect(r)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
                background: i === activeIndex ? 'var(--primary-50, #f0fdfa)' : 'transparent',
                color: 'var(--dark)', fontSize: '0.85rem',
                borderBottom: i < results.length - 1 ? '1px solid var(--gray-100)' : 'none',
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <MapPin size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <span>{r.fullAddress}</span>
            </button>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>
    </div>
  )
}
