import {
  createTestApp,
  closeTestApp,
  authRequest,
  TestApp,
} from './test.helpers'

describe('Financial Calculations (e2e)', () => {
  let testApp: TestApp
  let api: ReturnType<typeof authRequest>
  let propertyId: string
  let unitId: string

  beforeAll(async () => {
    testApp = await createTestApp()
    api = authRequest(testApp.server, testApp.token)

    const propRes = await api
      .post('/api/v1/properties', {
        name: `FinCalc Test ${Date.now()}`,
        address: 'Výpočtová 1',
        city: 'Praha',
        postalCode: '110 00',
        type: 'bytdum',
        ownership: 'vlastnictvi',
      })
      .expect(201)
    propertyId = propRes.body.id

    const unitRes = await api
      .post(`/api/v1/properties/${propertyId}/units`, {
        name: `Byt Calc ${Date.now()}`,
        area: 50,
        commonAreaShare: 0.1,
      })
      .expect(201)
    unitId = unitRes.body.id
  }, 30_000)

  afterAll(async () => {
    if (propertyId) await api.delete(`/api/v1/properties/${propertyId}`)
    await closeTestApp(testApp)
  })

  // ── Faktura — VAT výpočty ──

  describe('Invoice VAT výpočty', () => {
    it('faktura s 21% DPH → správný vatAmount', async () => {
      const res = await api
        .post('/api/v1/finance/invoices', {
          number: `CALC-VAT-${Date.now()}`,
          type: 'received',
          supplierName: 'Calc Dodavatel',
          amountBase: 10000,
          vatRate: 21,
          vatAmount: 2100,
          amountTotal: 12100,
          issueDate: '2026-03-01',
          dueDate: '2026-04-01',
          propertyId,
        })
        .expect(201)

      expect(Number(res.body.amountBase)).toBe(10000)
      expect(Number(res.body.vatRate)).toBe(21)
      expect(Number(res.body.vatAmount)).toBe(2100)
      expect(Number(res.body.amountTotal)).toBe(12100)
      await api.delete(`/api/v1/finance/invoices/${res.body.id}`)
    })

    it('faktura s 0% DPH → vatAmount = 0', async () => {
      const res = await api
        .post('/api/v1/finance/invoices', {
          number: `CALC-NOVAT-${Date.now()}`,
          type: 'received',
          supplierName: 'No VAT Dodavatel',
          amountBase: 5000,
          vatRate: 0,
          vatAmount: 0,
          amountTotal: 5000,
          issueDate: '2026-03-01',
          dueDate: '2026-04-01',
          propertyId,
        })
        .expect(201)

      expect(Number(res.body.vatAmount)).toBe(0)
      expect(Number(res.body.amountTotal)).toBe(5000)
      await api.delete(`/api/v1/finance/invoices/${res.body.id}`)
    })
  })

  // ── Alokace — součet musí sedět ──

  describe('Invoice alokace — součet částek', () => {
    let invoiceId: string

    beforeAll(async () => {
      const res = await api
        .post('/api/v1/finance/invoices', {
          number: `CALC-ALLOC-${Date.now()}`,
          type: 'received',
          supplierName: 'Alokační Dodavatel',
          amountTotal: 10000,
          issueDate: '2026-01-01',
          dueDate: '2026-02-01',
          propertyId,
        })
        .expect(201)
      invoiceId = res.body.id
    })

    afterAll(async () => {
      if (invoiceId) await api.delete(`/api/v1/finance/invoices/${invoiceId}`)
    })

    it('dvě alokace pokryjí celkovou částku', async () => {
      const alloc1 = await api
        .post(`/api/v1/finance/invoices/${invoiceId}/allocations`, {
          amount: 6000,
          year: 2026,
          periodFrom: '2026-01-01',
          periodTo: '2026-06-30',
        })
        .expect(201)

      const alloc2 = await api
        .post(`/api/v1/finance/invoices/${invoiceId}/allocations`, {
          amount: 4000,
          year: 2026,
          periodFrom: '2026-07-01',
          periodTo: '2026-12-31',
        })
        .expect(201)

      // Součet alokací = 10000 (celková částka faktury)
      expect(Number(alloc1.body.amount) + Number(alloc2.body.amount)).toBe(10000)
    })
  })

  // ── Billing period ──

  describe('Billing period správné datumy', () => {
    it('vytvoření období 2026 → dateFrom < dateTo', async () => {
      const res = await api
        .post('/api/v1/finance/billing-periods', {
          name: 'Rok 2026',
          dateFrom: '2026-01-01',
          dateTo: '2026-12-31',
          propertyId,
        })
        .expect(201)

      const from = new Date(res.body.dateFrom)
      const to = new Date(res.body.dateTo)
      expect(from.getTime()).toBeLessThan(to.getTime())
    })
  })

  // ── Předpisy — vytvoření a ověření ──

  describe('Předpisy plateb', () => {
    it('GET /finance/prescriptions vrátí seznam', async () => {
      const res = await api
        .get('/api/v1/finance/prescriptions')
        .expect(200)
      expect(res.body).toBeDefined()
    })
  })

  // ── Párování transakcí ──

  describe('Párování transakcí', () => {
    let bankAccountId: string

    beforeAll(async () => {
      const res = await api
        .post('/api/v1/finance/bank-accounts', {
          name: `Calc Bank ${Date.now()}`,
          accountNumber: `${Date.now()}`.slice(-10),
          bankCode: '0100',
          propertyId,
        })
        .expect(201)
      bankAccountId = res.body.id
    })

    afterAll(async () => {
      if (bankAccountId)
        await api.delete(`/api/v1/finance/bank-accounts/${bankAccountId}`)
    })

    it('manuální transakce → status unmatched', async () => {
      const res = await api
        .post('/api/v1/finance/transactions', {
          bankAccountId,
          amount: 5000,
          type: 'credit',
          date: '2026-03-15',
          counterparty: 'Jan Novák',
          variableSymbol: '1234567890',
          description: 'Platba předpisu',
        })
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body.status).toBe('unmatched')
    })
  })

  // ── Konto / Ledger (přehled) ──

  describe('Konto přehled', () => {
    it('GET /finance/summary vrátí finanční přehled', async () => {
      const res = await api.get('/api/v1/finance/summary').expect(200)
      expect(res.body).toBeDefined()
    })
  })

  // ── Zaokrouhlování ──

  describe('Zaokrouhlování', () => {
    it('faktura s přesností na haléře', async () => {
      const res = await api
        .post('/api/v1/finance/invoices', {
          number: `ROUND-${Date.now()}`,
          type: 'received',
          supplierName: 'Rounding Test',
          amountBase: 8264.46,
          vatRate: 21,
          vatAmount: 1735.54,
          amountTotal: 10000,
          rounding: 0,
          issueDate: '2026-03-01',
          dueDate: '2026-04-01',
          propertyId,
        })
        .expect(201)

      // Base + VAT = Total (s tolerancí zaokrouhlení)
      const base = Number(res.body.amountBase)
      const vat = Number(res.body.vatAmount)
      const total = Number(res.body.amountTotal)
      expect(Math.abs(base + vat - total)).toBeLessThanOrEqual(1) // Tolerance 1 Kč
      await api.delete(`/api/v1/finance/invoices/${res.body.id}`)
    })
  })
})
