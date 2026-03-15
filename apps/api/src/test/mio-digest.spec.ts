import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Mio Digest (e2e)', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  }, 15_000)

  it('config includes digest defaults', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get('/api/v1/mio/config').expect(200)

    expect(res.body.digest).toBeDefined()
    expect(res.body.digest.enabled).toBe(true)
    expect(res.body.digest.includeFindings).toBe(true)
    expect(res.body.digest.includeRecommendations).toBe(true)
    expect(res.body.digest.defaultFrequency).toBe('daily')
    expect(res.body.digest.minSeverity).toBe('info')
  })

  it('config meta includes digest metadata', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get('/api/v1/mio/config/meta').expect(200)

    expect(res.body.digest).toBeDefined()
    expect(res.body.digest.enabled).toHaveProperty('label')
    expect(res.body.digest.enabled).toHaveProperty('description')
    expect(res.body.digest.includeFindings).toHaveProperty('label')
    expect(res.body.digest.defaultFrequency).toHaveProperty('label')
    expect(res.body.digest.minSeverity).toHaveProperty('label')
  })

  it('config defaults include digest', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get('/api/v1/mio/config/defaults').expect(200)

    expect(res.body.digest.enabled).toBe(true)
    expect(res.body.digest.defaultFrequency).toBe('daily')
    expect(res.body.digest.minSeverity).toBe('info')
  })

  it('digest preferences can be updated via config', async () => {
    const api = authRequest(testApp.server, testApp.token)

    const res = await api.put('/api/v1/mio/config', {
      digest: {
        enabled: false,
        includeRecommendations: false,
        minSeverity: 'warning',
      },
    }).expect(200)

    expect(res.body.digest.enabled).toBe(false)
    expect(res.body.digest.includeRecommendations).toBe(false)
    expect(res.body.digest.includeFindings).toBe(true) // untouched
    expect(res.body.digest.minSeverity).toBe('warning')
    expect(res.body.digest.defaultFrequency).toBe('daily') // untouched
  })

  it('digest section can be reset independently', async () => {
    const api = authRequest(testApp.server, testApp.token)

    // First customize
    await api.put('/api/v1/mio/config', {
      digest: { enabled: false, defaultFrequency: 'weekly' },
      enabledFindings: { overdue_revision: false },
    }).expect(200)

    // Reset only digest
    const res = await api.post('/api/v1/mio/config/reset', { section: 'digest' }).expect(201)
    expect(res.body.digest.enabled).toBe(true) // reset
    expect(res.body.digest.defaultFrequency).toBe('daily') // reset
    expect(res.body.enabledFindings.overdue_revision).toBe(false) // untouched
  })

  it('full reset also resets digest', async () => {
    const api = authRequest(testApp.server, testApp.token)

    await api.put('/api/v1/mio/config', {
      digest: { enabled: false, minSeverity: 'critical' },
    }).expect(200)

    const res = await api.post('/api/v1/mio/config/reset', {}).expect(201)
    expect(res.body.digest.enabled).toBe(true)
    expect(res.body.digest.minSeverity).toBe('info')
  })

  it('mio_digest subscription can be created via reports API', async () => {
    const api = authRequest(testApp.server, testApp.token)

    const res = await api.post('/api/v1/reports/subscriptions', {
      reportType: 'mio_digest',
      frequency: 'weekly',
      format: 'email_only',
    }).expect(201)

    expect(res.body.reportType).toBe('mio_digest')
    expect(res.body.frequency).toBe('weekly')

    // List subscriptions should include it
    const list = await api.get('/api/v1/reports/subscriptions').expect(200)
    const mioSub = list.body.find((s: any) => s.reportType === 'mio_digest')
    expect(mioSub).toBeDefined()
    expect(mioSub.frequency).toBe('weekly')
  })

  // Note: manual digest send test skipped — it processes all tenants in shared DB
  // and times out. Tested manually via POST /mio/digest/send.
})
