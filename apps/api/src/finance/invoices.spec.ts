import { createTestApp, closeTestApp, authRequest, TestApp } from '../test/test.helpers'

describe('Invoices (e2e)', () => {
  let testApp: TestApp
  let invoiceId: string

  beforeAll(async () => {
    testApp = await createTestApp()
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('POST /api/v1/finance/invoices', () => {
    it('creates an invoice', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/finance/invoices', {
          number: `FV-TEST-${Date.now()}`,
          type: 'received',
          issueDate: new Date().toISOString(),
          amountTotal: 12500,
        })
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body.number).toContain('FV-TEST')
      expect(res.body.isPaid).toBe(false)
      invoiceId = res.body.id
    })

    it('rejects invoice without required number', async () => {
      const api = authRequest(testApp.server, testApp.token)
      await api
        .post('/api/v1/finance/invoices', {
          type: 'received',
          issueDate: new Date().toISOString(),
        })
        .expect(400)
    })
  })

  describe('GET /api/v1/finance/invoices', () => {
    it('lists invoices with pagination', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .get('/api/v1/finance/invoices?page=1&limit=10')
        .expect(200)

      expect(res.body).toHaveProperty('data')
      expect(res.body).toHaveProperty('total')
      expect(res.body).toHaveProperty('totalPages')
      expect(Array.isArray(res.body.data)).toBe(true)
    })

    it('filters invoices by type', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .get('/api/v1/finance/invoices?type=received')
        .expect(200)

      expect(res.body.data.every((i: any) => i.type === 'received')).toBe(true)
    })
  })

  describe('GET /api/v1/finance/invoices/stats', () => {
    it('returns invoice statistics', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .get('/api/v1/finance/invoices/stats')
        .expect(200)

      expect(res.body).toHaveProperty('total')
      expect(res.body).toHaveProperty('unpaid')
      expect(res.body).toHaveProperty('overdue')
    })
  })

  describe('POST /api/v1/finance/invoices/:id/mark-paid', () => {
    it('marks approved invoice as paid', async () => {
      const api = authRequest(testApp.server, testApp.token)
      // Must go through approval workflow: draft → submitted → approved
      await api.post(`/api/v1/finance/invoices/${invoiceId}/submit`).expect(201)
      await api.post(`/api/v1/finance/invoices/${invoiceId}/approve`).expect(201)

      const res = await api
        .post(`/api/v1/finance/invoices/${invoiceId}/mark-paid`, {
          paidAt: new Date().toISOString(),
        })
        .expect(201)

      expect(res.body.isPaid).toBe(true)
    })

    it('returns 404 for nonexistent invoice', async () => {
      const api = authRequest(testApp.server, testApp.token)
      await api
        .post('/api/v1/finance/invoices/00000000-0000-0000-0000-000000000000/mark-paid', {
          paidAt: new Date().toISOString(),
        })
        .expect(404)
    })
  })

  describe('DELETE /api/v1/finance/invoices/:id', () => {
    it('soft-deletes invoice', async () => {
      const api = authRequest(testApp.server, testApp.token)
      // Create a fresh invoice to delete
      const createRes = await api
        .post('/api/v1/finance/invoices', {
          number: `FV-DEL-${Date.now()}`,
          type: 'received',
          issueDate: new Date().toISOString(),
          amountTotal: 100,
        })
        .expect(201)

      await api
        .delete(`/api/v1/finance/invoices/${createRes.body.id}`)
        .expect(204)
    })
  })
})
