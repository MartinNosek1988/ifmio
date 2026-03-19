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

  // Security headers — CSP handled at reverse proxy (Caddy/nginx)
  await app.register(helmet as any, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });

  await app.register(compress as any, { global: true, threshold: 1024 });
  await app.register(multipart as any, { limits: { fileSize: 20 * 1024 * 1024 } });

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
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
