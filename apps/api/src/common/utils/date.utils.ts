/**
 * Convert a Date to YYYY-MM-DD in the business timezone (Europe/Prague).
 * Avoids UTC date shift that happens with toISOString().slice(0, 10).
 */
export function toBusinessDate(date: Date): string {
  // Use Intl to get date parts in Europe/Prague timezone
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
  return parts // sv-SE locale already outputs YYYY-MM-DD
}
