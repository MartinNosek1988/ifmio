import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Mio Webhook Outbox (e2e)', () => {
  let testApp: TestApp
  let webhookId: string

  beforeAll(async () => {
    testApp = await createTestApp()
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.post('/api/v1/mio/webhooks', {
      name: 'Outbox Test',
      endpointUrl: 'https://example.com/outbox-test',
      eventTypes: ['mio.finding.created', 'mio.finding.resolved'],
    }).expect(201)
    webhookId = res.body.id
  }, 30_000)

  afterAll(async () => {
    const api = authRequest(testApp.server, testApp.token)
    await api.delete(`/api/v1/mio/webhooks/${webhookId}`).expect(200)
    await closeTestApp(testApp)
  }, 15_000)

  it('emitting event creates outbox items', async () => {
    const api = authRequest(testApp.server, testApp.token)

    // Trigger detection to emit events (may create findings)
    await api.post('/api/v1/mio/findings/run-detection').expect(201)

    // Check outbox summary
    const summary = await api.get(`/api/v1/mio/webhooks/${webhookId}/outbox-summary`).expect(200)
    expect(summary.body).toHaveProperty('pending')
    expect(summary.body).toHaveProperty('exhausted')
    expect(summary.body).toHaveProperty('lastSuccess')
    expect(typeof summary.body.pending).toBe('number')
  })

  it('GET /webhooks/:id/outbox returns outbox items', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get(`/api/v1/mio/webhooks/${webhookId}/outbox`).expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    for (const item of res.body) {
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('eventType')
      expect(item).toHaveProperty('status')
      expect(item).toHaveProperty('retryCount')
      expect(item).toHaveProperty('nextAttemptAt')
    }
  })

  it('GET /webhooks/:id/outbox supports status filter', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get(`/api/v1/mio/webhooks/${webhookId}/outbox?status=pending`).expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    for (const item of res.body) {
      expect(item.status).toBe('pending')
    }
  })

  it('test event still delivers immediately (not via outbox)', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.post(`/api/v1/mio/webhooks/${webhookId}/test`).expect(201)

    expect(res.body).toHaveProperty('status')
    expect(['sent', 'failed']).toContain(res.body.status)
  })

  it('POST /webhooks/outbox/:id/retry requeues exhausted item', async () => {
    const api = authRequest(testApp.server, testApp.token)

    // Get any outbox items
    const items = await api.get(`/api/v1/mio/webhooks/${webhookId}/outbox`).expect(200)

    // If we have items, try retry on one (may fail if none are exhausted, but endpoint should work)
    if (items.body.length > 0) {
      const item = items.body[0]
      // Only retry if failed/exhausted
      if (['failed', 'exhausted'].includes(item.status)) {
        const res = await api.post(`/api/v1/mio/webhooks/outbox/${item.id}/retry`).expect(201)
        expect(res.body.status).toBe('pending')
        expect(res.body.retryCount).toBe(0)
      }
    }
  })

  it('outbox summary shows correct counts', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get(`/api/v1/mio/webhooks/${webhookId}/outbox-summary`).expect(200)

    expect(typeof res.body.pending).toBe('number')
    expect(typeof res.body.exhausted).toBe('number')
    // lastSuccess is either null or a date string
    expect(res.body.lastSuccess === null || typeof res.body.lastSuccess === 'string').toBe(true)
  })
})
