import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Mio Digest User Preferences (e2e)', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  }, 15_000)

  it('GET /mio/digest/preferences returns tenant defaults when no override', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get('/api/v1/mio/digest/preferences').expect(200)

    expect(res.body.source).toBe('tenant_default')
    expect(res.body.override).toBeNull()
    expect(res.body.effective).toBeDefined()
    expect(res.body.effective.enabled).toBe(true)
    expect(res.body.effective.frequency).toBe('daily')
    expect(res.body.effective.includeFindings).toBe(true)
    expect(res.body.effective.includeRecommendations).toBe(true)
    expect(res.body.effective.minSeverity).toBe('info')
    expect(res.body.tenantDefaults).toBeDefined()
  })

  it('PUT /mio/digest/preferences creates user override', async () => {
    const api = authRequest(testApp.server, testApp.token)

    const res = await api.put('/api/v1/mio/digest/preferences', {
      enabled: true,
      frequency: 'weekly',
      includeRecommendations: false,
      minSeverity: 'warning',
    }).expect(200)

    expect(res.body.source).toBe('user_override')
    expect(res.body.effective.frequency).toBe('weekly')
    expect(res.body.effective.includeRecommendations).toBe(false)
    expect(res.body.effective.includeFindings).toBe(true) // default preserved
    expect(res.body.effective.minSeverity).toBe('warning')
    expect(res.body.tenantDefaults).toBeDefined()
  })

  it('GET /mio/digest/preferences reflects saved override', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get('/api/v1/mio/digest/preferences').expect(200)

    expect(res.body.source).toBe('user_override')
    expect(res.body.effective.frequency).toBe('weekly')
    expect(res.body.effective.includeRecommendations).toBe(false)
  })

  it('PUT /mio/digest/preferences partial update merges correctly', async () => {
    const api = authRequest(testApp.server, testApp.token)

    // Only update minSeverity, keep other overrides
    const res = await api.put('/api/v1/mio/digest/preferences', {
      minSeverity: 'critical',
    }).expect(200)

    expect(res.body.effective.minSeverity).toBe('critical')
    expect(res.body.effective.frequency).toBe('weekly') // preserved from previous
    expect(res.body.effective.includeRecommendations).toBe(false) // preserved
  })

  it('PUT /mio/digest/preferences rejects invalid frequency', async () => {
    const api = authRequest(testApp.server, testApp.token)
    await api.put('/api/v1/mio/digest/preferences', {
      frequency: 'hourly',
    }).expect(400)
  })

  it('PUT /mio/digest/preferences rejects invalid severity', async () => {
    const api = authRequest(testApp.server, testApp.token)
    await api.put('/api/v1/mio/digest/preferences', {
      minSeverity: 'extreme',
    }).expect(400)
  })

  it('DELETE /mio/digest/preferences resets to tenant defaults', async () => {
    const api = authRequest(testApp.server, testApp.token)

    const res = await api.delete('/api/v1/mio/digest/preferences').expect(200)
    expect(res.body.source).toBe('tenant_default')
    expect(res.body.override).toBeNull()
    expect(res.body.effective.frequency).toBe('daily') // back to tenant default

    // Verify persistence
    const read = await api.get('/api/v1/mio/digest/preferences').expect(200)
    expect(read.body.source).toBe('tenant_default')
  })

  it('can disable digest via override', async () => {
    const api = authRequest(testApp.server, testApp.token)

    const res = await api.put('/api/v1/mio/digest/preferences', {
      enabled: false,
    }).expect(200)

    expect(res.body.effective.enabled).toBe(false)
    expect(res.body.source).toBe('user_override')

    // Clean up
    await api.delete('/api/v1/mio/digest/preferences').expect(200)
  })
})
