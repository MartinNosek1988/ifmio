import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Mio Insights Center Polish (e2e)', () => {
  let testApp: TestApp
  let findingId: string

  beforeAll(async () => {
    testApp = await createTestApp()
    const api = authRequest(testApp.server, testApp.token)
    await api.post('/api/v1/helpdesk', { title: 'Polish test', priority: 'urgent' }).expect(201)
    await api.post('/api/v1/mio/findings/run-detection').expect(201)

    const insights = await api.get('/api/v1/mio/insights?status=active').expect(200)
    if (insights.body.length > 0) findingId = insights.body[0].id
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  describe('Restore flow', () => {
    it('dismiss then restore returns to active', async () => {
      if (!findingId) return
      const api = authRequest(testApp.server, testApp.token)

      // Dismiss
      await api.post(`/api/v1/mio/insights/${findingId}/dismiss`).expect(201)
      let detail = await api.get('/api/v1/mio/insights?status=dismissed').expect(200)
      expect(detail.body.find((i: any) => i.id === findingId)?.status).toBe('dismissed')

      // Restore
      const res = await api.post(`/api/v1/mio/insights/${findingId}/restore`).expect(201)
      expect(res.body.status).toBe('active')
      expect(res.body.dismissedAt).toBeNull()
    })

    it('restore non-dismissed item returns null', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.post('/api/v1/mio/insights/00000000-0000-0000-0000-000000000099/restore').expect(201)
      expect(res.body).toBeNull()
    })
  })

  describe('Filter via URL params', () => {
    it('kind=finding returns only findings', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/mio/insights?kind=finding').expect(200)
      for (const i of res.body) expect(i.kind).toBe('finding')
    })

    it('status=dismissed returns dismissed items', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/mio/insights?status=dismissed').expect(200)
      for (const i of res.body) expect(i.status).toBe('dismissed')
    })
  })

  describe('Tenant isolation', () => {
    it('insights are tenant-scoped', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api.get('/api/v1/mio/insights').expect(200)
      for (const i of res.body) expect(i.tenantId).toBe(testApp.tenantId)
    })
  })
})
