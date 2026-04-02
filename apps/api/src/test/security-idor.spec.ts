import request from 'supertest'
import {
  createTestApp,
  closeTestApp,
  authRequest,
  TestApp,
} from './test.helpers'

describe('Security — IDOR / Cross-Tenant Isolation (e2e)', () => {
  let testApp: TestApp
  let tenantAApi: ReturnType<typeof authRequest>
  let tenantBApi: ReturnType<typeof authRequest>
  let tenantAPropertyId: string
  let tenantAResidentId: string
  let tenantATicketId: string
  let tenantAInvoiceId: string
  let tenantABankAccountId: string
  let tenantAUnitId: string

  beforeAll(async () => {
    testApp = await createTestApp()
    tenantAApi = authRequest(testApp.server, testApp.token)

    // Registrace Tenantu B
    const regB = await request(testApp.server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Tenant B Owner',
        email: `tenantb-${Date.now()}@test.cz`,
        password: 'SecurePass123',
        tenantName: `Tenant B ${Date.now()}`,
      })
      .expect(201)
    tenantBApi = authRequest(testApp.server, regB.body.accessToken)

    // Tenant A vytvoří data
    const propRes = await tenantAApi
      .post('/api/v1/properties', {
        name: `IDOR Test Property A ${Date.now()}`,
        address: 'Tajná 1',
        city: 'Praha',
        postalCode: '110 00',
        type: 'bytdum',
        ownership: 'vlastnictvi',
      })
      .expect(201)
    tenantAPropertyId = propRes.body.id

    const unitRes = await tenantAApi
      .post(`/api/v1/properties/${tenantAPropertyId}/units`, {
        name: 'Byt A1',
        floor: 1,
        area: 50,
      })
      .expect(201)
    tenantAUnitId = unitRes.body.id

    const resRes = await tenantAApi
      .post('/api/v1/residents', {
        firstName: 'Tajný',
        lastName: 'Obyvatel',
        role: 'owner',
        email: `secret-${Date.now()}@test.cz`,
      })
      .expect(201)
    tenantAResidentId = resRes.body.id

    const ticketRes = await tenantAApi
      .post('/api/v1/helpdesk', {
        title: 'IDOR test ticket',
        propertyId: tenantAPropertyId,
        category: 'general',
        priority: 'low',
      })
      .expect(201)
    tenantATicketId = ticketRes.body.id

    const invoiceRes = await tenantAApi
      .post('/api/v1/finance/invoices', {
        number: `IDOR-${Date.now()}`,
        type: 'received',
        supplierName: 'Secret Supplier',
        amountTotal: 50000,
        issueDate: '2026-03-01',
        dueDate: '2026-04-01',
        propertyId: tenantAPropertyId,
      })
      .expect(201)
    tenantAInvoiceId = invoiceRes.body.id

    const bankRes = await tenantAApi
      .post('/api/v1/finance/bank-accounts', {
        name: 'Secret Account',
        accountNumber: '1234567890',
        bankCode: '0100',
        propertyId: tenantAPropertyId,
      })
      .expect(201)
    tenantABankAccountId = bankRes.body.id
  }, 60_000)

  afterAll(async () => {
    // Cleanup Tenant A data
    if (tenantAInvoiceId) await tenantAApi.delete(`/api/v1/finance/invoices/${tenantAInvoiceId}`)
    if (tenantABankAccountId) await tenantAApi.delete(`/api/v1/finance/bank-accounts/${tenantABankAccountId}`)
    if (tenantATicketId) await tenantAApi.delete(`/api/v1/helpdesk/${tenantATicketId}`)
    if (tenantAResidentId) await tenantAApi.delete(`/api/v1/residents/${tenantAResidentId}`)
    if (tenantAPropertyId) await tenantAApi.delete(`/api/v1/properties/${tenantAPropertyId}`)
    await closeTestApp(testApp)
  })

  // ── Property isolation ──

  describe('Property — cross-tenant izolace', () => {
    it('Tenant B nemůže získat property Tenantu A → 404/403', async () => {
      const res = await tenantBApi.get(
        `/api/v1/properties/${tenantAPropertyId}`,
      )
      expect([403, 404]).toContain(res.status)
    })

    it('Tenant B nemůže aktualizovat property Tenantu A → 404/403', async () => {
      const res = await tenantBApi.patch(
        `/api/v1/properties/${tenantAPropertyId}`,
        { name: 'Hacked' },
      )
      expect([403, 404]).toContain(res.status)
    })

    it('Tenant B nemůže smazat property Tenantu A → 404/403', async () => {
      const res = await tenantBApi.delete(
        `/api/v1/properties/${tenantAPropertyId}`,
      )
      expect([403, 404]).toContain(res.status)
    })

    it('Tenant B v seznamu nevidí property Tenantu A', async () => {
      const res = await tenantBApi
        .get('/api/v1/properties')
        .expect(200)

      const ids = (Array.isArray(res.body) ? res.body : res.body.data || []).map(
        (p: any) => p.id,
      )
      expect(ids).not.toContain(tenantAPropertyId)
    })
  })

  // ── Unit isolation ──

  describe('Unit — cross-tenant izolace', () => {
    it('Tenant B nemůže získat unit Tenantu A → 404/403', async () => {
      const res = await tenantBApi.get(
        `/api/v1/properties/${tenantAPropertyId}/units/${tenantAUnitId}`,
      )
      expect([403, 404]).toContain(res.status)
    })
  })

  // ── Resident isolation ──

  describe('Resident — cross-tenant izolace', () => {
    it('Tenant B nemůže získat resident Tenantu A → 404/403', async () => {
      const res = await tenantBApi.get(
        `/api/v1/residents/${tenantAResidentId}`,
      )
      expect([403, 404]).toContain(res.status)
    })

    it('Tenant B nemůže aktualizovat resident Tenantu A → 404/403', async () => {
      const res = await tenantBApi.put(
        `/api/v1/residents/${tenantAResidentId}`,
        { firstName: 'Hacked' },
      )
      expect([403, 404]).toContain(res.status)
    })

    it('Tenant B v seznamu nevidí residenty Tenantu A', async () => {
      const res = await tenantBApi
        .get('/api/v1/residents')
        .expect(200)

      const body = Array.isArray(res.body) ? res.body : res.body.data || []
      const ids = body.map((r: any) => r.id)
      expect(ids).not.toContain(tenantAResidentId)
    })
  })

  // ── Helpdesk isolation ──

  describe('Helpdesk — cross-tenant izolace', () => {
    it('Tenant B nemůže získat ticket Tenantu A → 404/403', async () => {
      const res = await tenantBApi.get(
        `/api/v1/helpdesk/${tenantATicketId}`,
      )
      expect([403, 404]).toContain(res.status)
    })

    it('Tenant B nemůže aktualizovat ticket Tenantu A → 404/403', async () => {
      const res = await tenantBApi.put(
        `/api/v1/helpdesk/${tenantATicketId}`,
        { title: 'Hacked Ticket' },
      )
      expect([403, 404]).toContain(res.status)
    })
  })

  // ── Finance isolation ──

  describe('Finance — cross-tenant izolace', () => {
    it('Tenant B nemůže získat fakturu Tenantu A → 404/403', async () => {
      const res = await tenantBApi.get(
        `/api/v1/finance/invoices/${tenantAInvoiceId}`,
      )
      expect([403, 404]).toContain(res.status)
    })

    it('Tenant B nemůže získat bankovní účet Tenantu A → 404/403', async () => {
      const res = await tenantBApi.get(
        `/api/v1/finance/bank-accounts/${tenantABankAccountId}`,
      )
      expect([403, 404]).toContain(res.status)
    })

    it('Tenant B v seznamu nevidí faktury Tenantu A', async () => {
      const res = await tenantBApi
        .get('/api/v1/finance/invoices')
        .expect(200)

      const body = Array.isArray(res.body) ? res.body : res.body.data || []
      const ids = body.map((i: any) => i.id)
      expect(ids).not.toContain(tenantAInvoiceId)
    })
  })

  // ── Admin isolation ──

  describe('Admin — cross-tenant izolace', () => {
    it('Tenant B nevidí uživatele Tenantu A v seznamu', async () => {
      const res = await tenantBApi
        .get('/api/v1/admin/users')
        .expect(200)

      const emails = (res.body || []).map((u: any) => u.email)
      // Tenant A test user email contains 'test' prefix from createTestApp
      const tenantAEmails = emails.filter((e: string) =>
        e.includes(testApp.tenantId),
      )
      expect(tenantAEmails.length).toBe(0)
    })
  })

  // ── Audit isolation ──

  describe('Audit — cross-tenant izolace', () => {
    it('Tenant B nevidí audit logy Tenantu A', async () => {
      const res = await tenantBApi.get('/api/v1/audit').expect(200)

      const body = Array.isArray(res.body) ? res.body : res.body.data || []
      const tenantALogs = body.filter(
        (l: any) => l.tenantId === testApp.tenantId,
      )
      expect(tenantALogs.length).toBe(0)
    })
  })
})
