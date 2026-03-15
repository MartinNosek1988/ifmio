import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Mio Webhooks (e2e)', () => {
  let testApp: TestApp
  let webhookId: string

  beforeAll(async () => {
    testApp = await createTestApp()
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  }, 15_000)

  it('GET /mio/webhooks/event-types returns valid event types', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get('/api/v1/mio/webhooks/event-types').expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(5)
    expect(res.body).toContain('mio.finding.created')
    expect(res.body).toContain('mio.finding.resolved')
    expect(res.body).toContain('mio.digest.sent')
    expect(res.body).toContain('mio.test')
  })

  it('POST /mio/webhooks creates subscription', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.post('/api/v1/mio/webhooks', {
      name: 'Test Webhook',
      endpointUrl: 'https://example.com/webhook',
      eventTypes: ['mio.finding.created', 'mio.finding.resolved'],
    }).expect(201)

    expect(res.body.name).toBe('Test Webhook')
    expect(res.body.endpointUrl).toBe('https://example.com/webhook')
    expect(res.body.eventTypes).toContain('mio.finding.created')
    expect(res.body.secret).toBeDefined()
    expect(res.body.isEnabled).toBe(true)
    webhookId = res.body.id
  })

  it('GET /mio/webhooks lists subscriptions', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get('/api/v1/mio/webhooks').expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
    const wh = res.body.find((w: any) => w.id === webhookId)
    expect(wh).toBeDefined()
  })

  it('PUT /mio/webhooks/:id updates subscription', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.put(`/api/v1/mio/webhooks/${webhookId}`, {
      name: 'Updated Webhook',
      minSeverity: 'warning',
    }).expect(200)

    expect(res.body.name).toBe('Updated Webhook')
    expect(res.body.minSeverity).toBe('warning')
  })

  it('PUT /mio/webhooks/:id can disable', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.put(`/api/v1/mio/webhooks/${webhookId}`, {
      isEnabled: false,
    }).expect(200)

    expect(res.body.isEnabled).toBe(false)

    // Re-enable for further tests
    await api.put(`/api/v1/mio/webhooks/${webhookId}`, { isEnabled: true }).expect(200)
  })

  it('POST /mio/webhooks/:id/test sends test event', async () => {
    const api = authRequest(testApp.server, testApp.token)
    // Test will fail (endpoint doesn't exist) but should return delivery result
    const res = await api.post(`/api/v1/mio/webhooks/${webhookId}/test`).expect(201)

    expect(res.body).toHaveProperty('status')
    // Status will be 'failed' since example.com won't accept our webhook
    expect(['sent', 'failed']).toContain(res.body.status)
  })

  it('GET /mio/webhooks/:id/deliveries returns delivery logs', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get(`/api/v1/mio/webhooks/${webhookId}/deliveries`).expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    // Should have at least the test delivery
    expect(res.body.length).toBeGreaterThanOrEqual(1)
    expect(res.body[0]).toHaveProperty('eventType')
    expect(res.body[0]).toHaveProperty('status')
    expect(res.body[0].eventType).toBe('mio.test')
  })

  it('POST /mio/webhooks rejects invalid URL', async () => {
    const api = authRequest(testApp.server, testApp.token)
    await api.post('/api/v1/mio/webhooks', {
      name: 'Bad URL',
      endpointUrl: 'not-a-url',
      eventTypes: ['mio.finding.created'],
    }).expect(400)
  })

  it('POST /mio/webhooks rejects invalid event types', async () => {
    const api = authRequest(testApp.server, testApp.token)
    await api.post('/api/v1/mio/webhooks', {
      name: 'Bad Events',
      endpointUrl: 'https://example.com/wh',
      eventTypes: ['invalid.event'],
    }).expect(400)
  })

  it('POST /mio/webhooks rejects empty event types', async () => {
    const api = authRequest(testApp.server, testApp.token)
    await api.post('/api/v1/mio/webhooks', {
      name: 'No Events',
      endpointUrl: 'https://example.com/wh',
      eventTypes: [],
    }).expect(400)
  })

  it('DELETE /mio/webhooks/:id removes subscription', async () => {
    const api = authRequest(testApp.server, testApp.token)
    await api.delete(`/api/v1/mio/webhooks/${webhookId}`).expect(200)

    const list = await api.get('/api/v1/mio/webhooks').expect(200)
    expect(list.body.find((w: any) => w.id === webhookId)).toBeUndefined()
  })
})
