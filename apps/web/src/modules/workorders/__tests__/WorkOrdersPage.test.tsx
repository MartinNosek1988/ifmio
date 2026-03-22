import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import WorkOrdersPage from '../WorkOrdersPage'

vi.mock('../api/workorders.queries', () => ({
  useWorkOrders: () => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useWOStats: () => ({
    data: { total: 5, open: 3, completedToday: 1, overdue: 2 },
    isLoading: false,
  }),
  useDeleteWorkOrder: () => ({ mutate: vi.fn(), isPending: false }),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <WorkOrdersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('WorkOrdersPage', () => {
  it('renders page title', () => {
    renderPage()
    expect(screen.getByText('Pracovní úkoly')).toBeInTheDocument()
  })

  it('renders KPI cards with stats', () => {
    renderPage()
    expect(screen.getByText('Celkem')).toBeInTheDocument()
    expect(screen.getByText('Otevřených')).toBeInTheDocument()
    expect(screen.getByText('Dokončených dnes')).toBeInTheDocument()
    // "Po termínu" appears in both KPI card and dropdown - verify at least one exists
    expect(screen.getAllByText('Po termínu').length).toBeGreaterThanOrEqual(1)
  })

  it('renders KPI values from stats', () => {
    renderPage()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders empty state when no work orders', () => {
    renderPage()
    expect(screen.getByText('Žádné pracovní úkoly')).toBeInTheDocument()
  })

  it('renders add button', () => {
    renderPage()
    expect(screen.getByTestId('wo-add-btn')).toBeInTheDocument()
    expect(screen.getByText('Nový úkol')).toBeInTheDocument()
  })

  it('renders status filter', () => {
    renderPage()
    expect(screen.getByTestId('wo-filter-status')).toBeInTheDocument()
  })
})
