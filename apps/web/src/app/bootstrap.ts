import { useAuthStore } from '../core/auth/auth.store';

export function bootstrap() {
  useAuthStore.getState().restoreSession();
}
