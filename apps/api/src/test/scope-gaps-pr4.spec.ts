import request from 'supertest'
import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

/**
 * PR4 — Scope gap fixes: RemindersService, PdfController, AuditController, ReportsController.
 */
describe('Scope Gaps PR4 (e2e)', () => {
  let testApp: TestApp
  let ownerApi: ReturnType<typeof authRequest>
  let managerApi: ReturnType<typeof authRequest>
  let viewerApi: ReturnType<typeof authRequest>
  let financeApi: ReturnType<typeof authRequest>
  let propertyA: string
  let propertyB: string
  let residentA: string
  let residentB: string
  let ticketA: string
  let ticketB: string

  beforeAll(async () => {
    testApp = await createTestApp()
    ownerApi = authRequest(testApp.server, testApp.token)

    // ─── Create two properties ─────────────────────────────────
    const resA = await ownerApi
      .post('/api/v1/properties', {
        name: 'PR4-A', address: 'A 1', city: 'Praha',
        postalCode: '11000', type: 'bytdum', ownership: 'vlastnictvi',
      })
      .expect(201)
    propertyA = resA.body.id

    const resB = await ownerApi
      .post('/api/v1/properties', {
        name: 'PR4-B', address: 'B 2', city: 'Brno',
        postalCode: '60200', type: 'bytdum', ownership: 'vlastnictvi',
      })
      .expect(201)
    propertyB = resB.body.id

    // ─── Create scoped property_manager (assigned to A) ────────
    const pmEmail = `pm-pr4-${Date.now()}@test.cz`
    const pmInv = await ownerApi
      .post('/api/v1/admin/users', {
        name: 'PR4 PM', email: pmEmail,
        role: 'property_manager', password: 'pmpass12345',
      })
      .expect(201)

    await ownerApi
      .post('/api/v1/admin/property-assignments', {
        userId: pmInv.body.id,
        propertyId: propertyA,
      })
      .expect(201)

    const pmLogin = await request(testApp.server)
      .post('/api/v1/auth/login')
      .send({ email: pmEmail, password: 'pmpass12345' })
      .expect(200)
    managerApi = authRequest(testApp.server, pmLogin.body.accessToken)

    // ─── Create scoped finance_manager (assigned to A) ─────────
    const fmEmail = `fm-pr4-${Date.now()}@test.cz`
    const fmInv = await ownerApi
      .post('/api/v1/admin/users', {
        name: 'PR4 FM', email: fmEmail,
        role: 'finance_manager', password: 'fmpass12345',
      })
      .expect(201)

    await ownerApi
      .post('/api/v1/admin/property-assignments', {
        userId: fmInv.body.id,
        propertyId: propertyA,
      })
      .expect(201)

    const fmLogin = await request(testApp.server)
      .post('/api/v1/auth/login')
      .send({ email: fmEmail, password: 'fmpass12345' })
      .expect(200)
    financeApi = authRequest(testApp.server, fmLogin.body.accessToken)

    // ─── Create viewer (scoped, no assignment) ─────────────────
    const viewerEmail = `viewer-pr4-${Date.now()}@test.cz`
    await ownerApi
      .post('/api/v1/admin/users', {
        name: 'PR4 Viewer', email: viewerEmail,
        role: 'viewer', password: 'viewpass12345',
      })
      .expect(201)

    const viewerLogin = await request(testApp.server)
      .post('/api/v1/auth/login')
      .send({ email: viewerEmail, password: 'viewpass12345' })
      .expect(200)
    viewerApi = authRequest(testApp.server, viewerLogin.body.accessToken)

    // ─── Seed residents on each property ───────────────────────
    const rA = await ownerApi
      .post('/api/v1/residents', {
        firstName: 'DebtorA', lastName: 'TestA',
        role: 'tenant', propertyId: propertyA,
      })
      .expect(201)
    residentA = rA.body.id

    const rB = await ownerApi
      .post('/api/v1/residents', {
        firstName: 'DebtorB', lastName: 'TestB',
        role: 'tenant', propertyId: propertyB,
      })
      .expect(201)
    residentB = rB.body.id

    // Mark both as debtors
    await ownerApi
      .post('/api/v1/residents/bulk/mark-debtors', { ids: [residentA, residentB], hasDebt: true })
      .expect(201)

    // ─── Seed helpdesk tickets on each property ────────────────
    const tA = await ownerApi
      .post('/api/v1/helpdesk', { title: 'Ticket A', propertyId: propertyA })
      .expect(201)
    ticketA = tA.body.id

    const tB = await ownerApi
      .post('/api/v1/helpdesk', { title: 'Ticket B', propertyId: propertyB })
      .expect(201)
    ticketB = tB.body.id

    // ─── Owner creates reminders on both sides ─────────────────
    await ownerApi
      .post('/api/v1/reminders', {
        residentId: residentA, level: 'first', amount: 500, dueDate: '2026-04-01',
      })
      .expect(201)

    await ownerApi
      .post('/api/v1/reminders', {
        residentId: residentB, level: 'first', amount: 2000, dueDate: '2026-04-15',
      })
      .expect(201)
  }, 60_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  // ═══════════════════════════════════════════════════════════════
  // REMINDERS — debtors scoped
  // ═══════════════════════════════════════════════════════════════

  it('scoped manager sees only assigned property debtors', async () => {
    const res = await managerApi.get('/api/v1/reminders/debtors').expect(200)
    const ids = res.body.map((d: any) => d.id)
    expect(ids).toContain(residentA)
    expect(ids).not.toContain(residentB)
  })

  it('tenant_owner sees debtors from all properties', async () => {
    const res = await ownerApi.get('/api/v1/reminders/debtors').expect(200)
    const ids = res.body.map((d: any) => d.id)
    expect(ids).toContain(residentA)
    expect(ids).toContain(residentB)
  })

  // ═══════════════════════════════════════════════════════════════
  // REMINDERS — templates remain tenant-wide
  // ═══════════════════════════════════════════════════════════════

  it('scoped manager can list reminder templates (tenant-wide)', async () => {
    await managerApi.get('/api/v1/reminders/templates').expect(200)
  })

  // ═══════════════════════════════════════════════════════════════
  // REMINDERS — create scoped via resident (finance_manager)
  // ═══════════════════════════════════════════════════════════════

  it('scoped finance_manager cannot create reminder for foreign property resident', async () => {
    await financeApi
      .post('/api/v1/reminders', {
        residentId: residentB, level: 'first', amount: 1000, dueDate: '2026-05-01',
      })
      .expect(403)
  })

  it('scoped finance_manager can create reminder for assigned property resident', async () => {
    await financeApi
      .post('/api/v1/reminders', {
        residentId: residentA, level: 'second', amount: 750, dueDate: '2026-05-01',
      })
      .expect(201)
  })

  // ═══════════════════════════════════════════════════════════════
  // REMINDERS — list scoped via resident relation
  // ═══════════════════════════════════════════════════════════════

  it('scoped manager reminders list excludes foreign property', async () => {
    const res = await managerApi.get('/api/v1/reminders').expect(200)
    const residentIds = res.body.data.map((r: any) => r.residentId)
    expect(residentIds).not.toContain(residentB)
    expect(residentIds).toContain(residentA)
  })

  // ═══════════════════════════════════════════════════════════════
  // PDF — scoped access
  // ═══════════════════════════════════════════════════════════════

  it('scoped manager can download PDF of assigned property ticket', async () => {
    await managerApi
      .get(`/api/v1/pdf/helpdesk/${ticketA}/protocol`)
      .expect(200)
  })

  it('scoped manager cannot download PDF of foreign property ticket', async () => {
    await managerApi
      .get(`/api/v1/pdf/helpdesk/${ticketB}/protocol`)
      .expect(403)
  })

  // ═══════════════════════════════════════════════════════════════
  // AUDIT — only ROLES_MANAGE (owner/admin)
  // ═══════════════════════════════════════════════════════════════

  it('property_manager cannot access audit logs', async () => {
    await managerApi.get('/api/v1/audit').expect(403)
  })

  it('viewer cannot access audit logs', async () => {
    await viewerApi.get('/api/v1/audit').expect(403)
  })

  it('tenant_owner can access audit logs', async () => {
    await ownerApi.get('/api/v1/audit').expect(200)
  })

  // ═══════════════════════════════════════════════════════════════
  // REPORTS — accessible via ROLES_FINANCE_DRAFT constant
  // ═══════════════════════════════════════════════════════════════

  it('property_manager can access monthly report (via ROLES_FINANCE_DRAFT)', async () => {
    await managerApi.get('/api/v1/reports/monthly').expect(200)
  })

  it('viewer cannot access monthly report', async () => {
    await viewerApi.get('/api/v1/reports/monthly').expect(403)
  })

  it('tenant_owner can access monthly report', async () => {
    await ownerApi.get('/api/v1/reports/monthly').expect(200)
  })
})
