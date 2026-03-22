import { describe, it, expect } from 'vitest'
import { mapAccount, mapTransaction, mapPrescription } from '../finance.mappers'
import type { ApiBankAccount, ApiBankTransaction, ApiPrescription } from '../finance.api'

describe('Finance mappers', () => {
  describe('mapAccount', () => {
    it('maps ApiBankAccount to FinAccount', () => {
      const api: ApiBankAccount = {
        id: '1',
        tenantId: 't1',
        name: 'Hlavní účet',
        accountNumber: '123456/0800',
        currency: 'CZK',
        isActive: true,
        isDefault: false,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }
      const result = mapAccount(api)
      expect(result.id).toBe('1')
      expect(result.nazev).toBe('Hlavní účet')
      expect(result.cislo).toBe('123456/0800')
      expect(result.typ).toBe('banka')
    })
  })

  describe('mapTransaction', () => {
    it('maps credit transaction', () => {
      const api: ApiBankTransaction = {
        id: 'tx1',
        tenantId: 't1',
        bankAccountId: 'ba1',
        amount: 15000,
        type: 'credit',
        status: 'unmatched',
        date: '2025-01-15',
        counterparty: 'Jan Novák',
        variableSymbol: '1234567890',
        description: 'Nájem leden',
        createdAt: '2025-01-15',
        updatedAt: '2025-01-15',
      }
      const result = mapTransaction(api)
      expect(result.typ).toBe('prijem')
      expect(result.castka).toBe(15000)
      expect(result.vs).toBe('1234567890')
      expect(result.protiUcet).toBe('Jan Novák')
      expect(result.parovani).toEqual([])
    })

    it('maps matched debit transaction', () => {
      const api: ApiBankTransaction = {
        id: 'tx2',
        tenantId: 't1',
        bankAccountId: 'ba1',
        amount: 5000,
        type: 'debit',
        status: 'matched',
        date: '2025-01-20',
        createdAt: '2025-01-20',
        updatedAt: '2025-01-20',
      }
      const result = mapTransaction(api)
      expect(result.typ).toBe('vydej')
      expect(result.parovani).toEqual(['matched'])
    })
  })

  describe('mapPrescription', () => {
    it('maps ApiPrescription to FinPrescription', () => {
      const api: ApiPrescription = {
        id: 'p1',
        tenantId: 't1',
        propertyId: 'prop1',
        type: 'rent',
        status: 'active',
        amount: 12000,
        vatAmount: 0,
        dueDay: 15,
        description: 'Nájem',
        validFrom: '2025-01-01',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        items: [],
      }
      const result = mapPrescription(api)
      expect(result.id).toBe('p1')
      expect(result.castka).toBe(12000)
      expect(result.popis).toBe('Nájem')
      expect(result.typ).toBe('rent')
    })
  })
})
