import { describe, it, expect, beforeEach } from 'vitest'
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'

describe('apiClient', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('sets Authorization header when token exists in sessionStorage', async () => {
    sessionStorage.setItem('ifmio:access_token', 'test-jwt-token')

    const { apiClient } = await import('../client')

    // @ts-expect-error - accessing internal interceptor handlers
    const fulfilled = apiClient.interceptors.request.handlers[0]?.fulfilled
    expect(fulfilled).toBeTruthy()

    const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig
    const result = await fulfilled!(config)
    expect(result.headers.get('Authorization')).toBe('Bearer test-jwt-token')
  })

  it('does not set Authorization header when no token', async () => {
    const { apiClient } = await import('../client')

    // @ts-expect-error - accessing internal interceptor handlers
    const fulfilled = apiClient.interceptors.request.handlers[0]?.fulfilled
    expect(fulfilled).toBeTruthy()

    const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig
    const result = await fulfilled!(config)
    expect(result.headers.get('Authorization')).toBeUndefined()
  })
})
