import {
  createTestApp,
  closeTestApp,
  authRequest,
  TestApp,
} from './test.helpers'

describe('Work Orders Extended (e2e)', () => {
  let testApp: TestApp
  let api: ReturnType<typeof authRequest>
  let propertyId: string

  beforeAll(async () => {
    testApp = await createTestApp()
    api = authRequest(testApp.server, testApp.token)

    const propRes = await api
      .post('/api/v1/properties', {
        name: `WO Test Property ${Date.now()}`,
        address: 'Pracovní 1',
        city: 'Brno',
        postalCode: '602 00',
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

  // ── CRUD ──

  describe('CRUD', () => {
    let workOrderId: string

    it('POST /work-orders → vytvoření', async () => {
      const res = await api
        .post('/api/v1/work-orders', {
          title: `Oprava výtahu ${Date.now()}`,
          description: 'Nefunkční výtah v 2. vchodu',
          propertyId,
          workType: 'corrective',
          priority: 'vysoka',
        })
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body.status).toBe('nova')
      expect(res.body.workType).toBe('corrective')
      workOrderId = res.body.id
    })

    it('GET /work-orders → seznam', async () => {
      const res = await api.get('/api/v1/work-orders').expect(200)
      expect(res.body).toBeDefined()
    })

    it('GET /work-orders/:id → detail', async () => {
      if (!workOrderId) return
      const res = await api
        .get(`/api/v1/work-orders/${workOrderId}`)
        .expect(200)
      expect(res.body.id).toBe(workOrderId)
    })

    it('PUT /work-orders/:id → aktualizace', async () => {
      if (!workOrderId) return
      const res = await api
        .put(`/api/v1/work-orders/${workOrderId}`, {
          title: `Updated WO ${Date.now()}`,
          description: 'Aktualizovaný popis',
          propertyId,
          workType: 'corrective',
          priority: 'kriticka',
        })
        .expect(200)
      expect(res.body.priority).toBe('kriticka')
    })

    // ── Status transitions ──

    it('PUT /work-orders/:id/status → nova → v_reseni', async () => {
      if (!workOrderId) return
      const res = await api
        .put(`/api/v1/work-orders/${workOrderId}/status`, {
          status: 'v_reseni',
        })
        .expect(200)
      expect(res.body.status).toBe('v_reseni')
    })

    it('PUT /work-orders/:id/status → v_reseni → vyresena', async () => {
      if (!workOrderId) return
      const res = await api
        .put(`/api/v1/work-orders/${workOrderId}/status`, {
          status: 'vyresena',
        })
        .expect(200)
      expect(res.body.status).toBe('vyresena')
    })

    it('PUT /work-orders/:id/status → vyresena → uzavrena', async () => {
      if (!workOrderId) return
      const res = await api
        .put(`/api/v1/work-orders/${workOrderId}/status`, {
          status: 'uzavrena',
        })
        .expect(200)
      expect(res.body.status).toBe('uzavrena')
    })

    // ── Comments ──

    it('POST /work-orders/:id/comments → komentář', async () => {
      if (!workOrderId) return
      const res = await api
        .post(`/api/v1/work-orders/${workOrderId}/comments`, {
          text: 'Výtah opraven, čekáme na kolaudaci',
        })
        .expect(201)
      expect(res.body).toHaveProperty('id')
    })

    // Cleanup
    afterAll(async () => {
      if (workOrderId) await api.delete(`/api/v1/work-orders/${workOrderId}`)
    })
  })

  // ── Stats & Agenda ──

  describe('Stats & Agenda', () => {
    it('GET /work-orders/stats → statistiky', async () => {
      const res = await api.get('/api/v1/work-orders/stats').expect(200)
      expect(res.body).toBeDefined()
    })

    it('GET /work-orders/my-agenda → denní agenda', async () => {
      const res = await api.get('/api/v1/work-orders/my-agenda').expect(200)
      expect(res.body).toBeDefined()
    })
  })

  // ── Validace ──

  describe('Validace', () => {
    it('WO bez title → 400', async () => {
      await api
        .post('/api/v1/work-orders', {
          propertyId,
          workType: 'corrective',
          priority: 'normalni',
        })
        .expect(400)
    })

    it('WO s neplatným workType → 400', async () => {
      await api
        .post('/api/v1/work-orders', {
          title: 'Bad Type',
          propertyId,
          workType: 'demolition',
          priority: 'normalni',
        })
        .expect(400)
    })

    it('WO s neplatnou priority → 400', async () => {
      await api
        .post('/api/v1/work-orders', {
          title: 'Bad Priority',
          propertyId,
          workType: 'corrective',
          priority: 'mega_urgent',
        })
        .expect(400)
    })
  })

  // ── Všechny workType hodnoty ──

  describe('Všechny workType hodnoty', () => {
    const types = ['corrective', 'preventive', 'inspection', 'emergency']

    for (const workType of types) {
      it(`workType '${workType}' → 201`, async () => {
        const res = await api
          .post('/api/v1/work-orders', {
            title: `WType ${workType} ${Date.now()}`,
            propertyId,
            workType,
            priority: 'normalni',
          })
          .expect(201)
        expect(res.body.workType).toBe(workType)
        await api.delete(`/api/v1/work-orders/${res.body.id}`)
      })
    }
  })

  // ── Cancel flow ──

  describe('Cancel flow', () => {
    it('nova → zrusena', async () => {
      const res = await api
        .post('/api/v1/work-orders', {
          title: `Cancel WO ${Date.now()}`,
          propertyId,
          workType: 'corrective',
          priority: 'nizka',
        })
        .expect(201)

      const cancelRes = await api
        .put(`/api/v1/work-orders/${res.body.id}/status`, {
          status: 'zrusena',
        })
        .expect(200)
      expect(cancelRes.body.status).toBe('zrusena')
      await api.delete(`/api/v1/work-orders/${res.body.id}`)
    })
  })
})
