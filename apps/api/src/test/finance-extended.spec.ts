import {
  createTestApp,
  closeTestApp,
  authRequest,
  TestApp,
} from './test.helpers'

describe('Finance Extended (e2e)', () => {
  let testApp: TestApp
  let api: ReturnType<typeof authRequest>
  let propertyId: string

  beforeAll(async () => {
    testApp = await createTestApp()
    api = authRequest(testApp.server, testApp.token)

    const propRes = await api
      .post('/api/v1/properties', {
        name: `Finance Test Property ${Date.now()}`,
        address: 'Finanční 1',
        city: 'Praha',
        postalCode: '110 00',
        type: 'SVJ',
        ownership: 'vlastnictvi',
      })
      .expect(201)
    propertyId = propRes.body.id
  }, 30_000)

  afterAll(async () => {
    if (propertyId) await api.delete(`/api/v1/properties/${propertyId}`)
    await closeTestApp(testApp)
  })

  // ── Bankovní účty ──

  describe('Bank Accounts CRUD', () => {
    let bankAccountId: string

    it('POST /finance/bank-accounts → vytvoření účtu', async () => {
      const res = await api
        .post('/api/v1/finance/bank-accounts', {
          name: `Test Účet ${Date.now()}`,
          accountNumber: `${Date.now()}`.slice(-10),
          bankCode: '0100',
          currency: 'CZK',
          propertyId,
        })
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body).toHaveProperty('name')
      expect(res.body.bankCode).toBe('0100')
      bankAccountId = res.body.id
    })

    it('GET /finance/bank-accounts → seznam', async () => {
      const res = await api
        .get('/api/v1/finance/bank-accounts')
        .expect(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('GET /finance/bank-accounts/:id → detail', async () => {
      if (!bankAccountId) return
      const res = await api
        .get(`/api/v1/finance/bank-accounts/${bankAccountId}`)
        .expect(200)
      expect(res.body.id).toBe(bankAccountId)
    })

    it('PATCH /finance/bank-accounts/:id → aktualizace', async () => {
      if (!bankAccountId) return
      const res = await api
        .patch(`/api/v1/finance/bank-accounts/${bankAccountId}`, {
          name: `Updated Účet ${Date.now()}`,
        })
        .expect(200)
      expect(res.body.name).toContain('Updated')
    })

    it('DELETE /finance/bank-accounts/:id → smazání', async () => {
      if (!bankAccountId) return
      await api
        .delete(`/api/v1/finance/bank-accounts/${bankAccountId}`)
        .expect(204)
    })

    it('POST bez name → 400', async () => {
      await api
        .post('/api/v1/finance/bank-accounts', {
          accountNumber: '9999999999',
          bankCode: '0100',
          propertyId,
        })
        .expect(400)
    })
  })

  // ── Faktury ──

  describe('Invoices CRUD', () => {
    let invoiceId: string

    it('POST /finance/invoices → vytvoření přijaté faktury', async () => {
      const res = await api
        .post('/api/v1/finance/invoices', {
          number: `FV-${Date.now()}`,
          type: 'received',
          supplierName: 'Dodavatel s.r.o.',
          supplierIco: '12345678',
          supplierDic: 'CZ12345678',
          buyerName: 'Test SVJ',
          amountBase: 10000,
          vatRate: 21,
          vatAmount: 2100,
          amountTotal: 12100,
          issueDate: '2026-03-01',
          dueDate: '2026-04-01',
          variableSymbol: `${Date.now()}`.slice(-10),
          propertyId,
        })
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body.type).toBe('received')
      expect(Number(res.body.amountTotal)).toBe(12100)
      invoiceId = res.body.id
    })

    it('GET /finance/invoices → seznam', async () => {
      const res = await api.get('/api/v1/finance/invoices').expect(200)
      const body = Array.isArray(res.body) ? res.body : res.body.data || []
      expect(body.length).toBeGreaterThanOrEqual(1)
    })

    it('GET /finance/invoices/:id → detail', async () => {
      if (!invoiceId) return
      const res = await api
        .get(`/api/v1/finance/invoices/${invoiceId}`)
        .expect(200)
      expect(res.body.id).toBe(invoiceId)
      expect(res.body.supplierName).toBe('Dodavatel s.r.o.')
    })

    it('PUT /finance/invoices/:id → aktualizace', async () => {
      if (!invoiceId) return
      const res = await api
        .put(`/api/v1/finance/invoices/${invoiceId}`, {
          number: `FV-UPD-${Date.now()}`,
          type: 'received',
          supplierName: 'Updated Dodavatel a.s.',
          amountTotal: 15000,
          issueDate: '2026-03-01',
          dueDate: '2026-04-15',
        })
        .expect(200)
      expect(res.body.supplierName).toContain('Updated')
    })

    it('GET /finance/invoices/:id/payment-qr → QR kód', async () => {
      if (!invoiceId) return
      const res = await api
        .get(`/api/v1/finance/invoices/${invoiceId}/payment-qr`)
      // QR may return 200 with image or 204 if no payment info
      expect([200, 204]).toContain(res.status)
    })

    it('POST bez number → 400', async () => {
      await api
        .post('/api/v1/finance/invoices', {
          type: 'received',
          supplierName: 'Test',
          amountTotal: 1000,
          issueDate: '2026-03-01',
          dueDate: '2026-04-01',
          propertyId,
        })
        .expect(400)
    })

    it('POST s neplatným type → 400', async () => {
      await api
        .post('/api/v1/finance/invoices', {
          number: `BAD-${Date.now()}`,
          type: 'neplatny_typ',
          supplierName: 'Test',
          amountTotal: 1000,
          issueDate: '2026-03-01',
          dueDate: '2026-04-01',
          propertyId,
        })
        .expect(400)
    })

    // ── Approval workflow ──

    describe('Approval workflow', () => {
      let workflowInvoiceId: string

      beforeAll(async () => {
        const res = await api
          .post('/api/v1/finance/invoices', {
            number: `WF-${Date.now()}`,
            type: 'received',
            supplierName: 'Workflow Dodavatel',
            amountTotal: 5000,
            issueDate: '2026-03-01',
            dueDate: '2026-04-01',
            propertyId,
          })
          .expect(201)
        workflowInvoiceId = res.body.id
      })

      afterAll(async () => {
        if (workflowInvoiceId) {
          await api.delete(`/api/v1/finance/invoices/${workflowInvoiceId}`)
        }
      })

      it('draft → submitted', async () => {
        const res = await api
          .post(
            `/api/v1/finance/invoices/${workflowInvoiceId}/submit`,
            {},
          )
          .expect(201)
        expect(res.body.approvalStatus).toBe('submitted')
      })

      it('submitted → approved', async () => {
        const res = await api
          .post(
            `/api/v1/finance/invoices/${workflowInvoiceId}/approve`,
            {},
          )
          .expect(201)
        expect(res.body.approvalStatus).toBe('approved')
      })

      it('approved → return-to-draft', async () => {
        const res = await api
          .post(
            `/api/v1/finance/invoices/${workflowInvoiceId}/return-to-draft`,
            {},
          )
          .expect(201)
        expect(res.body.approvalStatus).toBe('draft')
      })
    })

    // ── Kopie faktury ──

    it('POST /finance/invoices/:id/copy → kopie faktury', async () => {
      if (!invoiceId) return
      const res = await api
        .post(`/api/v1/finance/invoices/${invoiceId}/copy`, {})
        .expect(201)
      expect(res.body).toHaveProperty('id')
      expect(res.body.id).not.toBe(invoiceId)
      // Cleanup copy
      await api.delete(`/api/v1/finance/invoices/${res.body.id}`)
    })

    // ── Komentáře ──

    it('POST /finance/invoices/:id/comments → přidání komentáře', async () => {
      if (!invoiceId) return
      const res = await api
        .post(`/api/v1/finance/invoices/${invoiceId}/comments`, {
          body: 'Testovací komentář k faktuře',
        })
        .expect(201)
      expect(res.body).toHaveProperty('id')
      expect(res.body.body).toBe('Testovací komentář k faktuře')
    })

    it('GET /finance/invoices/:id/comments → seznam komentářů', async () => {
      if (!invoiceId) return
      const res = await api
        .get(`/api/v1/finance/invoices/${invoiceId}/comments`)
        .expect(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    // ── Alokace ──

    describe('Invoice Allocations', () => {
      let allocationId: string
      let componentId: string

      beforeAll(async () => {
        // Vytvoř PrescriptionComponent pro alokaci
        const compRes = await api
          .post('/api/v1/finance/components', {
            name: `Alloc Comp ${Date.now()}`,
            componentType: 'ADVANCE',
            calculationMethod: 'FIXED',
            defaultAmount: 1000,
            effectiveFrom: '2026-01-01',
            propertyId,
          })
        if (compRes.status === 201) {
          componentId = compRes.body.id
        }
      })

      afterAll(async () => {
        if (componentId) {
          await api.delete(`/api/v1/finance/components/${componentId}`)
        }
      })

      it('POST /finance/invoices/:id/allocations → vytvoření', async () => {
        if (!invoiceId || !componentId) return
        const res = await api
          .post(`/api/v1/finance/invoices/${invoiceId}/allocations`, {
            componentId,
            amount: 5000,
            vatRate: 21,
            vatAmount: 1050,
            year: 2026,
            periodFrom: '2026-01-01',
            periodTo: '2026-12-31',
          })
          .expect(201)
        expect(res.body).toHaveProperty('id')
        allocationId = res.body.id
      })

      it('DELETE /finance/invoices/:id/allocations/:allocationId → smazání', async () => {
        if (!allocationId || !invoiceId) return
        await api
          .delete(
            `/api/v1/finance/invoices/${invoiceId}/allocations/${allocationId}`,
          )
          .expect(200)
      })
    })

    // Cleanup invoice
    afterAll(async () => {
      if (invoiceId) await api.delete(`/api/v1/finance/invoices/${invoiceId}`)
    })
  })

  // ── Invoice type hodnoty ──

  describe('Všechny invoice type hodnoty', () => {
    const types = ['received', 'issued', 'proforma', 'credit_note', 'internal']

    for (const type of types) {
      it(`type '${type}' → 201`, async () => {
        const res = await api
          .post('/api/v1/finance/invoices', {
            number: `TYPE-${type}-${Date.now()}`,
            type,
            supplierName: 'Type Test',
            amountTotal: 1000,
            issueDate: '2026-03-01',
            dueDate: '2026-04-01',
            propertyId,
          })
          .expect(201)
        expect(res.body.type).toBe(type)
        await api.delete(`/api/v1/finance/invoices/${res.body.id}`)
      })
    }
  })

  // ── Předpisy ──

  describe('Prescriptions CRUD', () => {
    it('GET /finance/prescriptions → seznam', async () => {
      const res = await api
        .get('/api/v1/finance/prescriptions')
        .expect(200)
      expect(res.body).toBeDefined()
    })
  })

  // ── Billing periods ──

  describe('Billing Periods', () => {
    it('GET /finance/billing-periods → seznam', async () => {
      const res = await api
        .get('/api/v1/finance/billing-periods')
        .expect(200)
      expect(res.body).toBeDefined()
    })

    it('POST /finance/billing-periods → vytvoření', async () => {
      const res = await api
        .post('/api/v1/finance/billing-periods', {
          name: `Období ${Date.now()}`,
          dateFrom: '2026-01-01',
          dateTo: '2026-12-31',
          propertyId,
        })
        .expect(201)
      expect(res.body).toHaveProperty('id')
    })
  })

  // ── Summary ──

  describe('Finance Summary', () => {
    it('GET /finance/summary → přehled', async () => {
      const res = await api.get('/api/v1/finance/summary').expect(200)
      expect(res.body).toBeDefined()
    })
  })

  // ── Stats ──

  describe('Invoice Stats', () => {
    it('GET /finance/invoices/stats → statistiky', async () => {
      const res = await api
        .get('/api/v1/finance/invoices/stats')
        .expect(200)
      expect(res.body).toBeDefined()
    })
  })
})
