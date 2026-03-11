import request from 'supertest'
import { Test } from '@nestjs/testing'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { Controller, Post, Module, HttpCode } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerBehindProxyGuard } from '../common/guards/throttler-behind-proxy.guard'

/** Minimal controller to test throttling in isolation */
@Controller('test')
class TestThrottleController {
  @Post('hit')
  @HttpCode(200)
  hit() {
    return { ok: true }
  }
}

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 3 }],
    }),
  ],
  controllers: [TestThrottleController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerBehindProxyGuard }],
})
class TestThrottleModule {}

describe('Rate limiting (ThrottlerBehindProxyGuard)', () => {
  let app: NestFastifyApplication
  let server: any

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [TestThrottleModule],
    }).compile()

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    )
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
    server = app.getHttpServer()
  }, 15_000)

  afterAll(async () => {
    await app.close()
  })

  it('allows requests within the limit', async () => {
    for (let i = 0; i < 3; i++) {
      await request(server).post('/test/hit').expect(200)
    }
  })

  it('returns 429 when rate limit is exceeded', async () => {
    // The 3 requests from the previous test already used up the limit
    const res = await request(server).post('/test/hit')
    expect(res.status).toBe(429)
  })
})
