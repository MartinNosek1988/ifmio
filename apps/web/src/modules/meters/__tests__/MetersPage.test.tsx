import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import MetersPage from '../MetersPage'

vi.mock('../api/meters.queries', () => ({
  useMeters: () => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useMeterStats: () => ({
    data: { total: 8, elektrina: 2, vodaStudena: 4, vodaTepla: 2, calibrationDue: 1 },
    isLoading: false,
  }),
  useDeleteMeter: () => ({ mutate: vi.fn(), isPending: false }),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MetersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MetersPage', () => {
  it('renders page title', () => {
    renderPage()
    expect(screen.getByText('Měřidla & Energie')).toBeInTheDocument()
  })

  it('renders KPI cards', () => {
    renderPage()
    expect(screen.getByText('Celkem')).toBeInTheDocument()
    // "Elektřina" appears in both KPI card and type filter dropdown - verify at least one exists
    expect(screen.getAllByText('Elektřina').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Voda')).toBeInTheDocument()
    expect(screen.getByText('Prošl. kalibrace')).toBeInTheDocument()
  })

  it('renders KPI values from stats', () => {
    renderPage()
    // Total: 8, Elektrina: 2, Voda: 4+2=6, CalibrationDue: 1
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders empty state when no meters', () => {
    renderPage()
    expect(screen.getByText('Žádná měřidla')).toBeInTheDocument()
  })

  it('renders add meter button', () => {
    renderPage()
    expect(screen.getByTestId('meter-add-btn')).toBeInTheDocument()
    expect(screen.getByText('Nové měřidlo')).toBeInTheDocument()
  })

  it('renders meter type filter', () => {
    renderPage()
    expect(screen.getByText('Vše')).toBeInTheDocument()
  })
})
