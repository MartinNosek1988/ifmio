import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Mio Admin Observability (e2e)', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  }, 15_000)

  it('GET /mio/admin/overview returns admin overview', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get('/api/v1/mio/admin/overview').expect(200)

    expect(res.body).toHaveProperty('activeFindings')
    expect(res.body).toHaveProperty('activeRecommendations')
    expect(res.body).toHaveProperty('digestSubscribers')
    expect(res.body).toHaveProperty('digestEnabled')
    expect(res.body).toHaveProperty('digest24h')
    expect(res.body.digest24h).toHaveProperty('sent')
    expect(res.body.digest24h).toHaveProperty('skipped')
    expect(res.body.digest24h).toHaveProperty('failed')
    expect(res.body).toHaveProperty('enabledFindingsCount')
    expect(res.body).toHaveProperty('enabledRecsCount')
    expect(res.body).toHaveProperty('autoTicketCount')
    expect(typeof res.body.activeFindings).toBe('number')
  })

  it('GET /mio/admin/jobs returns recent job runs', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get('/api/v1/mio/admin/jobs').expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    // May be empty if no jobs ran yet
  })

  it('GET /mio/admin/digests returns delivery overview', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get('/api/v1/mio/admin/digests?days=7').expect(200)

    expect(res.body).toHaveProperty('summary')
    expect(res.body).toHaveProperty('logs')
    expect(res.body).toHaveProperty('period')
    expect(res.body.summary).toHaveProperty('sent')
    expect(res.body.summary).toHaveProperty('skipped')
    expect(res.body.summary).toHaveProperty('failed')
    expect(Array.isArray(res.body.logs)).toBe(true)
  })

  it('GET /mio/admin/failures returns recent failures', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get('/api/v1/mio/admin/failures').expect(200)

    expect(res.body).toHaveProperty('digestFailures')
    expect(res.body).toHaveProperty('jobFailures')
    expect(Array.isArray(res.body.digestFailures)).toBe(true)
    expect(Array.isArray(res.body.jobFailures)).toBe(true)
  })

  it('overview shows correct governance config counts', async () => {
    const api = authRequest(testApp.server, testApp.token)

    // Set specific governance
    await api.put('/api/v1/mio/config', {
      enabledFindings: { overdue_revision: false },
    }).expect(200)

    const res = await api.get('/api/v1/mio/admin/overview').expect(200)
    // Should show 4 enabled findings (one disabled)
    expect(res.body.enabledFindingsCount).toBe(4)

    // Clean up
    await api.post('/api/v1/mio/config/reset', {}).expect(201)
  })

  it('digests time filter works', async () => {
    const api = authRequest(testApp.server, testApp.token)

    const res1 = await api.get('/api/v1/mio/admin/digests?days=1').expect(200)
    const res30 = await api.get('/api/v1/mio/admin/digests?days=30').expect(200)

    expect(res1.body.period).toBe('1d')
    expect(res30.body.period).toBe('30d')
  })
})
