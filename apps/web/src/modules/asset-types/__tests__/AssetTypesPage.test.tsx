import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import AssetTypesPage from '../AssetTypesPage'

const MOCK_ASSET_TYPES = [
  {
    id: 'at-1',
    tenantId: 't1',
    name: 'Plynový kotel',
    code: 'KOTEL_PLYN',
    category: 'kotelna',
    description: null,
    manufacturer: 'Buderus',
    model: null,
    defaultLocationLabel: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    _count: { assets: 3, activityAssignments: 2 },
  },
  {
    id: 'at-2',
    tenantId: 't1',
    name: 'EPS ústředna',
    code: 'EPS_USTREDNA',
    category: 'eps',
    description: null,
    manufacturer: null,
    model: null,
    defaultLocationLabel: null,
    isActive: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    _count: { assets: 0, activityAssignments: 0 },
  },
]

vi.mock('../api/asset-types.queries', () => ({
  useAssetTypes: () => ({ data: MOCK_ASSET_TYPES, isLoading: false }),
  useCreateAssetType: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteAssetType: () => ({ mutate: vi.fn(), isPending: false }),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AssetTypesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AssetTypesPage', () => {
  it('renders page title', () => {
    renderPage()
    expect(screen.getByText('Typy zařízení')).toBeTruthy()
  })

  it('renders asset type rows', () => {
    renderPage()
    expect(screen.getByText('Plynový kotel')).toBeTruthy()
    expect(screen.getByText('EPS ústředna')).toBeTruthy()
  })

  it('renders asset type codes', () => {
    renderPage()
    expect(screen.getByText('KOTEL_PLYN')).toBeTruthy()
    expect(screen.getByText('EPS_USTREDNA')).toBeTruthy()
  })

  it('renders active badge for active type', () => {
    renderPage()
    const badges = screen.getAllByText('Ano')
    expect(badges.length).toBeGreaterThanOrEqual(1)
  })

  it('renders activity assignment count badges', () => {
    renderPage()
    // KOTEL_PLYN has 2 assignments
    expect(screen.getByText('2')).toBeTruthy()
  })

  it('renders Nový typ button', () => {
    renderPage()
    expect(screen.getByText('Nový typ')).toBeTruthy()
  })
})
