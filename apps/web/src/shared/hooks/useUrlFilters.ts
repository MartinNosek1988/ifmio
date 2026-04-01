import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

interface FilterConfig {
  [key: string]: {
    type: 'string' | 'number' | 'date' | 'boolean'
    default?: unknown
  }
}

/**
 * Syncs filter state with URL search params.
 * - Reads filters from URL on mount
 * - Updates URL on filter change (replace, not push)
 * - Type-safe parsing from URL strings
 */
export function useUrlFilters<T extends Record<string, unknown>>(config: FilterConfig) {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(() => {
    const result: Record<string, unknown> = {}
    for (const [key, cfg] of Object.entries(config)) {
      const raw = searchParams.get(key)
      if (raw === null || raw === '') {
        result[key] = cfg.default ?? (cfg.type === 'number' ? undefined : cfg.type === 'boolean' ? undefined : '')
        continue
      }
      switch (cfg.type) {
        case 'number': {
          const n = Number(raw)
          result[key] = Number.isNaN(n) ? cfg.default : n
          break
        }
        case 'boolean':
          result[key] = raw === 'true'
          break
        default:
          result[key] = raw
      }
    }
    return result as T
  }, [searchParams, config])

  const setFilter = useCallback(
    (key: keyof T, value: unknown) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const cfg = config[key as string]
          const def = cfg?.default

          if (value === def || value === '' || value === undefined || value === null) {
            next.delete(key as string)
          } else {
            next.set(key as string, String(value))
          }

          // Reset page on filter change
          if (key !== 'page') next.delete('page')

          return next
        },
        { replace: true },
      )
    },
    [setSearchParams, config],
  )

  const setFilters = useCallback(
    (partial: Partial<T>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(partial)) {
            const cfg = config[key]
            if (!cfg) continue
            if (value === cfg.default || value === '' || value === undefined || value === null) {
              next.delete(key)
            } else {
              next.set(key, String(value))
            }
          }
          next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams, config],
  )

  const resetFilters = useCallback(() => {
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  const activeFilterCount = useMemo(() => {
    let count = 0
    for (const [key, cfg] of Object.entries(config)) {
      const val = filters[key as keyof T]
      if (val !== cfg.default && val !== '' && val !== undefined && val !== null) count++
    }
    return count
  }, [filters, config])

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    hasActiveFilters: activeFilterCount > 0,
    activeFilterCount,
  }
}
