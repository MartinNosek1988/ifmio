import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Mio Webhook Ops Polish (e2e)', () => {
  let testApp: TestApp
  let webhookId: string

  beforeAll(async () => {
    testApp = await createTestApp()
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.post('/api/v1/mio/webhooks', {
      name: 'Ops Test',
      endpointUrl: 'https://example.com/ops-test',
      eventTypes: ['mio.finding.created', 'mio.finding.resolved'],
    }).expect(201)
    webhookId = res.body.id
  }, 30_000)

  afterAll(async () => {
    const api = authRequest(testApp.server, testApp.token)
    await api.delete(`/api/v1/mio/webhooks/${webhookId}`).expect(200)
    await closeTestApp(testApp)
  }, 15_000)

  it('outbox summary includes health indicator', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get(`/api/v1/mio/webhooks/${webhookId}/outbox-summary`).expect(200)

    expect(res.body).toHaveProperty('pending')
    expect(res.body).toHaveProperty('processing')
    expect(res.body).toHaveProperty('exhausted')
    expect(res.body).toHaveProperty('lastSuccess')
    expect(res.body).toHaveProperty('lastFailure')
    expect(res.body).toHaveProperty('recentFailed24h')
    expect(res.body).toHaveProperty('health')
    expect(['ok', 'busy', 'warning']).toContain(res.body.health)
  })

  it('outbox items endpoint returns paginated result', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get(`/api/v1/mio/webhooks/${webhookId}/outbox?limit=5&offset=0`).expect(200)

    expect(res.body).toHaveProperty('items')
    expect(res.body).toHaveProperty('total')
    expect(res.body).toHaveProperty('limit')
    expect(res.body).toHaveProperty('offset')
    expect(Array.isArray(res.body.items)).toBe(true)
    expect(typeof res.body.total).toBe('number')
  })

  it('outbox items support status filter', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get(`/api/v1/mio/webhooks/${webhookId}/outbox?status=pending`).expect(200)

    for (const item of res.body.items) {
      expect(item.status).toBe('pending')
    }
  })

  it('outbox items support eventType filter', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get(`/api/v1/mio/webhooks/${webhookId}/outbox?eventType=mio.finding.created`).expect(200)

    for (const item of res.body.items) {
      expect(item.eventType).toBe('mio.finding.created')
    }
  })

  it('manual retry marks item with audit trail', async () => {
    const api = authRequest(testApp.server, testApp.token)

    // Get outbox items
    const outbox = await api.get(`/api/v1/mio/webhooks/${webhookId}/outbox`).expect(200)

    // Find any failed/exhausted item to retry
    const retriable = outbox.body.items.find((i: any) => ['failed', 'exhausted'].includes(i.status))
    if (retriable) {
      const res = await api.post(`/api/v1/mio/webhooks/outbox/${retriable.id}/retry`).expect(201)
      expect(res.body.status).toBe('pending')
      expect(res.body.retryCount).toBe(0)
      expect(res.body.lastError).toBe('Ručně znovu zařazeno')
    }
  })

  it('health is ok for new subscription with no failures', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get(`/api/v1/mio/webhooks/${webhookId}/outbox-summary`).expect(200)
    // New subscription should be healthy
    expect(res.body.health).toBe('ok')
  })
})
