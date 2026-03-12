import request from 'supertest'
import { createTestApp, closeTestApp, authRequest, TestApp } from '../test/test.helpers'

describe('Property Scope (e2e)', () => {
  let testApp: TestApp
  let ownerApi: ReturnType<typeof authRequest>
  let managerToken: string
  let managerApi: ReturnType<typeof authRequest>
  let managerUserId: string
  let propertyA: string // assigned to manager
  let propertyB: string // NOT assigned to manager

  beforeAll(async () => {
    testApp = await createTestApp()
    ownerApi = authRequest(testApp.server, testApp.token)

    // Create two properties as tenant_owner
    const resA = await ownerApi
      .post('/api/v1/properties', {
        name: 'Nemovitost A',
        address: 'Ulice A 1',
        city: 'Praha',
        postalCode: '11000',
        type: 'bytdum',
        ownership: 'vlastnictvi',
      })
      .expect(201)
    propertyA = resA.body.id

    const resB = await ownerApi
      .post('/api/v1/properties', {
        name: 'Nemovitost B',
        address: 'Ulice B 2',
        city: 'Brno',
        postalCode: '60200',
        type: 'bytdum',
        ownership: 'vlastnictvi',
      })
      .expect(201)
    propertyB = resB.body.id

    // Invite a property_manager user
    const pmEmail = `pm${Date.now()}@test.cz`
    const inviteRes = await ownerApi
      .post('/api/v1/admin/users', {
        name: 'Property Manager',
        email: pmEmail,
        role: 'property_manager',
        password: 'pmpass12345',
      })
      .expect(201)
    managerUserId = inviteRes.body.id

    // Assign only property A to the manager
    await ownerApi
      .post('/api/v1/admin/property-assignments', {
        userId: managerUserId,
        propertyId: propertyA,
      })
      .expect(201)

    // Login as property_manager
    const loginRes = await request(testApp.server)
      .post('/api/v1/auth/login')
      .send({ email: pmEmail, password: 'pmpass12345' })
      .expect(200)
    managerToken = loginRes.body.accessToken
    managerApi = authRequest(testApp.server, managerToken)
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  // ─── property_manager scope enforcement ──────────────────────

  it('property_manager sees only assigned property in list', async () => {
    const res = await managerApi.get('/api/v1/properties').expect(200)
    const ids = res.body.map((p: any) => p.id)
    expect(ids).toContain(propertyA)
    expect(ids).not.toContain(propertyB)
  })

  it('property_manager can findOne assigned property', async () => {
    const res = await managerApi
      .get(`/api/v1/properties/${propertyA}`)
      .expect(200)
    expect(res.body.id).toBe(propertyA)
  })

  it('property_manager cannot findOne unassigned property', async () => {
    await managerApi
      .get(`/api/v1/properties/${propertyB}`)
      .expect(403)
  })

  it('property_manager cannot update unassigned property', async () => {
    await managerApi
      .patch(`/api/v1/properties/${propertyB}`, { name: 'Hacknuto' })
      .expect(403)
  })

  // ─── tenant_admin sees everything ────────────────────────────

  it('tenant_owner sees all properties without assignment', async () => {
    const res = await ownerApi.get('/api/v1/properties').expect(200)
    const ids = res.body.map((p: any) => p.id)
    expect(ids).toContain(propertyA)
    expect(ids).toContain(propertyB)
  })

  // ─── admin assignment endpoints ──────────────────────────────

  it('POST /admin/property-assignments rejects cross-tenant user', async () => {
    // Create a second tenant
    const otherRes = await request(testApp.server)
      .post('/api/v1/auth/register')
      .send({
        tenantName: `Other Tenant ${Date.now()}`,
        name: 'Other Owner',
        email: `other${Date.now()}@test.cz`,
        password: 'otherpass123',
      })
      .expect(201)
    const otherUserId = otherRes.body.user.id

    // Try to assign cross-tenant user to our property
    await ownerApi
      .post('/api/v1/admin/property-assignments', {
        userId: otherUserId,
        propertyId: propertyA,
      })
      .expect(404) // "Uživatel nenalezen" — not in same tenant
  })

  // ─── units scope via verifyProperty ──────────────────────────

  it('property_manager cannot access units of unassigned property', async () => {
    await managerApi
      .get(`/api/v1/properties/${propertyB}/units`)
      .expect(403)
  })

  it('property_manager can access units of assigned property', async () => {
    const res = await managerApi
      .get(`/api/v1/properties/${propertyA}/units`)
      .expect(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  // ─── property_manager without any assignment ─────────────────

  it('property_manager with no assignments sees empty list', async () => {
    // Create another property_manager with no assignments
    const noAssignEmail = `noa${Date.now()}@test.cz`
    await ownerApi
      .post('/api/v1/admin/users', {
        name: 'No Assignment PM',
        email: noAssignEmail,
        role: 'property_manager',
        password: 'noapass12345',
      })
      .expect(201)

    const loginRes = await request(testApp.server)
      .post('/api/v1/auth/login')
      .send({ email: noAssignEmail, password: 'noapass12345' })
      .expect(200)

    const noaApi = authRequest(testApp.server, loginRes.body.accessToken)
    const res = await noaApi.get('/api/v1/properties').expect(200)
    expect(res.body).toEqual([])
  })
})
