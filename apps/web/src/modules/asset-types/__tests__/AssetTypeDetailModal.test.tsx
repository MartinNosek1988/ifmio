import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import AssetTypeDetailModal from '../AssetTypeDetailModal'
import type { ApiAssetType } from '../api/asset-types.api'

const MOCK_ASSET_TYPE: ApiAssetType = {
  id: 'at-1',
  tenantId: 't1',
  name: 'Plynový kotel',
  code: 'KOTEL_PLYN',
  category: 'kotelna',
  description: 'Testovací kotel',
  manufacturer: 'Buderus',
  model: null,
  defaultLocationLabel: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  _count: { assets: 1, activityAssignments: 2 },
}

const MOCK_ASSIGNMENTS = [
  {
    id: 'a-1',
    tenantId: 't1',
    assetTypeId: 'at-1',
    revisionTypeId: 'rt-1',
    isRequired: true,
    intervalDaysOverride: 180,
    reminderDaysOverride: null,
    graceDaysOverride: null,
    requiresProtocolOverride: null,
    requiresSupplierSignatureOverride: null,
    requiresCustomerSignatureOverride: null,
    note: 'Override na 180 dní',
    sortOrder: 0,
    revisionType: {
      id: 'rt-1',
      code: 'ROCNI_SERVIS',
      name: 'Roční servis kotle',
      color: null,
      defaultIntervalDays: 365,
      defaultReminderDaysBefore: 30,
      requiresProtocol: true,
      requiresSupplierSignature: true,
      requiresCustomerSignature: false,
      graceDaysAfterEvent: 14,
    },
  },
]

vi.mock('../api/asset-types.queries', () => ({
  useAssetTypeAssignments: () => ({ data: MOCK_ASSIGNMENTS, isLoading: false }),
  useCreateAssignment: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateAssignment: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteAssignment: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateAssetType: () => ({ mutate: vi.fn(), isPending: false }),
  useAssetTypePreview: () => ({
    data: [
      {
        revisionTypeId: 'rt-1',
        code: 'ROCNI_SERVIS',
        name: 'Roční servis kotle',
        color: null,
        isRequired: true,
        effectiveIntervalDays: 180,
        effectiveReminderDays: 30,
        effectiveGraceDays: 14,
        effectiveRequiresProtocol: true,
        effectiveRequiresSupplierSignature: true,
        effectiveRequiresCustomerSignature: false,
        note: null,
        sortOrder: 0,
      },
    ],
  }),
}))

vi.mock('../../revisions/api/revisions.queries', () => ({
  useRevisionTypes: () => ({ data: [] }),
}))

function renderModal() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AssetTypeDetailModal assetType={MOCK_ASSET_TYPE} onClose={vi.fn()} />
    </QueryClientProvider>,
  )
}

describe('AssetTypeDetailModal', () => {
  it('renders asset type name in title', () => {
    renderModal()
    expect(screen.getByText('Plynový kotel')).toBeTruthy()
  })

  it('renders Přiřazené činnosti tab by default', () => {
    renderModal()
    expect(screen.getByText(/Přiřazené činnosti/)).toBeTruthy()
  })

  it('renders assignment rows with revision type name', () => {
    renderModal()
    expect(screen.getByText('Roční servis kotle')).toBeTruthy()
  })

  it('shows overridden interval (180d)', () => {
    renderModal()
    expect(screen.getByText('180d')).toBeTruthy()
  })

  it('renders Přiřadit činnost button', () => {
    renderModal()
    expect(screen.getByText('Přiřadit činnost')).toBeTruthy()
  })

  it('renders Náhled pravidel tab', () => {
    renderModal()
    expect(screen.getByText('Náhled pravidel')).toBeTruthy()
  })

  it('renders Nastavení tab', () => {
    renderModal()
    expect(screen.getByText('Nastavení')).toBeTruthy()
  })
})
