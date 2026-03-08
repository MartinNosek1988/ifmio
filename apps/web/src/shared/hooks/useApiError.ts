import { AxiosError } from 'axios';

interface ApiErrorData {
  statusCode: number;
  message: string | string[];
  path?: string;
  timestamp?: string;
}

export function useApiError() {
  const parseError = (error: unknown): string => {
    if (error instanceof AxiosError) {
      const data = error.response?.data as ApiErrorData | undefined;
      if (!data) return 'Chyba sítě — zkontrolujte připojení';
      if (Array.isArray(data.message)) return data.message.join(', ');
      return data.message ?? 'Neočekávaná chyba';
    }
    if (error instanceof Error) return error.message;
    return 'Neočekávaná chyba';
  };

  return { parseError };
}
