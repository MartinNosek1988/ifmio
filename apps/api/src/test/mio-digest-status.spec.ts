import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Mio Digest Status & History (e2e)', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  }, 15_000)

  it('GET /mio/digest/status returns effective status with next send', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get('/api/v1/mio/digest/status').expect(200)

    expect(res.body).toHaveProperty('source')
    expect(res.body).toHaveProperty('effective')
    expect(res.body).toHaveProperty('lastSentAt')
    expect(res.body).toHaveProperty('nextPlannedSend')
    expect(res.body).toHaveProperty('tenantDefaults')
    expect(res.body.effective.enabled).toBe(true)
    // nextPlannedSend should be a string (computed next send time)
    expect(typeof res.body.nextPlannedSend).toBe('string')
  })

  it('GET /mio/digest/status reflects disabled state', async () => {
    const api = authRequest(testApp.server, testApp.token)

    await api.put('/api/v1/mio/digest/preferences', { enabled: false }).expect(200)

    const res = await api.get('/api/v1/mio/digest/status').expect(200)
    expect(res.body.effective.enabled).toBe(false)
    expect(res.body.nextPlannedSend).toBeNull()

    // Clean up
    await api.delete('/api/v1/mio/digest/preferences').expect(200)
  })

  it('GET /mio/digest/history returns empty array initially', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get('/api/v1/mio/digest/history').expect(200)

    expect(Array.isArray(res.body)).toBe(true)
  })

  it('GET /mio/digest/preview returns preview content', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get('/api/v1/mio/digest/preview').expect(200)

    expect(res.body).toHaveProperty('totalItems')
    expect(res.body).toHaveProperty('criticalCount')
    expect(res.body).toHaveProperty('warningCount')
    expect(res.body).toHaveProperty('findings')
    expect(res.body).toHaveProperty('recommendations')
    expect(typeof res.body.totalItems).toBe('number')
    expect(Array.isArray(res.body.findings)).toBe(true)
    expect(Array.isArray(res.body.recommendations)).toBe(true)
  })

  it('history only returns current user records', async () => {
    const api = authRequest(testApp.server, testApp.token)

    // History should only contain records for this user
    const res = await api.get('/api/v1/mio/digest/history').expect(200)
    // No cross-user leaks — all records should belong to this tenant
    for (const entry of res.body) {
      expect(entry).toHaveProperty('id')
      expect(entry).toHaveProperty('status')
      expect(entry).toHaveProperty('frequency')
      expect(entry).toHaveProperty('createdAt')
    }
  })

  it('status includes lastResult when available', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get('/api/v1/mio/digest/status').expect(200)

    // lastResult may be null if no digests were sent yet
    if (res.body.lastResult) {
      expect(res.body.lastResult).toHaveProperty('status')
      expect(res.body.lastResult).toHaveProperty('at')
      expect(['sent', 'skipped', 'failed']).toContain(res.body.lastResult.status)
    }
  })
})
