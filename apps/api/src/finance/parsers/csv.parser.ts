export interface ParsedTransaction {
  date:         string
  amount:       number
  type:         'credit' | 'debit'
  counterparty: string
  variableSymbol?: string
  specificSymbol?: string
  constantSymbol?: string
  description?: string
  rawRow:       string
}

export interface ParseResult {
  transactions: ParsedTransaction[]
  errors:       { row: number; message: string }[]
}

/**
 * Parsuje CSV export z českých bank
 * Podporuje formáty: FIO, ČSOB, KB, Raiffeisenbank
 */
export function parseCsv(content: string): ParseResult {
  const lines  = content.split('\n').map((l) => l.trim()).filter(Boolean)
  const result: ParseResult = { transactions: [], errors: [] }

  const separator = lines[0]?.includes(';') ? ';' : ','

  let headerIdx = -1
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const lower = lines[i].toLowerCase()
    if (
      lower.includes('datum') || lower.includes('date') ||
      lower.includes('částka') || lower.includes('amount')
    ) {
      headerIdx = i
      break
    }
  }

  if (headerIdx === -1) {
    headerIdx = 0
  }

  const headers = lines[headerIdx]
    .split(separator)
    .map((h) => h.replace(/"/g, '').toLowerCase().trim())

  const findCol = (...candidates: string[]) =>
    headers.findIndex((h) => candidates.some((c) => h.includes(c)))

  const dateCol    = findCol('datum', 'date')
  const amountCol  = findCol('částka', 'amount', 'castka', 'objem')
  const typeCol    = findCol('typ', 'type', 'směr', 'smer')
  const counterCol = findCol('protistrana', 'counterparty', 'název', 'nazev', 'příjemce')
  const vsCol      = findCol('variabilní', 'variable', 'vs')
  const descCol    = findCol('poznámka', 'popis', 'description', 'zpráva', 'zprava')

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line || line.startsWith('//') || line.startsWith('#')) continue

    const cols = line.split(separator).map((c) => c.replace(/"/g, '').trim())
    if (cols.length < 2) continue

    try {
      const dateRaw   = dateCol   >= 0 ? cols[dateCol]   : cols[0]
      const amountRaw = amountCol >= 0 ? cols[amountCol] : cols[1]

      let date: string
      if (dateRaw.includes('.')) {
        const [d, m, y] = dateRaw.split('.')
        date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      } else {
        date = dateRaw
      }

      const amountClean = amountRaw
        .replace(/\s/g, '')
        .replace(',', '.')
        .replace(/[^\d.-]/g, '')
      const amount = Math.abs(parseFloat(amountClean))
      if (isNaN(amount)) {
        result.errors.push({ row: i, message: `Nelze parsovat částku: ${amountRaw}` })
        continue
      }

      const typeRaw = typeCol >= 0 ? cols[typeCol]?.toLowerCase() : ''
      const type: 'credit' | 'debit' =
        typeRaw.includes('příjem') || typeRaw.includes('připsání') ||
        typeRaw.includes('credit') || parseFloat(amountRaw.replace(',', '.')) > 0
          ? 'credit' : 'debit'

      result.transactions.push({
        date,
        amount,
        type,
        counterparty: counterCol >= 0 ? cols[counterCol] ?? '' : '',
        variableSymbol: vsCol >= 0 ? cols[vsCol] ?? undefined : undefined,
        description:    descCol >= 0 ? cols[descCol] ?? undefined : undefined,
        rawRow:         line,
      })
    } catch (err) {
      result.errors.push({ row: i, message: `Chyba parsování: ${err}` })
    }
  }

  return result
}
