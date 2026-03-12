import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE ?? 'ifmio-web@unknown',

    // Capture 100% of errors, sample 10% of transactions
    tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    // Scrub sensitive data
    beforeSend(event) {
      // Remove auth tokens from breadcrumbs
      if (event.breadcrumbs) {
        for (const crumb of event.breadcrumbs) {
          if (crumb.data?.headers) {
            delete crumb.data.headers['Authorization'];
            delete crumb.data.headers['authorization'];
          }
        }
      }
      return event;
    },

    // Ignore expected errors
    ignoreErrors: [
      // Network errors (user offline, etc.)
      'Network Error',
      'Failed to fetch',
      'Load failed',
      // Auth redirects
      'Request failed with status code 401',
      // Cancelled requests
      'canceled',
      'AbortError',
    ],

    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });
}

export { Sentry };
