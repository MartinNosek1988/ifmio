import request from 'supertest'
import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

/**
 * PR2 — Property scope enforcement across all domain services.
 *
 * Setup: two properties (A assigned to scoped manager, B not assigned).
 * Tests verify that the scoped manager can only interact with entities
 * belonging to property A and gets 403 for property B entities.
 */
describe('Domain-wide Property Scope (e2e)', () => {
  let testApp: TestApp
  let ownerApi: ReturnType<typeof authRequest>
  let managerApi: ReturnType<typeof authRequest>
  let propertyA: string
  let propertyB: string

  // entity IDs created under property B (inaccessible to manager)
  let residentB: string
  let ticketB: string
  let workOrderB: string
  let meterB: string
  let contractB: string
  let eventB: string
  let bankAccountB: string
  let prescriptionB: string
  let invoiceB: string

  // entity IDs created under property A (accessible to manager)
  let residentA: string
  let bankAccountA: string
  let prescriptionA: string

  beforeAll(async () => {
    testApp = await createTestApp()
    ownerApi = authRequest(testApp.server, testApp.token)

    // ─── Create two properties ─────────────────────────────────
    const resA = await ownerApi
      .post('/api/v1/properties', {
        name: 'Scope A', address: 'A 1', city: 'Praha',
        postalCode: '11000', type: 'SVJ', ownership: 'vlastnictvi',
      })
      .expect(201)
    propertyA = resA.body.id

    const resB = await ownerApi
      .post('/api/v1/properties', {
        name: 'Scope B', address: 'B 2', city: 'Brno',
        postalCode: '60200', type: 'SVJ', ownership: 'vlastnictvi',
      })
      .expect(201)
    propertyB = resB.body.id

    // ─── Create scoped property_manager ────────────────────────
    const pmEmail = `pm-scope${Date.now()}@test.cz`
    const inviteRes = await ownerApi
      .post('/api/v1/admin/users', {
        name: 'Scoped PM', email: pmEmail,
        role: 'property_manager', password: 'pmpass12345',
      })
      .expect(201)

    await ownerApi
      .post('/api/v1/admin/property-assignments', {
        userId: inviteRes.body.id,
        propertyId: propertyA,
      })
      .expect(201)

    const loginRes = await request(testApp.server)
      .post('/api/v1/auth/login')
      .send({ email: pmEmail, password: 'pmpass12345' })
      .expect(200)
    managerApi = authRequest(testApp.server, loginRes.body.accessToken)

    // ─── Seed entities under property A ────────────────────────
    const rA = await ownerApi
      .post('/api/v1/residents', {
        firstName: 'Jan', lastName: 'Novák', role: 'tenant',
        propertyId: propertyA,
      })
      .expect(201)
    residentA = rA.body.id

    const baA = await ownerApi
      .post('/api/v1/finance/bank-accounts', {
        name: 'Account A', accountNumber: '1111/0100', propertyId: propertyA,
      })
      .expect(201)
    bankAccountA = baA.body.id

    const prA = await ownerApi
      .post('/api/v1/finance/prescriptions', {
        propertyId: propertyA, type: 'rent', amount: 5000,
        description: 'Nájem A', validFrom: '2026-01-01',
      })
      .expect(201)
    prescriptionA = prA.body.id

    // ─── Seed entities under property B (foreign) ──────────────
    const rB = await ownerApi
      .post('/api/v1/residents', {
        firstName: 'Petr', lastName: 'Cizí', role: 'tenant',
        propertyId: propertyB,
      })
      .expect(201)
    residentB = rB.body.id

    const tB = await ownerApi
      .post('/api/v1/helpdesk', {
        title: 'Ticket B', propertyId: propertyB,
      })
      .expect(201)
    ticketB = tB.body.id

    const woB = await ownerApi
      .post('/api/v1/work-orders', {
        title: 'WO B', propertyId: propertyB,
      })
      .expect(201)
    workOrderB = woB.body.id

    const mB = await ownerApi
      .post('/api/v1/meters', {
        name: 'Meter B', serialNumber: 'SN-B', propertyId: propertyB,
      })
      .expect(201)
    meterB = mB.body.id

    const cB = await ownerApi
      .post('/api/v1/contracts', {
        propertyId: propertyB, monthlyRent: 10000, startDate: '2026-01-01',
      })
      .expect(201)
    contractB = cB.body.id

    const evB = await ownerApi
      .post('/api/v1/calendar/events', {
        title: 'Event B', date: '2026-06-01', propertyId: propertyB,
      })
      .expect(201)
    eventB = evB.body.id

    const baB = await ownerApi
      .post('/api/v1/finance/bank-accounts', {
        name: 'Account B', accountNumber: '2222/0100', propertyId: propertyB,
      })
      .expect(201)
    bankAccountB = baB.body.id

    const prB = await ownerApi
      .post('/api/v1/finance/prescriptions', {
        propertyId: propertyB, type: 'rent', amount: 8000,
        description: 'Nájem B', validFrom: '2026-01-01',
      })
      .expect(201)
    prescriptionB = prB.body.id

    const invB = await ownerApi
      .post('/api/v1/finance/invoices', {
        propertyId: propertyB, number: 'INV-B-001',
        supplierName: 'Dodavatel B', amountTotal: 5000,
        issueDate: '2026-03-01', dueDate: '2026-03-31',
      })
      .expect(201)
    invoiceB = invB.body.id
  }, 60_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  // ═══════════════════════════════════════════════════════════════
  // RESIDENTS
  // ═══════════════════════════════════════════════════════════════

  it('scoped manager cannot list residents of foreign property', async () => {
    const res = await managerApi.get('/api/v1/residents').expect(200)
    const ids = res.body.data
      ? res.body.data.map((r: any) => r.id)
      : res.body.map((r: any) => r.id)
    expect(ids).not.toContain(residentB)
    expect(ids).toContain(residentA)
  })

  it('scoped manager cannot get detail of foreign resident', async () => {
    await managerApi.get(`/api/v1/residents/${residentB}`).expect(403)
  })

  it('scoped manager cannot update foreign resident', async () => {
    await managerApi
      .put(`/api/v1/residents/${residentB}`, { firstName: 'Hack' })
      .expect(403)
  })

  it('scoped manager cannot delete foreign resident', async () => {
    await managerApi.delete(`/api/v1/residents/${residentB}`).expect(403)
  })

  // ═══════════════════════════════════════════════════════════════
  // HELPDESK
  // ═══════════════════════════════════════════════════════════════

  it('scoped manager cannot list foreign helpdesk tickets', async () => {
    const res = await managerApi.get('/api/v1/helpdesk').expect(200)
    const ids = (res.body.data ?? res.body).map((t: any) => t.id)
    expect(ids).not.toContain(ticketB)
  })

  it('scoped manager cannot get detail of foreign ticket', async () => {
    await managerApi.get(`/api/v1/helpdesk/${ticketB}`).expect(403)
  })

  it('scoped manager cannot update foreign ticket', async () => {
    await managerApi
      .put(`/api/v1/helpdesk/${ticketB}`, { title: 'Hack' })
      .expect(403)
  })

  it('scoped manager cannot delete foreign ticket', async () => {
    await managerApi.delete(`/api/v1/helpdesk/${ticketB}`).expect(403)
  })

  // ═══════════════════════════════════════════════════════════════
  // WORK ORDERS
  // ═══════════════════════════════════════════════════════════════

  it('scoped manager cannot list foreign work orders', async () => {
    const res = await managerApi.get('/api/v1/work-orders').expect(200)
    const ids = (res.body.data ?? res.body).map((w: any) => w.id)
    expect(ids).not.toContain(workOrderB)
  })

  it('scoped manager cannot get detail of foreign work order', async () => {
    await managerApi.get(`/api/v1/work-orders/${workOrderB}`).expect(403)
  })

  it('scoped manager cannot delete foreign work order', async () => {
    await managerApi.delete(`/api/v1/work-orders/${workOrderB}`).expect(403)
  })

  // ═══════════════════════════════════════════════════════════════
  // METERS
  // ═══════════════════════════════════════════════════════════════

  it('scoped manager cannot list foreign meters', async () => {
    const res = await managerApi.get('/api/v1/meters').expect(200)
    const ids = (res.body.data ?? res.body).map((m: any) => m.id)
    expect(ids).not.toContain(meterB)
  })

  it('scoped manager cannot get detail of foreign meter', async () => {
    await managerApi.get(`/api/v1/meters/${meterB}`).expect(403)
  })

  it('scoped manager cannot delete foreign meter', async () => {
    await managerApi.delete(`/api/v1/meters/${meterB}`).expect(403)
  })

  // ═══════════════════════════════════════════════════════════════
  // CONTRACTS
  // ═══════════════════════════════════════════════════════════════

  it('scoped manager cannot list foreign contracts', async () => {
    const res = await managerApi.get('/api/v1/contracts').expect(200)
    const ids = (res.body.data ?? res.body).map((c: any) => c.id)
    expect(ids).not.toContain(contractB)
  })

  it('scoped manager cannot get detail of foreign contract', async () => {
    await managerApi.get(`/api/v1/contracts/${contractB}`).expect(403)
  })

  it('scoped manager cannot delete foreign contract', async () => {
    await managerApi.delete(`/api/v1/contracts/${contractB}`).expect(403)
  })

  // ═══════════════════════════════════════════════════════════════
  // CALENDAR
  // ═══════════════════════════════════════════════════════════════

  it('scoped manager cannot get detail of foreign event', async () => {
    await managerApi.get(`/api/v1/calendar/events/${eventB}`).expect(403)
  })

  it('scoped manager cannot delete foreign event', async () => {
    await managerApi.delete(`/api/v1/calendar/events/${eventB}`).expect(403)
  })

  // ═══════════════════════════════════════════════════════════════
  // FINANCE — Bank accounts & transactions via relation scope
  // ═══════════════════════════════════════════════════════════════

  it('scoped manager cannot list foreign bank accounts', async () => {
    const res = await managerApi.get('/api/v1/finance/bank-accounts').expect(200)
    const ids = (res.body.data ?? res.body).map((b: any) => b.id)
    expect(ids).not.toContain(bankAccountB)
    expect(ids).toContain(bankAccountA)
  })

  it('scoped manager cannot list foreign prescriptions', async () => {
    const res = await managerApi.get('/api/v1/finance/prescriptions').expect(200)
    const ids = (res.body.data ?? res.body).map((p: any) => p.id)
    expect(ids).not.toContain(prescriptionB)
    expect(ids).toContain(prescriptionA)
  })

  it('scoped manager cannot delete foreign prescription', async () => {
    await managerApi
      .delete(`/api/v1/finance/prescriptions/${prescriptionB}`)
      .expect(403)
  })

  // ═══════════════════════════════════════════════════════════════
  // INVOICES
  // ═══════════════════════════════════════════════════════════════

  it('scoped manager cannot list foreign invoices', async () => {
    const res = await managerApi.get('/api/v1/finance/invoices').expect(200)
    const ids = (res.body.data ?? res.body).map((i: any) => i.id)
    expect(ids).not.toContain(invoiceB)
  })

  it('scoped manager cannot delete foreign invoice', async () => {
    await managerApi.delete(`/api/v1/finance/invoices/${invoiceB}`).expect(403)
  })

  // ═══════════════════════════════════════════════════════════════
  // REPORTS — only assigned property data
  // ═══════════════════════════════════════════════════════════════

  it('scoped manager reports/dashboard returns only assigned data', async () => {
    const res = await managerApi.get('/api/v1/reports/dashboard').expect(200)
    // The dashboard should only count entities from property A
    expect(res.body.properties).toBe(1)
  })

  // ═══════════════════════════════════════════════════════════════
  // tenant_owner sees EVERYTHING (no scope restriction)
  // ═══════════════════════════════════════════════════════════════

  it('tenant_owner sees residents from both properties', async () => {
    const res = await ownerApi.get('/api/v1/residents').expect(200)
    const ids = (res.body.data ?? res.body).map((r: any) => r.id)
    expect(ids).toContain(residentA)
    expect(ids).toContain(residentB)
  })

  it('tenant_owner can get detail of any property entity', async () => {
    await ownerApi.get(`/api/v1/helpdesk/${ticketB}`).expect(200)
    await ownerApi.get(`/api/v1/work-orders/${workOrderB}`).expect(200)
    await ownerApi.get(`/api/v1/meters/${meterB}`).expect(200)
    await ownerApi.get(`/api/v1/contracts/${contractB}`).expect(200)
  })

  it('tenant_owner reports/dashboard includes all properties', async () => {
    const res = await ownerApi.get('/api/v1/reports/dashboard').expect(200)
    expect(res.body.properties).toBeGreaterThanOrEqual(2)
  })

  // ═══════════════════════════════════════════════════════════════
  // propertyId = null — scoped role gets 403, tenant_owner succeeds
  // ═══════════════════════════════════════════════════════════════

  it('scoped manager cannot access entity with null propertyId', async () => {
    // Create a resident WITHOUT propertyId (only owner can)
    const nullRes = await ownerApi
      .post('/api/v1/residents', {
        firstName: 'Bez', lastName: 'Nemovitosti', role: 'contact',
      })
      .expect(201)
    const nullId = nullRes.body.id

    // Owner can see it
    await ownerApi.get(`/api/v1/residents/${nullId}`).expect(200)

    // Scoped manager gets 403 (no propertyId → inaccessible for scoped roles)
    await managerApi.get(`/api/v1/residents/${nullId}`).expect(403)
  })

  // ═══════════════════════════════════════════════════════════════
  // Cross-property create prevention
  // ═══════════════════════════════════════════════════════════════

  it('scoped manager cannot create entity for foreign property', async () => {
    await managerApi
      .post('/api/v1/helpdesk', { title: 'Hack Ticket', propertyId: propertyB })
      .expect(403)
  })

  it('scoped manager can create entity for assigned property', async () => {
    await managerApi
      .post('/api/v1/helpdesk', { title: 'Valid Ticket', propertyId: propertyA })
      .expect(201)
  })
})
