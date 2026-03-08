import { createTestApp, closeTestApp, authRequest, TestApp } from '../test/test.helpers'

describe('Finance (e2e)', () => {
  let testApp: TestApp
  let bankAccountId: string

  beforeAll(async () => {
    testApp = await createTestApp()
  })

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('Bank Accounts', () => {
    it('creates a bank account', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/finance/bank-accounts', {
          name: 'Hlavní účet',
          accountNumber: '123456789/0800',
          currency: 'CZK',
        })
        .expect(201)

      expect(res.body).toMatchObject({ name: 'Hlavní účet' })
      bankAccountId = res.body.id
    })

    it('lists bank accounts', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/finance/bank-accounts').expect(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  describe('Transactions', () => {
    it('creates a transaction', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/finance/transactions', {
          bankAccountId,
          date: new Date().toISOString(),
          amount: 15000,
          type: 'credit',
        })
        .expect(201)

      expect(Number(res.body.amount)).toBe(15000)
      expect(res.body.status).toBe('unmatched')
    })

    it('lists transactions with pagination', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .get('/api/v1/finance/transactions?page=1&limit=10')
        .expect(200)

      expect(res.body).toHaveProperty('data')
      expect(res.body).toHaveProperty('total')
    })
  })

  describe('Finance Summary', () => {
    it('returns financial overview', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/finance/summary').expect(200)
      expect(res.body).toHaveProperty('totalTransactions')
      expect(res.body).toHaveProperty('totalVolume')
      expect(res.body).toHaveProperty('unmatchedCount')
    })
  })
})
