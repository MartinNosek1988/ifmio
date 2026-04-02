import {
  createTestApp,
  closeTestApp,
  authRequest,
  TestApp,
} from './test.helpers'

describe('Security — XSS Prevention (e2e)', () => {
  let testApp: TestApp
  let api: ReturnType<typeof authRequest>
  let propertyId: string

  beforeAll(async () => {
    testApp = await createTestApp()
    api = authRequest(testApp.server, testApp.token)

    const propRes = await api
      .post('/api/v1/properties', {
        name: 'XSS Test Property',
        address: 'Bezpečná 1',
        city: 'Praha',
        postalCode: '110 00',
        type: 'bytdum',
        ownership: 'vlastnictvi',
      })
      .expect(201)
    propertyId = propRes.body.id
  }, 30_000)

  afterAll(async () => {
    if (propertyId) await api.delete(`/api/v1/properties/${propertyId}`)
    await closeTestApp(testApp)
  })

  describe('Property — XSS v textových polích', () => {
    it('script tag v name je stripnut', async () => {
      const res = await api
        .post('/api/v1/properties', {
          name: '<script>alert(1)</script>Bezpečný Dům',
          address: 'Testovací 1',
          city: 'Praha',
          postalCode: '110 00',
          type: 'bytdum',
          ownership: 'vlastnictvi',
        })
        .expect(201)

      expect(res.body.name).not.toContain('<script>')
      expect(res.body.name).toContain('Bezpečný Dům')

      // Cleanup
      await api.delete(`/api/v1/properties/${res.body.id}`)
    })

    it('img onerror v address je stripnut', async () => {
      const res = await api
        .post('/api/v1/properties', {
          name: `XSS Addr ${Date.now()}`,
          address: '<img onerror=alert(1) src=x>Ulice 1',
          city: 'Praha',
          postalCode: '110 00',
          type: 'bytdum',
          ownership: 'vlastnictvi',
        })
        .expect(201)

      expect(res.body.address).not.toContain('<img')
      expect(res.body.address).not.toContain('onerror')
      await api.delete(`/api/v1/properties/${res.body.id}`)
    })
  })

  describe('Resident — XSS v jméně', () => {
    it('HTML tagy v firstName jsou stripnuty', async () => {
      const res = await api
        .post('/api/v1/residents', {
          firstName: '<b>Bold</b>',
          lastName: 'Test',
          role: 'owner',
        })
        .expect(201)

      expect(res.body.firstName).not.toContain('<b>')
      expect(res.body.firstName).toBe('Bold')
      await api.delete(`/api/v1/residents/${res.body.id}`)
    })

    it('javascript href v lastName je stripnut', async () => {
      const res = await api
        .post('/api/v1/residents', {
          firstName: 'Jan',
          lastName: '<a href="javascript:void(0)">Link</a>',
          role: 'owner',
        })
        .expect(201)

      expect(res.body.lastName).not.toContain('<a')
      expect(res.body.lastName).not.toContain('javascript')
      await api.delete(`/api/v1/residents/${res.body.id}`)
    })
  })

  describe('Helpdesk — XSS v ticket title a description', () => {
    it('script tag v title je stripnut', async () => {
      const res = await api
        .post('/api/v1/helpdesk', {
          title: '<script>document.cookie</script>Oprávněný požadavek',
          description: 'Popis',
          propertyId,
          category: 'general',
          priority: 'low',
        })
        .expect(201)

      expect(res.body.title).not.toContain('<script>')
      expect(res.body.title).toContain('Oprávněný požadavek')
      await api.delete(`/api/v1/helpdesk/${res.body.id}`)
    })

    it('iframe v description je stripnut', async () => {
      const res = await api
        .post('/api/v1/helpdesk', {
          title: `XSS Desc ${Date.now()}`,
          description: '<iframe src="evil.com"></iframe>Bezpečný popis',
          propertyId,
          category: 'general',
          priority: 'low',
        })
        .expect(201)

      expect(res.body.description).not.toContain('<iframe')
      expect(res.body.description).toContain('Bezpečný popis')
      await api.delete(`/api/v1/helpdesk/${res.body.id}`)
    })
  })

  describe('Work Order — XSS v title', () => {
    it('svg/onload v title je stripnut', async () => {
      const res = await api
        .post('/api/v1/work-orders', {
          title: '<svg/onload=alert(1)>Oprava',
          propertyId,
          workType: 'corrective',
          priority: 'normalni',
        })
        .expect(201)

      expect(res.body.title).not.toContain('<svg')
      expect(res.body.title).not.toContain('onload')
      await api.delete(`/api/v1/work-orders/${res.body.id}`)
    })
  })

  describe('Invoice — XSS v supplierName', () => {
    it('div onmouseover v supplierName je stripnut', async () => {
      const res = await api
        .post('/api/v1/finance/invoices', {
          number: `XSS-${Date.now()}`,
          type: 'received',
          supplierName: '<div onmouseover=alert(1)>Firma s.r.o.</div>',
          amountTotal: 1000,
          issueDate: '2026-03-01',
          dueDate: '2026-04-01',
          propertyId,
        })
        .expect(201)

      expect(res.body.supplierName).not.toContain('<div')
      expect(res.body.supplierName).not.toContain('onmouseover')
      expect(res.body.supplierName).toContain('Firma s.r.o.')
      await api.delete(`/api/v1/finance/invoices/${res.body.id}`)
    })
  })

  describe('SQL injection v search polích', () => {
    it('SQL injection v residents search → bezpečné', async () => {
      const res = await api
        .get("/api/v1/residents?search='; DROP TABLE \"User\"--")
        .expect(200)

      expect(Array.isArray(res.body.data || res.body)).toBe(true)
    })

    it('SQL injection v helpdesk search → bezpečné', async () => {
      const res = await api
        .get("/api/v1/helpdesk?search=' OR 1=1--")
        .expect(200)

      expect(res.body).toBeDefined()
    })
  })
})
