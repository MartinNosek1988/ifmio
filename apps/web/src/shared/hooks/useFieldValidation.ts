import { useState, useCallback, useRef } from 'react'
import type { ValidationRule } from '../utils/validators'

interface UseFieldValidationOptions {
  rules: ValidationRule[]
  validateOnBlur?: boolean
  validateOnChange?: boolean
}

interface UseFieldValidationResult {
  error: string | null
  validate: (value: unknown) => boolean
  onBlur: (value: unknown) => void
  onChange: (value: unknown) => void
  reset: () => void
  touched: boolean
}

/**
 * Per-field validation hook with blur-first strategy.
 *
 * - First blur: validate and show errors
 * - After first blur: also validate on change (instant feedback)
 * - Reset: clear errors and touched state
 */
export function useFieldValidation(
  options: UseFieldValidationOptions,
): UseFieldValidationResult {
  const { rules, validateOnBlur = true, validateOnChange = false } = options
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const hasBlurred = useRef(false)

  const runValidation = useCallback(
    (value: unknown): boolean => {
      for (const rule of rules) {
        if (!rule.validate(value)) {
          setError(rule.message)
          return false
        }
      }
      setError(null)
      return true
    },
    [rules],
  )

  const onBlur = useCallback(
    (value: unknown) => {
      if (!validateOnBlur) return
      hasBlurred.current = true
      setTouched(true)
      runValidation(value)
    },
    [validateOnBlur, runValidation],
  )

  const onChange = useCallback(
    (value: unknown) => {
      // After first blur, validate on every change (instant feedback)
      if (hasBlurred.current || validateOnChange) {
        runValidation(value)
      }
    },
    [validateOnChange, runValidation],
  )

  const reset = useCallback(() => {
    setError(null)
    setTouched(false)
    hasBlurred.current = false
  }, [])

  return { error, validate: runValidation, onBlur, onChange, reset, touched }
}
