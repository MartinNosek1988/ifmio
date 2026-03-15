import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Mio Webhook Polish (e2e)', () => {
  let testApp: TestApp
  let webhookId: string

  beforeAll(async () => {
    testApp = await createTestApp()
    // Create a webhook for testing
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.post('/api/v1/mio/webhooks', {
      name: 'Polish Test',
      endpointUrl: 'https://example.com/test-webhook',
      eventTypes: ['mio.finding.created', 'mio.digest.sent', 'mio.digest.failed'],
    }).expect(201)
    webhookId = res.body.id
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  }, 15_000)

  it('list subscriptions hides full secret', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get('/api/v1/mio/webhooks').expect(200)

    const wh = res.body.find((w: any) => w.id === webhookId)
    expect(wh).toBeDefined()
    expect(wh.secretMasked).toBeDefined()
    expect(wh.secretMasked).toContain('••••••••')
    // Full secret should not be in list
    expect(wh.secret).toBeUndefined()
  })

  it('GET /webhooks/:id/detail reveals full secret', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get(`/api/v1/mio/webhooks/${webhookId}/detail`).expect(200)

    expect(res.body.secret).toBeDefined()
    expect(res.body.secret.length).toBeGreaterThan(30)
  })

  it('POST /webhooks/:id/rotate-secret generates new secret', async () => {
    const api = authRequest(testApp.server, testApp.token)

    // Get current secret
    const before = await api.get(`/api/v1/mio/webhooks/${webhookId}/detail`).expect(200)
    const oldSecret = before.body.secret

    // Rotate
    const res = await api.post(`/api/v1/mio/webhooks/${webhookId}/rotate-secret`).expect(201)
    expect(res.body.secret).toBeDefined()
    expect(res.body.secret).not.toBe(oldSecret)

    // Verify persisted
    const after = await api.get(`/api/v1/mio/webhooks/${webhookId}/detail`).expect(200)
    expect(after.body.secret).toBe(res.body.secret)
  })

  it('delivery logs support status filter', async () => {
    const api = authRequest(testApp.server, testApp.token)

    // Send test to generate a delivery
    await api.post(`/api/v1/mio/webhooks/${webhookId}/test`).expect(201)

    // Filter by failed (test will fail since endpoint doesn't exist)
    const res = await api.get(`/api/v1/mio/webhooks/${webhookId}/deliveries?status=failed`).expect(200)
    expect(Array.isArray(res.body)).toBe(true)
    for (const d of res.body) {
      expect(d.status).toBe('failed')
    }
  })

  it('delivery logs support event type filter', async () => {
    const api = authRequest(testApp.server, testApp.token)

    const res = await api.get(`/api/v1/mio/webhooks/${webhookId}/deliveries?eventType=mio.test`).expect(200)
    expect(Array.isArray(res.body)).toBe(true)
    for (const d of res.body) {
      expect(d.eventType).toBe('mio.test')
    }
  })

  it('digest events are in valid event types', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get('/api/v1/mio/webhooks/event-types').expect(200)

    expect(res.body).toContain('mio.digest.sent')
    expect(res.body).toContain('mio.digest.failed')
  })

  it('webhook can subscribe to digest events', async () => {
    const api = authRequest(testApp.server, testApp.token)

    const res = await api.put(`/api/v1/mio/webhooks/${webhookId}`, {
      eventTypes: ['mio.digest.sent', 'mio.digest.failed'],
    }).expect(200)

    expect(res.body.eventTypes).toContain('mio.digest.sent')
    expect(res.body.eventTypes).toContain('mio.digest.failed')
  })

  it('cleanup: delete test webhook', async () => {
    const api = authRequest(testApp.server, testApp.token)
    await api.delete(`/api/v1/mio/webhooks/${webhookId}`).expect(200)
  })
})
