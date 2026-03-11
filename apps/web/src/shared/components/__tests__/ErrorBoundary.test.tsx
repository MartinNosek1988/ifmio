import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ErrorBoundary } from '../ErrorBoundary'

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test error')
  return <div>OK content</div>
}

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary moduleName="Test">
        <div>child content</div>
      </ErrorBoundary>,
    )

    expect(screen.getByText('child content')).toBeInTheDocument()
  })

  it('renders error UI with module name when a child throws', () => {
    // Suppress React error boundary console.error
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary moduleName="Finance">
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Chyba v modulu Finance')).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
    expect(screen.getByText('Zkusit znovu')).toBeInTheDocument()

    vi.restoreAllMocks()
  })

  it('recovers when retry button is clicked', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()

    // Use a ref-like approach: first render throws, after reset it won't
    let shouldThrow = true
    function Conditional() {
      if (shouldThrow) throw new Error('Temporary error')
      return <div>Recovered</div>
    }

    render(
      <ErrorBoundary moduleName="Test">
        <Conditional />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Zkusit znovu')).toBeInTheDocument()

    shouldThrow = false
    await user.click(screen.getByText('Zkusit znovu'))

    expect(screen.getByText('Recovered')).toBeInTheDocument()

    vi.restoreAllMocks()
  })
})
