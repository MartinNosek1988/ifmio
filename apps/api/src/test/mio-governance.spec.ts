import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Mio Governance Config (e2e)', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  it('GET /mio/config returns default config', async () => {
    const api = authRequest(testApp.server, testApp.token)
    const res = await api.get('/api/v1/mio/config').expect(200)

    expect(res.body).toHaveProperty('enabledFindings')
    expect(res.body).toHaveProperty('enabledRecommendations')
    expect(res.body).toHaveProperty('autoTicketPolicy')
    expect(res.body).toHaveProperty('thresholds')
    expect(res.body).toHaveProperty('dashboard')
    expect(res.body.enabledFindings.overdue_revision).toBe(true)
    expect(res.body.dashboard.showFindings).toBe(true)
  })

  it('PUT /mio/config updates and persists config', async () => {
    const api = authRequest(testApp.server, testApp.token)

    const patch = {
      enabledFindings: { overdue_revision: false },
      thresholds: { SECURITY_TIP_MIN_USERS: 10 },
    }

    const res = await api.put('/api/v1/mio/config', patch).expect(200)
    expect(res.body.enabledFindings.overdue_revision).toBe(false)
    expect(res.body.enabledFindings.overdue_work_order).toBe(true)
    expect(res.body.thresholds.SECURITY_TIP_MIN_USERS).toBe(10)
    expect(res.body.thresholds.REPORTING_TIP_MIN_TICKETS).toBe(10)
    expect(res.body.dashboard.showFindings).toBe(true)

    // Re-read to confirm persistence
    const read = await api.get('/api/v1/mio/config').expect(200)
    expect(read.body.enabledFindings.overdue_revision).toBe(false)
    expect(read.body.thresholds.SECURITY_TIP_MIN_USERS).toBe(10)
  })

  it('PUT /mio/config updates dashboard visibility', async () => {
    const api = authRequest(testApp.server, testApp.token)

    const res = await api.put('/api/v1/mio/config', {
      dashboard: { showFindings: false, showMioStrip: false },
    }).expect(200)

    expect(res.body.dashboard.showFindings).toBe(false)
    expect(res.body.dashboard.showMioStrip).toBe(false)
    expect(res.body.dashboard.showRecommendations).toBe(true)
  })

  it('PUT /mio/config updates auto-ticket policy', async () => {
    const api = authRequest(testApp.server, testApp.token)

    const res = await api.put('/api/v1/mio/config', {
      autoTicketPolicy: {
        overdue_revision: false,
        overdue_work_order: true,
      },
    }).expect(200)

    expect(res.body.autoTicketPolicy.overdue_revision).toBe(false)
    expect(res.body.autoTicketPolicy.overdue_work_order).toBe(true)
    expect(res.body.autoTicketPolicy.urgent_ticket_no_assignee).toBe(true)
  })

  it('detection respects disabled findings', async () => {
    const api = authRequest(testApp.server, testApp.token)

    // Disable all findings and recommendations
    await api.put('/api/v1/mio/config', {
      enabledFindings: {
        overdue_recurring_request: false,
        overdue_revision: false,
        overdue_work_order: false,
        urgent_ticket_no_assignee: false,
        asset_no_recurring_plan: false,
      },
      enabledRecommendations: {
        recurring_plans_adoption: false,
        reporting_export_tip: false,
        helpdesk_filtering_tip: false,
        attachments_protocol_tip: false,
        security_access_tip: false,
      },
    }).expect(200)

    // Run detection — should create 0 new findings
    const res = await api.post('/api/v1/mio/findings/run-detection').expect(201)
    expect(res.body.created).toBe(0)
  })
})
