import { formatCurrencyFull, currencySign } from '../utils/currency'

interface CurrencyDisplayProps {
  amount: number
  currency?: string
  colorize?: boolean
  size?: 'sm' | 'md' | 'lg'
  showSign?: boolean
  className?: string
}

const SIZE_STYLES: Record<string, React.CSSProperties> = {
  sm: { fontSize: '0.82rem' },
  md: { fontSize: '0.95rem' },
  lg: { fontSize: '1.5rem', fontWeight: 700 },
}

/**
 * Displays a formatted currency amount with color coding.
 *
 * @example <CurrencyDisplay amount={12450.5} />
 *          → "12 450,50 Kč" in green
 *
 * @example <CurrencyDisplay amount={-500} size="lg" />
 *          → "−500,00 Kč" in red, large
 */
export function CurrencyDisplay({
  amount,
  currency = 'Kč',
  colorize = true,
  size = 'md',
  className,
}: CurrencyDisplayProps) {
  const { isPositive, isNegative, isZero } = currencySign(amount)

  let color: string | undefined
  if (colorize) {
    if (isPositive) color = 'var(--color-finance-positive, #16a34a)'
    else if (isNegative) color = 'var(--color-finance-negative, #dc2626)'
    else if (isZero) color = 'var(--color-finance-neutral, #6b7280)'
  }

  return (
    <span
      className={className}
      style={{
        fontFamily: 'var(--font-mono, monospace)',
        textAlign: 'right',
        color,
        whiteSpace: 'nowrap',
        ...SIZE_STYLES[size],
      }}
    >
      {formatCurrencyFull(amount, currency)}
    </span>
  )
}
