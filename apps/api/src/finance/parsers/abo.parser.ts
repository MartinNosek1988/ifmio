import type { ParsedTransaction, ParseResult } from './csv.parser'

/**
 * Parsuje ABO formát (MultiCash) — standard českých bank
 */
export function parseAbo(content: string): ParseResult {
  const lines  = content.split('\n').map((l) => l.trimEnd())
  const result: ParseResult = { transactions: [], errors: [] }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line || line.length < 10) continue

    if (line.startsWith('074') || line.startsWith('075')) continue

    if (!/^\d{3}/.test(line)) continue

    try {
      const parts = line.split(/\s+/).filter(Boolean)
      if (parts.length < 5) continue

      let dateStr = parts.find((p) => /^\d{8}$/.test(p))
      let date    = ''
      if (dateStr) {
        if (dateStr.startsWith('20') || dateStr.startsWith('19')) {
          date = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
        } else {
          date = `${dateStr.slice(4, 8)}-${dateStr.slice(2, 4)}-${dateStr.slice(0, 2)}`
        }
      }
      if (!date) {
        result.errors.push({ row: i, message: 'Nelze detekovat datum' })
        continue
      }

      const amountStr = parts.find((p) => /^\d+[,.]?\d*$/.test(p) && parseFloat(p.replace(',', '.')) > 0)
      if (!amountStr) {
        result.errors.push({ row: i, message: 'Nelze detekovat částku' })
        continue
      }
      const amount = parseFloat(amountStr.replace(',', '.'))

      const vs = parts.find((p) => /^\d{6,10}$/.test(p) && p !== dateStr)

      const type: 'credit' | 'debit' =
        line.includes('+') || parts.some(p => p === 'C') ? 'credit' : 'debit'

      result.transactions.push({
        date,
        amount,
        type,
        counterparty:   '',
        variableSymbol: vs,
        description:    parts.slice(-2).join(' '),
        rawRow:         line,
      })
    } catch (err) {
      result.errors.push({ row: i, message: `Chyba: ${err}` })
    }
  }

  return result
}
