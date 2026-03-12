import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE ?? 'ifmio-api@unknown',

    integrations: [nodeProfilingIntegration()],

    // Capture 100% of errors, sample 10% of transactions for performance
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? '0.1'),

    // Scrub sensitive data from requests
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      if (event.request?.data) {
        const data = event.request.data as Record<string, unknown>;
        for (const key of ['password', 'refreshToken', 'accessToken', 'token', 'secret']) {
          if (key in data) {
            data[key] = '[Filtered]';
          }
        }
      }
      return event;
    },

    // Ignore expected 4xx errors
    beforeSendTransaction(event) {
      const status = event.contexts?.response?.status_code as number | undefined;
      if (status && status >= 400 && status < 500) {
        return null;
      }
      return event;
    },
  });
}
