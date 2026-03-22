import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import ResidentsPage from '../ResidentsPage'

vi.mock('../api/residents.queries', () => ({
  useResidents: () => ({
    data: { data: [], total: 0, page: 1, limit: 100, totalPages: 0 },
    isLoading: false,
    error: null,
  }),
  useDeleteResident: () => ({ mutate: vi.fn(), isPending: false }),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ResidentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ResidentsPage', () => {
  it('renders page title', () => {
    renderPage()
    expect(screen.getByText('Bydlící')).toBeInTheDocument()
  })

  it('renders KPI cards', () => {
    renderPage()
    expect(screen.getByText('Celkem')).toBeInTheDocument()
    expect(screen.getByText('Aktivních')).toBeInTheDocument()
    expect(screen.getByText('Nemovitostí')).toBeInTheDocument()
    expect(screen.getByText('Dlužníků')).toBeInTheDocument()
  })

  it('renders empty state when no residents', () => {
    renderPage()
    expect(screen.getByText('Žádní bydlící')).toBeInTheDocument()
  })

  it('renders add resident button', () => {
    renderPage()
    expect(screen.getByTestId('resident-add-btn')).toBeInTheDocument()
    expect(screen.getByText('Nový bydlící')).toBeInTheDocument()
  })

  it('renders import button', () => {
    renderPage()
    expect(screen.getByText('Import')).toBeInTheDocument()
  })

  it('renders role filter', () => {
    renderPage()
    expect(screen.getByText('Všechny role')).toBeInTheDocument()
  })
})
