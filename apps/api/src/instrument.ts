const dsn = process.env.SENTRY_DSN;

if (dsn) {
  try {
    // Dynamic imports — @sentry/profiling-node has native bindings that may
    // fail on Alpine/musl. Lazy-load only when SENTRY_DSN is configured.
    const Sentry = require('@sentry/nestjs');
    let integrations: any[] = [];

    try {
      const { nodeProfilingIntegration } = require('@sentry/profiling-node');
      integrations = [nodeProfilingIntegration()];
    } catch {
      // Profiling unavailable (native module failed to load on Alpine) — continue without it
      console.warn('[Sentry] Profiling integration unavailable, continuing without it');
    }

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? 'development',
      release: process.env.SENTRY_RELEASE ?? 'ifmio-api@unknown',

      integrations,

      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? '0.1'),

      beforeSend(event: any) {
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

      beforeSendTransaction(event: any) {
        const status = event.contexts?.response?.status_code as number | undefined;
        if (status && status >= 400 && status < 500) {
          return null;
        }
        return event;
      },
    });
  } catch (err) {
    console.warn('[Sentry] Failed to initialize:', err instanceof Error ? err.message : err);
  }
}
