import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import ProtocolPanel from '../ProtocolPanel'

const mockProtocol = {
  id: '1',
  tenantId: 't1',
  number: 'PROT-HD-0001',
  status: 'draft',
  protocolType: 'work_report',
  sourceType: 'helpdesk',
  sourceId: 's1',
  title: 'Test protokol',
  description: 'Popis',
  propertyId: null,
  property: null,
  supplierSnapshot: null,
  customerSnapshot: null,
  requesterName: 'Jan Novák',
  dispatcherName: null,
  resolverName: 'Petr Řešitel',
  categoryLabel: null,
  activityLabel: null,
  spaceLabel: null,
  tenantUnitLabel: null,
  submittedAt: null,
  dueAt: null,
  completedAt: null,
  handoverAt: null,
  transportKm: null,
  transportMode: null,
  transportDescription: null,
  publicNote: null,
  internalNote: null,
  satisfaction: null,
  satisfactionComment: null,
  supplierSignatureName: null,
  customerSignatureName: null,
  supplierSignedAt: null,
  customerSignedAt: null,
  generatedPdfDocumentId: null,
  signedDocumentId: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  lines: [],
}

vi.mock('../api/protocols.queries', () => ({
  useProtocolsBySource: () => ({
    data: [mockProtocol],
    isLoading: false,
  }),
  useGenerateProtocol: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  useCompleteProtocol: () => ({ mutate: vi.fn(), isPending: false }),
  useConfirmProtocol: () => ({ mutate: vi.fn(), isPending: false }),
  useAddProtocolLine: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteProtocolLine: () => ({ mutate: vi.fn(), isPending: false }),
  useGeneratePdf: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  useUploadSignedProtocol: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))

vi.mock('../../../core/api/client', () => ({
  apiClient: { defaults: { baseURL: 'http://localhost:3000/api/v1' } },
}))

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ProtocolPanel sourceType="helpdesk" sourceId="s1" />
    </QueryClientProvider>,
  )
}

describe('ProtocolPanel', () => {
  it('renders protocol number and status', () => {
    renderPanel()
    expect(screen.getByText('PROT-HD-0001')).toBeInTheDocument()
    expect(screen.getByText('Rozpracovaný')).toBeInTheDocument()
  })

  it('renders documents section with PDF buttons', () => {
    renderPanel()
    expect(screen.getByText('Dokumenty')).toBeInTheDocument()
    expect(screen.getByText('Vygenerovat PDF')).toBeInTheDocument()
    expect(screen.getByText('Nahrát podepsaný')).toBeInTheDocument()
  })

  it('renders complete button for draft', () => {
    renderPanel()
    expect(screen.getByText('Dokončit předání')).toBeInTheDocument()
  })

  it('renders metadata', () => {
    renderPanel()
    expect(screen.getByText('Jan Novák')).toBeInTheDocument()
    expect(screen.getByText('Petr Řešitel')).toBeInTheDocument()
  })
})
