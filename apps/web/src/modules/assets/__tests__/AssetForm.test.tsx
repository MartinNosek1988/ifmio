import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import AssetForm from '../AssetForm'

const MOCK_ASSET_TYPES = [
  {
    id: 'at-1',
    tenantId: 't1',
    name: 'Plynový kotel',
    code: 'KOTEL_PLYN',
    category: 'kotelna',
    description: null,
    manufacturer: null,
    model: null,
    defaultLocationLabel: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    _count: { assets: 2, activityAssignments: 3 },
  },
]

vi.mock('../../../core/api/client', () => ({
  apiClient: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url === '/properties') return Promise.resolve({ data: [] })
      if (url === '/asset-types') return Promise.resolve({ data: MOCK_ASSET_TYPES })
      return Promise.resolve({ data: [] })
    }),
    post: vi.fn().mockResolvedValue({ data: { id: 'new-asset' } }),
  },
}))

function renderForm() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AssetForm onClose={vi.fn()} />
    </QueryClientProvider>,
  )
}

describe('AssetForm', () => {
  it('renders form title', () => {
    renderForm()
    expect(screen.getByText('Nové zařízení')).toBeTruthy()
  })

  it('renders required Název field', () => {
    renderForm()
    expect(screen.getByTestId('asset-form-name')).toBeTruthy()
  })

  it('renders Typ zařízení field', () => {
    renderForm()
    expect(screen.getByTestId('asset-form-category')).toBeTruthy()
  })

  it('renders Kategorie field', () => {
    renderForm()
    expect(screen.getByText('Kategorie')).toBeTruthy()
  })

  it('renders Vytvořit button', () => {
    renderForm()
    expect(screen.getByTestId('asset-form-save')).toBeTruthy()
  })
})
