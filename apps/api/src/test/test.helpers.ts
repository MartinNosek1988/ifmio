import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { AppModule } from '../app.module'
import request from 'supertest'

export interface TestApp {
  app: INestApplication
  server: any
  token: string
  tenantId: string
}

export async function createTestApp(): Promise<TestApp> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  )
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.setGlobalPrefix('api/v1')
  await app.init()
  await app.getHttpAdapter().getInstance().ready()

  const server = app.getHttpServer()

  // Create test user and get token
  const registerRes = await request(server)
    .post('/api/v1/auth/register')
    .send({
      tenantName: `Test Tenant ${Date.now()}`,
      name: 'Test User',
      email: `test${Date.now()}@test.cz`,
      password: 'testpass123',
    })

  const token = registerRes.body.accessToken
  const tenantId = registerRes.body.user?.tenantId

  return { app, server, token, tenantId }
}

export async function closeTestApp(testApp: TestApp): Promise<void> {
  await testApp.app.close()
}

export function authRequest(server: any, token: string) {
  return {
    get: (url: string) =>
      request(server).get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string, body?: any) =>
      request(server).post(url).set('Authorization', `Bearer ${token}`).send(body),
    patch: (url: string, body?: any) =>
      request(server).patch(url).set('Authorization', `Bearer ${token}`).send(body),
    delete: (url: string) =>
      request(server).delete(url).set('Authorization', `Bearer ${token}`),
  }
}
