import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Completion Rules (e2e)', () => {
  let testApp: TestApp
  let woId: string

  beforeAll(async () => {
    testApp = await createTestApp()
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('Completion without requirements', () => {
    it('creates WO and completes without rules', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const wo = await api.post('/api/v1/work-orders', { title: 'No rules WO' }).expect(201)

      await api.put(`/api/v1/work-orders/${wo.body.id}/status`, { status: 'vyresena' }).expect(200)

      const detail = await api.get(`/api/v1/work-orders/${wo.body.id}`).expect(200)
      expect(detail.body.status).toBe('vyresena')
      expect(detail.body.completedAt).toBeTruthy()
    })
  })

  describe('Completion with requireHours', () => {
    beforeAll(async () => {
      const api = authRequest(testApp.server, testApp.token)
      const wo = await api.post('/api/v1/work-orders', { title: 'Hours required WO' }).expect(201)
      woId = wo.body.id
      // Set requireHours flag
      await api.put(`/api/v1/work-orders/${woId}`, { requireHours: true }).expect(200)
    })

    it('blocks completion when actualHours missing', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.put(`/api/v1/work-orders/${woId}/status`, { status: 'vyresena' }).expect(400)

      expect(res.body.violations).toContain('Vyplňte skutečně odpracované hodiny.')
    })

    it('succeeds after adding actualHours', async () => {
      const api = authRequest(testApp.server, testApp.token)
      await api.put(`/api/v1/work-orders/${woId}`, { actualHours: 2.5 }).expect(200)
      await api.put(`/api/v1/work-orders/${woId}/status`, { status: 'vyresena' }).expect(200)
    })
  })

  describe('Completion with requireSummary', () => {
    it('blocks completion when workSummary missing', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const wo = await api.post('/api/v1/work-orders', { title: 'Summary required WO' }).expect(201)
      await api.put(`/api/v1/work-orders/${wo.body.id}`, { requireSummary: true }).expect(200)

      const res = await api.put(`/api/v1/work-orders/${wo.body.id}/status`, { status: 'vyresena' }).expect(400)
      expect(res.body.violations).toContain('Doplňte shrnutí práce.')
    })

    it('succeeds after adding workSummary', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const wo = await api.post('/api/v1/work-orders', { title: 'Summary WO 2' }).expect(201)
      await api.put(`/api/v1/work-orders/${wo.body.id}`, { requireSummary: true, workSummary: 'Opraveno.' }).expect(200)

      await api.put(`/api/v1/work-orders/${wo.body.id}/status`, { status: 'vyresena' }).expect(200)
    })
  })

  describe('Structured handover fields', () => {
    it('persists workSummary, findings, recommendation', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const wo = await api.post('/api/v1/work-orders', { title: 'Handover WO' }).expect(201)

      await api.put(`/api/v1/work-orders/${wo.body.id}`, {
        workSummary: 'Opravena klimatizace.',
        findings: 'Filtr byl zablokovaný.',
        recommendation: 'Výměna filtru za 3 měsíce.',
      }).expect(200)

      const detail = await api.get(`/api/v1/work-orders/${wo.body.id}`).expect(200)
      expect(detail.body.workSummary).toBe('Opravena klimatizace.')
      expect(detail.body.findings).toBe('Filtr byl zablokovaný.')
      expect(detail.body.recommendation).toBe('Výměna filtru za 3 měsíce.')
    })
  })

  describe('Completion status endpoint', () => {
    it('returns completion status with requirements and violations', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const wo = await api.post('/api/v1/work-orders', { title: 'Status check WO' }).expect(201)
      await api.put(`/api/v1/work-orders/${wo.body.id}`, { requireHours: true }).expect(200)

      const res = await api.get(`/api/v1/work-orders/${wo.body.id}/completion-status`).expect(200)

      expect(res.body).toHaveProperty('canComplete')
      expect(res.body).toHaveProperty('violations')
      expect(res.body).toHaveProperty('requirements')
      expect(res.body.canComplete).toBe(false)
      expect(res.body.requirements.requireHours).toBe(true)
      expect(res.body.violations.length).toBeGreaterThan(0)
    })

    it('returns canComplete true when all met', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const wo = await api.post('/api/v1/work-orders', { title: 'All met WO' }).expect(201)

      const res = await api.get(`/api/v1/work-orders/${wo.body.id}/completion-status`).expect(200)
      expect(res.body.canComplete).toBe(true)
      expect(res.body.violations.length).toBe(0)
    })
  })
})
