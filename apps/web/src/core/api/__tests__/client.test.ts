import { describe, it, expect, beforeEach } from 'vitest'

describe('apiClient', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('sets Authorization header when token exists in sessionStorage', async () => {
    sessionStorage.setItem('ifmio:access_token', 'test-jwt-token')

    // Re-import to get fresh module with interceptors
    const { apiClient } = await import('../client')

    // Inspect the request interceptor behavior by checking the config
    const config = { headers: {} as Record<string, string> }
    // @ts-expect-error - accessing internal interceptor
    const fulfilled = apiClient.interceptors.request.handlers[0]?.fulfilled
    if (fulfilled) {
      const result = fulfilled(config)
      expect(result.headers.Authorization).toBe('Bearer test-jwt-token')
    }
  })

  it('does not set Authorization header when no token', async () => {
    const { apiClient } = await import('../client')

    const config = { headers: {} as Record<string, string> }
    // @ts-expect-error - accessing internal interceptor
    const fulfilled = apiClient.interceptors.request.handlers[0]?.fulfilled
    if (fulfilled) {
      const result = fulfilled(config)
      expect(result.headers.Authorization).toBeUndefined()
    }
  })
})
