import request from 'supertest'
import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

/**
 * PR3 — Scope gap fixes: SearchService, DashboardService, AssetsService.
 *
 * Setup: two properties (A assigned to scoped manager, B not assigned).
 * Seed entities under both. Verify scoped user only sees A-side data
 * in search, dashboard, and assets.
 */
describe('Scope Gaps PR3 (e2e)', () => {
  let testApp: TestApp
  let ownerApi: ReturnType<typeof authRequest>
  let managerApi: ReturnType<typeof authRequest>
  let propertyA: string
  let propertyB: string
  let assetA: string
  let assetB: string

  beforeAll(async () => {
    testApp = await createTestApp()
    ownerApi = authRequest(testApp.server, testApp.token)

    // ─── Create two properties ─────────────────────────────────
    const resA = await ownerApi
      .post('/api/v1/properties', {
        name: 'GapTestA', address: 'Ulice A 1', city: 'Praha',
        postalCode: '11000', type: 'bytdum', ownership: 'vlastnictvi',
      })
      .expect(201)
    propertyA = resA.body.id

    const resB = await ownerApi
      .post('/api/v1/properties', {
        name: 'GapTestB', address: 'Ulice B 2', city: 'Brno',
        postalCode: '60200', type: 'bytdum', ownership: 'vlastnictvi',
      })
      .expect(201)
    propertyB = resB.body.id

    // ─── Create scoped property_manager ────────────────────────
    const pmEmail = `pm-gap${Date.now()}@test.cz`
    const inv = await ownerApi
      .post('/api/v1/admin/users', {
        name: 'Gap PM', email: pmEmail,
        role: 'property_manager', password: 'pmpass12345',
      })
      .expect(201)

    await ownerApi
      .post('/api/v1/admin/property-assignments', {
        userId: inv.body.id,
        propertyId: propertyA,
      })
      .expect(201)

    const login = await request(testApp.server)
      .post('/api/v1/auth/login')
      .send({ email: pmEmail, password: 'pmpass12345' })
      .expect(200)
    managerApi = authRequest(testApp.server, login.body.accessToken)

    // ─── Seed a resident on each property (for search) ─────────
    await ownerApi
      .post('/api/v1/residents', {
        firstName: 'SearchableA', lastName: 'ResidentA',
        role: 'tenant', propertyId: propertyA,
      })
      .expect(201)

    await ownerApi
      .post('/api/v1/residents', {
        firstName: 'SearchableB', lastName: 'ResidentB',
        role: 'tenant', propertyId: propertyB,
      })
      .expect(201)

    // ─── Seed assets on each property ──────────────────────────
    const aA = await ownerApi
      .post('/api/v1/assets', {
        name: 'Asset A', category: 'tzb', propertyId: propertyA,
      })
      .expect(201)
    assetA = aA.body.id

    const aB = await ownerApi
      .post('/api/v1/assets', {
        name: 'Asset B', category: 'tzb', propertyId: propertyB,
      })
      .expect(201)
    assetB = aB.body.id
  }, 90_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  // ═══════════════════════════════════════════════════════════════
  // SEARCH — scoped user finds only assigned property entities
  // ═══════════════════════════════════════════════════════════════

  it('search: scoped user finds resident from assigned property', async () => {
    const res = await managerApi.get('/api/v1/search?q=SearchableA').expect(200)
    const titles = res.body.results.map((r: any) => r.title)
    expect(titles.some((t: string) => t.includes('SearchableA'))).toBe(true)
  })

  it('search: scoped user does NOT find resident from foreign property', async () => {
    const res = await managerApi.get('/api/v1/search?q=SearchableB').expect(200)
    const titles = res.body.results.map((r: any) => r.title)
    expect(titles.some((t: string) => t.includes('SearchableB'))).toBe(false)
  })

  it('search: scoped user finds assigned property by name', async () => {
    const res = await managerApi.get('/api/v1/search?q=GapTestA').expect(200)
    const ids = res.body.results.map((r: any) => r.id)
    expect(ids).toContain(propertyA)
  })

  it('search: scoped user does NOT find foreign property by name', async () => {
    const res = await managerApi.get('/api/v1/search?q=GapTestB').expect(200)
    const ids = res.body.results.map((r: any) => r.id)
    expect(ids).not.toContain(propertyB)
  })

  it('search: tenant_owner finds entities from both properties', async () => {
    const res = await ownerApi.get('/api/v1/search?q=Searchable').expect(200)
    const titles = res.body.results.map((r: any) => r.title)
    expect(titles.some((t: string) => t.includes('SearchableA'))).toBe(true)
    expect(titles.some((t: string) => t.includes('SearchableB'))).toBe(true)
  })

  // ═══════════════════════════════════════════════════════════════
  // DASHBOARD — KPI scoped to assigned properties
  // ═══════════════════════════════════════════════════════════════

  it('dashboard: scoped user sees only assigned property count', async () => {
    const res = await managerApi.get('/api/v1/dashboard').expect(200)
    expect(res.body.kpi.propertiesCount).toBe(1)
  })

  it('dashboard: tenant_owner sees all properties', async () => {
    const res = await ownerApi.get('/api/v1/dashboard').expect(200)
    expect(res.body.kpi.propertiesCount).toBeGreaterThanOrEqual(2)
  })

  // ═══════════════════════════════════════════════════════════════
  // ASSETS — list, detail, update, delete scoped
  // ═══════════════════════════════════════════════════════════════

  it('assets: scoped user list contains only assigned property assets', async () => {
    const res = await managerApi.get('/api/v1/assets').expect(200)
    const ids = res.body.map((a: any) => a.id)
    expect(ids).toContain(assetA)
    expect(ids).not.toContain(assetB)
  })

  it('assets: scoped user can get detail of assigned asset', async () => {
    await managerApi.get(`/api/v1/assets/${assetA}`).expect(200)
  })

  it('assets: scoped user cannot get detail of foreign asset', async () => {
    await managerApi.get(`/api/v1/assets/${assetB}`).expect(403)
  })

  it('assets: scoped user cannot update foreign asset', async () => {
    await managerApi
      .patch(`/api/v1/assets/${assetB}`, { name: 'Hacked' })
      .expect(403)
  })

  it('assets: scoped user cannot delete foreign asset', async () => {
    await managerApi.delete(`/api/v1/assets/${assetB}`).expect(403)
  })

  it('assets: scoped user cannot create asset for foreign property', async () => {
    await managerApi
      .post('/api/v1/assets', { name: 'Sneaky', category: 'tzb', propertyId: propertyB })
      .expect(403)
  })

  it('assets: tenant_owner sees all assets', async () => {
    const res = await ownerApi.get('/api/v1/assets').expect(200)
    const ids = res.body.map((a: any) => a.id)
    expect(ids).toContain(assetA)
    expect(ids).toContain(assetB)
  })
})
