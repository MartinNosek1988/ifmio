import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import ProtocolsPage from '../ProtocolsPage'

vi.mock('../api/protocols.queries', () => ({
  useProtocols: () => ({
    data: { data: [], total: 0, page: 1, limit: 20, totalPages: 0 },
    isLoading: false,
    error: null,
  }),
  useDeleteProtocol: () => ({ mutate: vi.fn(), isPending: false }),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProtocolsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProtocolsPage', () => {
  it('renders page title', () => {
    renderPage()
    expect(screen.getByText('Protokoly')).toBeInTheDocument()
  })

  it('renders filter selects', () => {
    renderPage()
    expect(screen.getByText('Všechny stavy')).toBeInTheDocument()
    expect(screen.getByText('Všechny zdroje')).toBeInTheDocument()
    expect(screen.getByText('Všechny typy')).toBeInTheDocument()
  })

  it('renders empty state when no data', () => {
    renderPage()
    expect(screen.getByText('Žádné protokoly')).toBeInTheDocument()
  })

  it('renders KPI cards', () => {
    renderPage()
    expect(screen.getByText('Celkem')).toBeInTheDocument()
    expect(screen.getByText('Rozpracovaných')).toBeInTheDocument()
    expect(screen.getByText('Dokončených')).toBeInTheDocument()
    expect(screen.getByText('Potvrzených')).toBeInTheDocument()
  })
})
