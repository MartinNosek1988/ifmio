interface ApiError {
  status: number
  message: string
  details?: Record<string, string[]>
}

interface ErrorHandlerOptions {
  toast?: (msg: string, type: 'error' | 'warning' | 'info') => void
  navigate?: (path: string) => void
  setFieldErrors?: (errors: Record<string, string>) => void
}

/**
 * Centralized API error handler per HTTP status code.
 * Maps status codes to Czech user-facing messages.
 */
export function handleApiError(error: ApiError, options?: ErrorHandlerOptions): void {
  const { toast, navigate, setFieldErrors } = options ?? {}

  switch (error.status) {
    case 400:
    case 422:
      // Validation errors → map to form fields
      if (error.details && setFieldErrors) {
        const mapped = Object.fromEntries(
          Object.entries(error.details).map(([key, msgs]) => [key, msgs[0]]),
        )
        setFieldErrors(mapped)
      }
      toast?.(error.message || 'Neplatný požadavek', 'error')
      break

    case 401:
      toast?.('Relace vypršela, přihlaste se znovu', 'warning')
      navigate?.('/login')
      break

    case 403:
      toast?.('Nemáte oprávnění pro tuto akci', 'error')
      break

    case 404:
      toast?.('Záznam nebyl nalezen', 'error')
      break

    case 409:
      toast?.('Záznam byl mezitím upraven jiným uživatelem. Obnovte stránku.', 'warning')
      break

    case 500:
    default:
      toast?.('Došlo k chybě, zkuste to znovu', 'error')
      break
  }
}

/**
 * Extract ApiError from Axios error or generic Error.
 */
export function parseApiError(err: unknown): ApiError {
  if (err && typeof err === 'object' && 'response' in err) {
    const axiosErr = err as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } }
    return {
      status: axiosErr.response?.status ?? 500,
      message: axiosErr.response?.data?.message ?? 'Neznámá chyba',
      details: axiosErr.response?.data?.errors,
    }
  }
  if (err instanceof Error) {
    return { status: 0, message: err.message }
  }
  return { status: 0, message: 'Neznámá chyba' }
}
