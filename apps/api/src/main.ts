// Sentry must be initialized before any other imports
import './instrument';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SanitizePipe } from './common/pipes/sanitize.pipe';
import multipart from '@fastify/multipart';

function validateEnv() {
  const required = ['JWT_SECRET', 'DATABASE_URL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'See .env.example for reference.',
    );
  }
  if ((process.env.JWT_SECRET ?? '').length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters. ' +
      'Generate one with: openssl rand -base64 48',
    );
  }
}

async function bootstrap() {
  validateEnv();
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env.NODE_ENV === 'development' }),
  );

  app.useLogger(app.get(PinoLogger));

  // Security headers (defense-in-depth — Caddy also sets headers)
  await app.register(helmet as any, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: process.env.NODE_ENV === 'development' ? ["'self'", "'unsafe-inline'"] : ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],  // styles need unsafe-inline for CSS-in-JS
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "https://ags.cuzk.gov.cz", "https://ares.gov.cz"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' as const },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' as const },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  });

  await app.register(compress as any, { global: true, threshold: 1024 });
  await app.register(multipart as any, { limits: { fileSize: 20 * 1024 * 1024 } });

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? [process.env.CORS_ORIGIN ?? 'https://ifmio.com'].filter(Boolean)
      : [process.env.CORS_ORIGIN ?? 'http://localhost:5173', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  });

  app.useGlobalPipes(
    new SanitizePipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // enableImplicitConversion REMOVED — it coerces objects to "[object Object]"
      // which bypasses @IsString() validation. Use explicit @Type() decorators instead.
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  if (process.env.NODE_ENV !== 'production') {
    try {
      const config = new DocumentBuilder()
        .setTitle('ifmio API')
        .setDescription('ifmio Property Management Platform API')
        .setVersion('1.0')
        .addBearerAuth()
        .addTag('Health')
        .addTag('Auth')
        .addTag('Properties')
        .build();
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document);
      logger.log(
        `Swagger: http://localhost:${process.env.PORT ?? 3000}/api/docs`,
      );
    } catch (err) {
      logger.warn('Swagger setup skipped: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port as number, '0.0.0.0');
  logger.log(`ifmio API: http://localhost:${port}/api/v1`);
}

bootstrap();
