// Sentry must be initialized before React
import './core/sentry';
import './core/i18n';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { ToastProvider } from './shared/components/toast/Toast';
import { ConfirmDialogProvider } from './shared/components/ConfirmDialog';
import { bootstrap } from './app/bootstrap';
import { router } from './app/router';
import './styles/globals.css';

if (import.meta.env.DEV) {
  const { seedLocalStorage } = await import('./dev/seedData');
  seedLocalStorage();
}

bootstrap();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ConfirmDialogProvider>
            <RouterProvider router={router} />
          </ConfirmDialogProvider>
        </ToastProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
);

// Register Service Worker (production only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed — app works fine without it
    });
  });
}
