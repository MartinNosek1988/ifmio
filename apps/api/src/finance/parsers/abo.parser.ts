import type { ParsedTransaction, ParseResult } from './csv.parser'

/**
 * Parsuje GPC/ABO formát — standard českých bank (KB, ČSOB, Moneta, UniCredit)
 *
 * Formát: fixed-width řádky, 128 znaků
 * Typ 074 = header (přeskočit)
 * Typ 075 = transakce (parsovat fixed-width pozice)
 *
 * Pozice (0-indexed):
 *   [0-2]   record type ("075")
 *   [3-18]  číslo našeho účtu (16 zn.)
 *   [19-34] číslo protiúčtu (16 zn.)
 *   [35-47] číslo transakce (13 zn.)
 *   [48-59] částka v haléřích (12 zn.)
 *   [60]    účetní kód: 1=debit, 2=credit, 4=storno debit, 5=storno credit
 *   [61-70] variabilní symbol (10 zn.)
 *   [71-74] kód banky protistrany (4 zn.)
 *   [75-84] konstantní symbol (10 zn.)
 *   [85-90] specifický symbol (6 zn.)
 *   [91-96] datum pohybu DDMMYY (6 zn.)
 *   [97-116] jméno protistrany (20 zn.)
 */
export function parseAbo(content: string): ParseResult {
  const lines = content.split(/\r?\n/)
  const result: ParseResult = { transactions: [], errors: [] }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line || line.length < 60) continue

    const recordType = line.substring(0, 3)
    if (recordType !== '075') continue

    try {
      // Pad line to 128 chars if shorter (some exports trim trailing spaces)
      const padded = line.padEnd(128)

      const counterpartyAccount = padded.substring(19, 35).trim().replace(/^0+/, '') || null
      const amountHalere = parseInt(padded.substring(48, 60).trim(), 10)
      if (isNaN(amountHalere) || amountHalere === 0) {
        result.errors.push({ row: i, message: 'Nulová nebo neplatná částka' })
        continue
      }
      const amount = amountHalere / 100 // haléře → CZK

      const accountingCode = padded.substring(60, 61)
      // 1=debit (výdaj), 2=credit (příjem), 4=storno debit, 5=storno credit
      const isCredit = accountingCode === '2' || accountingCode === '5'
      const type: 'credit' | 'debit' = isCredit ? 'credit' : 'debit'

      const variableSymbol = padded.substring(61, 71).trim().replace(/^0+/, '') || null
      const counterpartyBankCode = padded.substring(71, 75).trim().replace(/^0+/, '') || null
      const constantSymbol = padded.substring(75, 85).trim().replace(/^0+/, '') || null
      const specificSymbol = padded.substring(85, 91).trim().replace(/^0+/, '') || null

      // Parse date: DDMMYY
      const valueDateRaw = padded.substring(91, 97).trim()
      let date: string
      if (valueDateRaw.length === 6) {
        const day = parseInt(valueDateRaw.substring(0, 2), 10)
        const month = parseInt(valueDateRaw.substring(2, 4), 10)
        const yearShort = parseInt(valueDateRaw.substring(4, 6), 10)
        const fullYear = yearShort < 50 ? 2000 + yearShort : 1900 + yearShort
        date = `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      } else {
        date = new Date().toISOString().split('T')[0]
      }

      const counterpartyName = padded.substring(97, 117).trim() || null

      result.transactions.push({
        date,
        amount,
        type,
        counterparty: counterpartyName ?? '',
        variableSymbol,
        constantSymbol,
        specificSymbol,
        counterpartyAccount,
        counterpartyBankCode,
        description: counterpartyName ?? undefined,
        rawRow: line,
      })
    } catch (err) {
      result.errors.push({ row: i, message: `Chyba parsování řádku: ${err}` })
    }
  }

  return result
}
