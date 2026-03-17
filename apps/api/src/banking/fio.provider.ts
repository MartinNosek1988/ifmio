import { Injectable, Logger } from '@nestjs/common'

export interface NormalizedTransaction {
  externalId: string
  date: Date
  amount: number
  currency: string
  counterAccount: string | null
  counterBankCode: string | null
  counterAccountName: string | null
  variableSymbol: string
  constantSymbol: string
  specificSymbol: string
  description: string | null
  type: 'credit' | 'debit'
}

const FIO_BASE = 'https://fioapi.fio.cz/v1/rest'

@Injectable()
export class FioProvider {
  private readonly logger = new Logger(FioProvider.name)

  async fetchNewTransactions(token: string): Promise<NormalizedTransaction[]> {
    const url = `${FIO_BASE}/last/${token}/transactions.json`
    return this.fetchAndParse(url)
  }

  async fetchByDateRange(token: string, from: Date, to: Date): Promise<NormalizedTransaction[]> {
    const dateFrom = from.toISOString().split('T')[0]
    const dateTo = to.toISOString().split('T')[0]
    const url = `${FIO_BASE}/periods/${token}/${dateFrom}/${dateTo}/transactions.json`
    return this.fetchAndParse(url)
  }

  async setLastId(token: string, transactionId: string): Promise<void> {
    const url = `${FIO_BASE}/set-last-id/${token}/${transactionId}/`
    try {
      await fetch(url)
    } catch (err) {
      this.logger.warn(`Failed to set last ID: ${err}`)
    }
  }

  async verifyToken(token: string): Promise<{ valid: boolean; accountInfo?: Record<string, unknown>; error?: string }> {
    try {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 1)
      const dateFrom = from.toISOString().split('T')[0]
      const dateTo = to.toISOString().split('T')[0]
      const url = `${FIO_BASE}/periods/${token}/${dateFrom}/${dateTo}/transactions.json`

      const res = await fetch(url)
      if (!res.ok) {
        const text = await res.text()
        return { valid: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` }
      }

      const data = await res.json()
      const info = data?.accountStatement?.info
      return { valid: true, accountInfo: info ?? {} }
    } catch (err: any) {
      return { valid: false, error: err.message }
    }
  }

  private async fetchAndParse(url: string): Promise<NormalizedTransaction[]> {
    const res = await fetch(url)

    if (res.status === 409) {
      this.logger.warn('Fio API rate limit (409) — retry later')
      return []
    }

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Fio API error ${res.status}: ${text.slice(0, 200)}`)
    }

    const data = await res.json()
    const transactions = data?.accountStatement?.transactionList?.transaction

    if (!transactions || !Array.isArray(transactions)) {
      return []
    }

    return transactions.map((raw: any) => this.mapTransaction(raw))
  }

  private mapTransaction(raw: any): NormalizedTransaction {
    const amount = Number(raw.column1?.value ?? 0)
    return {
      externalId: String(raw.column22?.value ?? ''),
      date: new Date(raw.column0?.value),
      amount: Math.abs(amount),
      currency: raw.column14?.value || 'CZK',
      counterAccount: raw.column2?.value || null,
      counterBankCode: String(raw.column3?.value ?? ''),
      counterAccountName: raw.column10?.value || null,
      variableSymbol: String(raw.column5?.value ?? ''),
      constantSymbol: String(raw.column4?.value ?? ''),
      specificSymbol: String(raw.column6?.value ?? ''),
      description: raw.column16?.value || raw.column25?.value || null,
      type: amount >= 0 ? 'credit' : 'debit',
    }
  }
}
