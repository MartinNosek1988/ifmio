import request from 'supertest'
import { createTestApp, closeTestApp, authRequest, TestApp } from './test.helpers'

/**
 * P5.2a — Invoice approval workflow e2e tests.
 */
describe('Invoice Approval Workflow (e2e)', () => {
  let testApp: TestApp
  let ownerApi: ReturnType<typeof authRequest>
  let financeApi: ReturnType<typeof authRequest>
  let managerApi: ReturnType<typeof authRequest>
  let viewerApi: ReturnType<typeof authRequest>
  let invoiceId: string

  beforeAll(async () => {
    testApp = await createTestApp()
    ownerApi = authRequest(testApp.server, testApp.token)

    // Create a property for scope
    const propRes = await ownerApi
      .post('/api/v1/properties', {
        name: 'Approval-Test', address: 'A 1', city: 'Praha',
        postalCode: '11000', type: 'SVJ', ownership: 'vlastnictvi',
      })
      .expect(201)
    const propertyId = propRes.body.id

    // Create finance_manager
    const fmEmail = `fm-approval-${Date.now()}@test.cz`
    await ownerApi
      .post('/api/v1/admin/users', {
        name: 'FM Approval', email: fmEmail,
        role: 'finance_manager', password: 'fmpass12345',
      })
      .expect(201)
    const fmLogin = await request(testApp.server)
      .post('/api/v1/auth/login')
      .send({ email: fmEmail, password: 'fmpass12345' })
      .expect(200)
    financeApi = authRequest(testApp.server, fmLogin.body.accessToken)

    // Create property_manager
    const pmEmail = `pm-approval-${Date.now()}@test.cz`
    const pmRes = await ownerApi
      .post('/api/v1/admin/users', {
        name: 'PM Approval', email: pmEmail,
        role: 'property_manager', password: 'pmpass12345',
      })
      .expect(201)
    await ownerApi
      .post('/api/v1/admin/property-assignments', {
        userId: pmRes.body.id,
        propertyId,
      })
      .expect(201)
    const pmLogin = await request(testApp.server)
      .post('/api/v1/auth/login')
      .send({ email: pmEmail, password: 'pmpass12345' })
      .expect(200)
    managerApi = authRequest(testApp.server, pmLogin.body.accessToken)

    // Create viewer
    const viewerEmail = `viewer-approval-${Date.now()}@test.cz`
    await ownerApi
      .post('/api/v1/admin/users', {
        name: 'Viewer Approval', email: viewerEmail,
        role: 'viewer', password: 'viewpass12345',
      })
      .expect(201)
    const viewerLogin = await request(testApp.server)
      .post('/api/v1/auth/login')
      .send({ email: viewerEmail, password: 'viewpass12345' })
      .expect(200)
    viewerApi = authRequest(testApp.server, viewerLogin.body.accessToken)

    // Create a draft invoice
    const invRes = await ownerApi
      .post('/api/v1/finance/invoices', {
        number: 'INV-APPR-001',
        issueDate: '2026-03-01',
        amountTotal: 5000,
        propertyId,
      })
      .expect(201)
    invoiceId = invRes.body.id
  }, 60_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  // ═══════════════════════════════════════════════════════════════
  // INITIAL STATE
  // ═══════════════════════════════════════════════════════════════

  it('new invoice has approvalStatus=draft', async () => {
    const res = await ownerApi.get('/api/v1/finance/invoices').expect(200)
    const inv = res.body.data.find((i: any) => i.id === invoiceId)
    expect(inv).toBeDefined()
    expect(inv.approvalStatus).toBe('draft')
  })

  // ═══════════════════════════════════════════════════════════════
  // EDIT/DELETE ONLY IN DRAFT
  // ═══════════════════════════════════════════════════════════════

  it('can update invoice in draft state', async () => {
    await ownerApi
      .put(`/api/v1/finance/invoices/${invoiceId}`, { description: 'Test update' })
      .expect(200)
  })

  // ═══════════════════════════════════════════════════════════════
  // SUBMIT
  // ═══════════════════════════════════════════════════════════════

  it('property_manager can submit invoice', async () => {
    const res = await managerApi
      .post(`/api/v1/finance/invoices/${invoiceId}/submit`)
      .expect(201)
    expect(res.body.approvalStatus).toBe('submitted')
    expect(res.body.submittedAt).toBeTruthy()
  })

  it('cannot submit already submitted invoice', async () => {
    await ownerApi
      .post(`/api/v1/finance/invoices/${invoiceId}/submit`)
      .expect(400)
  })

  it('cannot update invoice in submitted state', async () => {
    await ownerApi
      .put(`/api/v1/finance/invoices/${invoiceId}`, { description: 'Should fail' })
      .expect(400)
  })

  it('cannot delete invoice in submitted state', async () => {
    await ownerApi
      .delete(`/api/v1/finance/invoices/${invoiceId}`)
      .expect(400)
  })

  it('cannot markPaid in submitted state', async () => {
    await ownerApi
      .post(`/api/v1/finance/invoices/${invoiceId}/mark-paid`)
      .expect(400)
  })

  // ═══════════════════════════════════════════════════════════════
  // RETURN TO DRAFT
  // ═══════════════════════════════════════════════════════════════

  it('owner can return submitted invoice to draft', async () => {
    const res = await ownerApi
      .post(`/api/v1/finance/invoices/${invoiceId}/return-to-draft`, { reason: 'Chybná částka' })
      .expect(201)
    expect(res.body.approvalStatus).toBe('draft')
    expect(res.body.rejectedAt).toBeTruthy()
    expect(res.body.rejectionReason).toBe('Chybná částka')
  })

  it('can update invoice after return to draft', async () => {
    await ownerApi
      .put(`/api/v1/finance/invoices/${invoiceId}`, { amountTotal: 6000 })
      .expect(200)
  })

  // Re-submit for approve tests
  it('can re-submit after return to draft', async () => {
    const res = await ownerApi
      .post(`/api/v1/finance/invoices/${invoiceId}/submit`)
      .expect(201)
    expect(res.body.approvalStatus).toBe('submitted')
    // Rejection fields should be cleared
    expect(res.body.rejectedAt).toBeNull()
    expect(res.body.rejectionReason).toBeNull()
  })

  // ═══════════════════════════════════════════════════════════════
  // APPROVE
  // ═══════════════════════════════════════════════════════════════

  it('owner can approve submitted invoice', async () => {
    const res = await ownerApi
      .post(`/api/v1/finance/invoices/${invoiceId}/approve`)
      .expect(201)
    expect(res.body.approvalStatus).toBe('approved')
    expect(res.body.approvedAt).toBeTruthy()
  })

  it('cannot approve already approved invoice', async () => {
    await ownerApi
      .post(`/api/v1/finance/invoices/${invoiceId}/approve`)
      .expect(400)
  })

  it('cannot update invoice in approved state', async () => {
    await ownerApi
      .put(`/api/v1/finance/invoices/${invoiceId}`, { description: 'Should fail' })
      .expect(400)
  })

  it('cannot delete invoice in approved state', async () => {
    await ownerApi
      .delete(`/api/v1/finance/invoices/${invoiceId}`)
      .expect(400)
  })

  // ═══════════════════════════════════════════════════════════════
  // MARK PAID (only approved)
  // ═══════════════════════════════════════════════════════════════

  it('can markPaid on approved invoice', async () => {
    const res = await ownerApi
      .post(`/api/v1/finance/invoices/${invoiceId}/mark-paid`, {
        paidAmount: 6000,
        paymentMethod: 'bank_transfer',
      })
      .expect(201)
    expect(res.body.isPaid).toBe(true)
  })

  it('cannot return paid invoice to draft', async () => {
    await ownerApi
      .post(`/api/v1/finance/invoices/${invoiceId}/return-to-draft`)
      .expect(400)
  })

  // ═══════════════════════════════════════════════════════════════
  // ROLE RESTRICTIONS
  // ═══════════════════════════════════════════════════════════════

  it('viewer cannot submit invoice', async () => {
    // Create a separate invoice for this test
    const invRes = await ownerApi
      .post('/api/v1/finance/invoices', {
        number: 'INV-VIEWER-001', issueDate: '2026-03-01', amountTotal: 100,
      })
      .expect(201)
    await viewerApi
      .post(`/api/v1/finance/invoices/${invRes.body.id}/submit`)
      .expect(403)
  })

  it('viewer cannot approve invoice', async () => {
    const invRes = await ownerApi
      .post('/api/v1/finance/invoices', {
        number: 'INV-VIEWER-002', issueDate: '2026-03-01', amountTotal: 100,
      })
      .expect(201)
    await ownerApi.post(`/api/v1/finance/invoices/${invRes.body.id}/submit`).expect(201)
    await viewerApi
      .post(`/api/v1/finance/invoices/${invRes.body.id}/approve`)
      .expect(403)
  })

  // ═══════════════════════════════════════════════════════════════
  // LIST FILTER BY APPROVAL STATUS
  // ═══════════════════════════════════════════════════════════════

  it('can filter invoices by approvalStatus', async () => {
    const res = await ownerApi.get('/api/v1/finance/invoices?approvalStatus=draft').expect(200)
    for (const inv of res.body.data) {
      expect(inv.approvalStatus).toBe('draft')
    }
  })

  // ═══════════════════════════════════════════════════════════════
  // AUDIT LOG
  // ═══════════════════════════════════════════════════════════════

  it('audit log contains approval events', async () => {
    const res = await ownerApi.get('/api/v1/audit').expect(200)
    const actions = res.body.data.map((l: any) => l.action)
    expect(actions).toContain('INVOICE_SUBMIT')
    expect(actions).toContain('INVOICE_APPROVE')
    expect(actions).toContain('INVOICE_MARK_PAID')
    expect(actions).toContain('INVOICE_RETURN_TO_DRAFT')
  })
})
