import {
  createTestApp,
  closeTestApp,
  authRequest,
  TestApp,
} from './test.helpers'

describe('Notifications (e2e)', () => {
  let testApp: TestApp
  let api: ReturnType<typeof authRequest>

  beforeAll(async () => {
    testApp = await createTestApp()
    api = authRequest(testApp.server, testApp.token)
  }, 30_000)

  afterAll(async () => {
    await closeTestApp(testApp)
  })

  it('GET /notifications → seznam notifikací', async () => {
    const res = await api.get('/api/v1/notifications').expect(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('GET /notifications/unread-count → počet nepřečtených', async () => {
    const res = await api
      .get('/api/v1/notifications/unread-count')
      .expect(200)
    expect(res.body).toHaveProperty('count')
    expect(typeof res.body.count).toBe('number')
  })

  it('PATCH /notifications/read-all → označení všech jako přečtené', async () => {
    await api.patch('/api/v1/notifications/read-all', {}).expect(200)
  })
})
