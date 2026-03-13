import request from 'supertest'
import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'
import { PrismaService } from '../prisma/prisma.service'

describe('Protocols API', () => {
  let t: TestApp
  let api: ReturnType<typeof authRequest>
  let prisma: PrismaService

  beforeAll(async () => {
    t = await createTestApp()
    api = authRequest(t.server, t.token)
    prisma = t.app.get(PrismaService)
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(t)
  })

  // ─── Direct CRUD ──────────────────────────────────────────

  let protocolId: string

  it('POST /protocols — creates protocol', async () => {
    const res = await api.post('/api/v1/protocols', {
      sourceType: 'helpdesk',
      sourceId: 'fake-ticket-1',
      protocolType: 'work_report',
      description: 'Test protocol',
      requesterName: 'Jan Novák',
      resolverName: 'Petr Řešitel',
    }).expect(201)

    expect(res.body.id).toBeDefined()
    expect(res.body.number).toMatch(/^PROT-HD-/)
    expect(res.body.status).toBe('draft')
    expect(res.body.description).toBe('Test protocol')
    expect(res.body.requesterName).toBe('Jan Novák')
    protocolId = res.body.id
  })

  it('GET /protocols — lists protocols', async () => {
    const res = await api.get('/api/v1/protocols').expect(200)
    expect(res.body.data).toBeInstanceOf(Array)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    expect(res.body.total).toBeGreaterThanOrEqual(1)
  })

  it('GET /protocols — filters by sourceType', async () => {
    const res = await api.get('/api/v1/protocols?sourceType=helpdesk').expect(200)
    expect(res.body.data.every((p: any) => p.sourceType === 'helpdesk')).toBe(true)
  })

  it('GET /protocols — search by description', async () => {
    const res = await api.get('/api/v1/protocols?search=Test protocol').expect(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('GET /protocols/:id — gets protocol detail', async () => {
    const res = await api.get(`/api/v1/protocols/${protocolId}`).expect(200)
    expect(res.body.id).toBe(protocolId)
    expect(res.body.lines).toBeInstanceOf(Array)
  })

  it('GET /protocols/by-source/:sourceType/:sourceId — gets by source', async () => {
    const res = await api.get('/api/v1/protocols/by-source/helpdesk/fake-ticket-1').expect(200)
    expect(res.body).toBeInstanceOf(Array)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
    expect(res.body[0].sourceId).toBe('fake-ticket-1')
  })

  it('PATCH /protocols/:id — updates protocol', async () => {
    const res = await api.patch(`/api/v1/protocols/${protocolId}`, {
      description: 'Updated description',
      transportKm: 42,
      transportMode: 'auto',
    }).expect(200)

    expect(res.body.description).toBe('Updated description')
    expect(res.body.transportKm).toBe(42)
    expect(res.body.transportMode).toBe('auto')
  })

  it('GET /protocols/:id — 404 for nonexistent', async () => {
    await api.get('/api/v1/protocols/00000000-0000-0000-0000-000000000000').expect(404)
  })

  // ─── Protocol Lines ───────────────────────────────────────

  let lineId: string

  it('POST /protocols/:id/lines — adds line', async () => {
    const res = await api.post(`/api/v1/protocols/${protocolId}/lines`, {
      name: 'Oprava ventilu',
      lineType: 'labor',
      unit: 'hod',
      quantity: 2.5,
    }).expect(201)

    expect(res.body.id).toBeDefined()
    expect(res.body.name).toBe('Oprava ventilu')
    expect(res.body.quantity).toBe(2.5)
    lineId = res.body.id
  })

  it('POST /protocols/:id/lines — adds second line with auto-sortOrder', async () => {
    const res = await api.post(`/api/v1/protocols/${protocolId}/lines`, {
      name: 'Těsnění DN50',
      lineType: 'material',
      unit: 'ks',
      quantity: 3,
    }).expect(201)

    expect(res.body.sortOrder).toBeGreaterThan(0)
  })

  it('PATCH /protocols/:id/lines/:lineId — updates line', async () => {
    const res = await api.patch(`/api/v1/protocols/${protocolId}/lines/${lineId}`, {
      quantity: 4,
      description: 'Updated note',
    }).expect(200)

    expect(res.body.quantity).toBe(4)
    expect(res.body.description).toBe('Updated note')
  })

  it('GET /protocols/:id — returns lines in order', async () => {
    const res = await api.get(`/api/v1/protocols/${protocolId}`).expect(200)
    expect(res.body.lines.length).toBe(2)
    expect(res.body.lines[0].sortOrder).toBeLessThanOrEqual(res.body.lines[1].sortOrder)
  })

  it('DELETE /protocols/:id/lines/:lineId — removes line', async () => {
    await api.delete(`/api/v1/protocols/${protocolId}/lines/${lineId}`).expect(204)
    const res = await api.get(`/api/v1/protocols/${protocolId}`).expect(200)
    expect(res.body.lines.length).toBe(1)
  })

  // ─── Complete / Handover ──────────────────────────────────

  it('POST /protocols/:id/complete — completes protocol', async () => {
    const res = await api.post(`/api/v1/protocols/${protocolId}/complete`, {
      satisfaction: 'satisfied',
      supplierSignatureName: 'Petr Řešitel',
      customerSignatureName: 'Jan Novák',
    }).expect(201)

    expect(res.body.status).toBe('completed')
    expect(res.body.satisfaction).toBe('satisfied')
    expect(res.body.handoverAt).toBeDefined()
    expect(res.body.supplierSignatureName).toBe('Petr Řešitel')
    expect(res.body.customerSignatureName).toBe('Jan Novák')
  })

  it('POST /protocols/:id/complete — dissatisfied requires comment', async () => {
    // Create a second protocol for this test
    const createRes = await api.post('/api/v1/protocols', {
      sourceType: 'helpdesk',
      sourceId: 'fake-ticket-2',
    }).expect(201)

    await api.post(`/api/v1/protocols/${createRes.body.id}/complete`, {
      satisfaction: 'dissatisfied',
    }).expect(400)

    // With comment should work
    const completeRes = await api.post(`/api/v1/protocols/${createRes.body.id}/complete`, {
      satisfaction: 'dissatisfied',
      satisfactionComment: 'Špatná kvalita práce',
    }).expect(201)

    expect(completeRes.body.status).toBe('completed')
    expect(completeRes.body.satisfaction).toBe('dissatisfied')
    expect(completeRes.body.satisfactionComment).toBe('Špatná kvalita práce')
  })

  // ─── Number generation ────────────────────────────────────

  it('generates unique numbers per sourceType', async () => {
    const r1 = await api.post('/api/v1/protocols', {
      sourceType: 'work_order',
      sourceId: 'wo-1',
    }).expect(201)

    const r2 = await api.post('/api/v1/protocols', {
      sourceType: 'work_order',
      sourceId: 'wo-2',
    }).expect(201)

    expect(r1.body.number).toMatch(/^PROT-WO-/)
    expect(r2.body.number).toMatch(/^PROT-WO-/)
    expect(r1.body.number).not.toBe(r2.body.number)
  })

  // ─── Delete protocol ─────────────────────────────────────

  it('DELETE /protocols/:id — deletes protocol', async () => {
    const createRes = await api.post('/api/v1/protocols', {
      sourceType: 'helpdesk',
      sourceId: 'fake-ticket-del',
    }).expect(201)

    await api.delete(`/api/v1/protocols/${createRes.body.id}`).expect(204)
    await api.get(`/api/v1/protocols/${createRes.body.id}`).expect(404)
  })

  // ─── Tenant isolation ────────────────────────────────────

  it('second tenant cannot see first tenant protocols', async () => {
    const t2 = await createTestApp()
    const api2 = authRequest(t2.server, t2.token)

    const res = await api2.get('/api/v1/protocols').expect(200)
    expect(res.body.data.length).toBe(0)

    await api2.get(`/api/v1/protocols/${protocolId}`).expect(404)

    await closeTestApp(t2)
  }, 30_000)

  // ─── Auth ─────────────────────────────────────────────────

  it('401 without token', async () => {
    await request(t.server).get('/api/v1/protocols').expect(401)
  })

  // ─── Validation ───────────────────────────────────────────

  it('400 on missing required fields (create)', async () => {
    await api.post('/api/v1/protocols', {}).expect(400)
  })

  it('400 on missing name for line', async () => {
    await api.post(`/api/v1/protocols/${protocolId}/lines`, {
      lineType: 'labor',
    }).expect(400)
  })

  // ─── Generate from helpdesk ticket ────────────────────────

  it('POST /protocols/generate — generates from helpdesk ticket', async () => {
    // Create a property and ticket first
    const propRes = await api.post('/api/v1/properties', {
      name: 'Test Budova Proto',
      address: 'Ulice 1',
      city: 'Praha',
      postalCode: '10000',
      type: 'residential',
    }).expect(201)

    const ticketRes = await api.post('/api/v1/helpdesk/tickets', {
      title: 'Prasklý ventil',
      description: 'Teče voda v koupelně',
      propertyId: propRes.body.id,
      category: 'plumbing',
      priority: 'high',
    }).expect(201)

    const res = await api.post('/api/v1/protocols/generate', {
      sourceType: 'helpdesk',
      sourceId: ticketRes.body.id,
      protocolType: 'work_report',
    }).expect(201)

    expect(res.body.sourceType).toBe('helpdesk')
    expect(res.body.sourceId).toBe(ticketRes.body.id)
    expect(res.body.number).toMatch(/^PROT-HD-/)
    expect(res.body.description).toBeDefined()
    expect(res.body.lines).toBeInstanceOf(Array)
  })

  it('POST /protocols/generate — 404 for nonexistent ticket', async () => {
    await api.post('/api/v1/protocols/generate', {
      sourceType: 'helpdesk',
      sourceId: '00000000-0000-0000-0000-000000000000',
    }).expect(404)
  })

  it('POST /protocols/generate — 400 for unsupported sourceType', async () => {
    await api.post('/api/v1/protocols/generate', {
      sourceType: 'work_order',
      sourceId: 'wo-1',
    }).expect(400)
  })
})
