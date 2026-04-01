const csFormatter = new Intl.NumberFormat('cs-CZ', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Format a number as Czech currency string.
 * @example formatCurrencyValue(1234567.5) → "1 234 567,50"
 */
export function formatCurrencyValue(amount: number): string {
  return csFormatter.format(amount)
}

/**
 * Format with sign and currency symbol.
 * @example formatCurrencyFull(1234.5) → "1 234,50 Kč"
 * @example formatCurrencyFull(-500) → "−500,00 Kč"
 */
export function formatCurrencyFull(amount: number, currency = 'Kč'): string {
  const abs = Math.abs(amount)
  const formatted = csFormatter.format(abs)
  const sign = amount < 0 ? '−' : '' // use proper minus sign, not hyphen
  return `${sign}${formatted} ${currency}`
}

/**
 * Parse a Czech-formatted currency string to number.
 * Handles both comma and dot as decimal separators.
 * Returns null if input is not a valid number.
 */
export function parseCurrency(input: string): number | null {
  if (!input || !input.trim()) return null
  // Remove currency symbols, spaces used as thousands separator
  const cleaned = input
    .replace(/\s/g, '')       // remove spaces (thousands separator)
    .replace(/Kč/gi, '')      // remove currency
    .replace(/,/g, '.')       // comma → dot for parseFloat
    .trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : Math.round(num * 100) / 100
}

/**
 * Analyze amount sign for color coding.
 */
export function currencySign(amount: number) {
  return {
    isPositive: amount > 0,
    isNegative: amount < 0,
    isZero: amount === 0,
  }
}
