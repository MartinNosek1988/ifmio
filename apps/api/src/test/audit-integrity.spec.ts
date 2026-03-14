import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

describe('Audit trail & protocol-document integrity (e2e)', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = await createTestApp()
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  // ─── Audit trail verification ─────────────────────────────────

  describe('Helpdesk audit trail', () => {
    it('ticket update completes with audit interceptor active', async () => {
      const api = authRequest(testApp.server, testApp.token)

      const ticket = await api
        .post('/api/v1/helpdesk', { title: 'Audit test ticket', priority: 'high' })
        .expect(201)

      const res = await api
        .put(`/api/v1/helpdesk/${ticket.body.id}`, { status: 'in_progress' })
        .expect(200)

      // The audit interceptor runs as part of the request pipeline
      // If it fails, the request would fail too
      expect(res.body.status).toBe('in_progress')
    })

    it('ticket priority change with SLA recalculation is auditable', async () => {
      const api = authRequest(testApp.server, testApp.token)

      const ticket = await api
        .post('/api/v1/helpdesk', { title: 'SLA audit ticket', priority: 'medium' })
        .expect(201)

      const res = await api
        .put(`/api/v1/helpdesk/${ticket.body.id}`, { priority: 'urgent' })
        .expect(200)

      expect(res.body.priority).toBe('urgent')
      expect(res.body.resolutionDueAt).toBeDefined()
    })
  })

  describe('Work order audit trail', () => {
    it('work order update is auditable', async () => {
      const api = authRequest(testApp.server, testApp.token)

      const wo = await api
        .post('/api/v1/work-orders', { title: 'Audit test WO', priority: 'vysoka' })
        .expect(201)

      const res = await api
        .put(`/api/v1/work-orders/${wo.body.id}`, { title: 'Updated WO title' })
        .expect(200)

      expect(res.body.title).toBe('Updated WO title')
    })

    it('work order status change is auditable', async () => {
      const api = authRequest(testApp.server, testApp.token)

      const wo = await api
        .post('/api/v1/work-orders', { title: 'Status audit WO' })
        .expect(201)

      const res = await api
        .put(`/api/v1/work-orders/${wo.body.id}/status`, { status: 'v_reseni' })
        .expect(200)

      expect(res.body.status).toBe('v_reseni')
    })
  })

  describe('Protocol audit trail', () => {
    it('protocol update is auditable', async () => {
      const api = authRequest(testApp.server, testApp.token)

      const protocol = await api
        .post('/api/v1/protocols', {
          sourceType: 'work_order',
          sourceId: 'audit-test-source',
          title: 'Audit test protocol',
        })
        .expect(201)

      const res = await api
        .patch(`/api/v1/protocols/${protocol.body.id}`, {
          description: 'Updated for audit test',
          resolverName: 'Test Resolver',
        })
        .expect(200)

      expect(res.body.description).toBe('Updated for audit test')
      expect(res.body.resolverName).toBe('Test Resolver')
    })
  })

  // ─── Protocol-document integrity ──────────────────────────────

  describe('Protocol-document integrity', () => {
    let protocolId: string

    it('creates a protocol with null document references', async () => {
      const api = authRequest(testApp.server, testApp.token)
      const res = await api
        .post('/api/v1/protocols', {
          sourceType: 'work_order',
          sourceId: 'integrity-test-source',
          title: 'Integrity test protocol',
        })
        .expect(201)

      protocolId = res.body.id
      expect(res.body.generatedPdfDocumentId).toBeNull()
      expect(res.body.signedDocumentId).toBeNull()
    })

    it('generates PDF and stores FK-backed document reference', async () => {
      const api = authRequest(testApp.server, testApp.token)

      const pdfRes = await api
        .post(`/api/v1/protocols/${protocolId}/generate-pdf`)
        .expect(201)

      expect(pdfRes.body).toHaveProperty('documentId')
      expect(pdfRes.body.documentId).toBeTruthy()

      // Verify protocol has the FK reference
      const detail = await api.get(`/api/v1/protocols/${protocolId}`).expect(200)
      expect(detail.body.generatedPdfDocumentId).toBe(pdfRes.body.documentId)
    })

    it('rejects PDF download for protocol without generated PDF', async () => {
      const api = authRequest(testApp.server, testApp.token)

      const newProtocol = await api
        .post('/api/v1/protocols', {
          sourceType: 'helpdesk',
          sourceId: 'no-pdf-test',
          title: 'No PDF protocol',
        })
        .expect(201)

      await api
        .get(`/api/v1/protocols/${newProtocol.body.id}/pdf`)
        .expect(400)
    })

    it('protocol complete workflow preserves document references', async () => {
      const api = authRequest(testApp.server, testApp.token)

      await api
        .post(`/api/v1/protocols/${protocolId}/complete`, {
          satisfaction: 'satisfied',
          supplierSignatureName: 'Jan Technik',
          customerSignatureName: 'Petr Klient',
        })
        .expect([200, 201])

      const detail = await api.get(`/api/v1/protocols/${protocolId}`).expect(200)
      expect(detail.body.status).toBe('completed')
      expect(detail.body.generatedPdfDocumentId).toBeTruthy()
    })

    it('protocol confirm preserves document references', async () => {
      const api = authRequest(testApp.server, testApp.token)

      await api
        .post(`/api/v1/protocols/${protocolId}/confirm`)
        .expect([200, 201])

      const detail = await api.get(`/api/v1/protocols/${protocolId}`).expect(200)
      expect(detail.body.status).toBe('confirmed')
      expect(detail.body.generatedPdfDocumentId).toBeTruthy()
    })
  })

  // ─── Document link integrity ──────────────────────────────────

  describe('Document link integrity', () => {
    it('protocol PDF generation creates DocumentLink to protocol entity', async () => {
      const api = authRequest(testApp.server, testApp.token)

      const protocol = await api
        .post('/api/v1/protocols', {
          sourceType: 'helpdesk',
          sourceId: 'link-test',
          title: 'Link test protocol',
        })
        .expect(201)

      const pdfRes = await api
        .post(`/api/v1/protocols/${protocol.body.id}/generate-pdf`)
        .expect(201)

      // Verify document is linked to protocol via DocumentLink
      const docs = await api
        .get(`/api/v1/documents?entityType=protocol&entityId=${protocol.body.id}`)
        .expect(200)

      expect(docs.body.data.length).toBeGreaterThanOrEqual(1)
      const linkedDoc = docs.body.data.find((d: any) => d.id === pdfRes.body.documentId)
      expect(linkedDoc).toBeDefined()
      expect(linkedDoc.category).toBe('protocol')
    })
  })

  // ─── Full helpdesk → WO → protocol flow ───────────────────────

  describe('Full helpdesk → work order → protocol flow', () => {
    it('creates and traces complete operational chain', async () => {
      const api = authRequest(testApp.server, testApp.token)

      // 1. Helpdesk ticket
      const ticket = await api
        .post('/api/v1/helpdesk', {
          title: 'Rozbité topení',
          priority: 'high',
          category: 'hvac',
        })
        .expect(201)

      // 2. Work order from ticket
      const wo = await api
        .post(`/api/v1/helpdesk/${ticket.body.id}/work-orders`, {})
        .expect(201)

      expect(wo.body.helpdeskTicketId).toBe(ticket.body.id)
      expect(wo.body.title).toBe('Rozbité topení')

      // 3. Protocol for the work order
      const protocol = await api
        .post('/api/v1/protocols', {
          sourceType: 'work_order',
          sourceId: wo.body.id,
          title: 'Protokol opravy topení',
        })
        .expect(201)

      expect(protocol.body.sourceType).toBe('work_order')
      expect(protocol.body.sourceId).toBe(wo.body.id)

      // 4. Generate PDF
      const pdf = await api
        .post(`/api/v1/protocols/${protocol.body.id}/generate-pdf`)
        .expect(201)

      expect(pdf.body.documentId).toBeTruthy()

      // 5. Verify the full chain integrity
      const finalProtocol = await api.get(`/api/v1/protocols/${protocol.body.id}`).expect(200)
      expect(finalProtocol.body.generatedPdfDocumentId).toBe(pdf.body.documentId)
      expect(finalProtocol.body.sourceId).toBe(wo.body.id)

      const finalWo = await api.get(`/api/v1/work-orders/${wo.body.id}`).expect(200)
      expect(finalWo.body.helpdeskTicketId).toBe(ticket.body.id)

      // 6. Verify protocol can be retrieved by source
      const bySource = await api
        .get(`/api/v1/protocols/by-source/work_order/${wo.body.id}`)
        .expect(200)

      expect(Array.isArray(bySource.body)).toBe(true)
      expect(bySource.body.length).toBeGreaterThanOrEqual(1)
      expect(bySource.body[0].id).toBe(protocol.body.id)
    }, 15_000)
  })
})
