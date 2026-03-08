import { describe, it, expect } from 'vitest'

type AgingBucket = 'no_reminder' | '0_30' | '31_60' | '61_90' | '90_plus'

function getAgingBucket(daysSince: number | null): AgingBucket {
  if (daysSince === null) return 'no_reminder'
  if (daysSince <= 30) return '0_30'
  if (daysSince <= 60) return '31_60'
  if (daysSince <= 90) return '61_90'
  return '90_plus'
}

describe('Aging bucket logic', () => {
  it('returns no_reminder for null', () => {
    expect(getAgingBucket(null)).toBe('no_reminder')
  })

  it('returns 0_30 for recent reminders', () => {
    expect(getAgingBucket(0)).toBe('0_30')
    expect(getAgingBucket(15)).toBe('0_30')
    expect(getAgingBucket(30)).toBe('0_30')
  })

  it('returns 31_60 for older reminders', () => {
    expect(getAgingBucket(31)).toBe('31_60')
    expect(getAgingBucket(60)).toBe('31_60')
  })

  it('returns 61_90 for very old reminders', () => {
    expect(getAgingBucket(61)).toBe('61_90')
    expect(getAgingBucket(90)).toBe('61_90')
  })

  it('returns 90_plus for critical debtors', () => {
    expect(getAgingBucket(91)).toBe('90_plus')
    expect(getAgingBucket(365)).toBe('90_plus')
  })
})
