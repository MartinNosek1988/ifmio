import { useAuthStore } from '../core/auth-store';

export function bootstrap() {
  useAuthStore.getState().loadUser();
}
