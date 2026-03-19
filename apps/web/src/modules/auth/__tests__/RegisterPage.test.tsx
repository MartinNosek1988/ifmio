import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import RegisterPage from '../RegisterPage'

function renderRegister() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  )
}

describe('RegisterPage', () => {
  it('renders step 1 with name, email, and password fields', () => {
    renderRegister()

    expect(screen.getByText('ifmio')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Jan Novák')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('jan@firma.cz')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/min\. 8/i)).toBeInTheDocument()
  })

  it('has a link to the login page', () => {
    renderRegister()

    const link = screen.getByRole('link', { name: /přihlaste se/i })
    expect(link).toHaveAttribute('href', '/login')
  })

  it('shows step progress indicators', () => {
    renderRegister()

    // Progress bar has step labels; heading also contains step text
    // Use getAllByText and check at least one exists
    expect(screen.getAllByText(/osobní údaje/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/organizace/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/plán/i).length).toBeGreaterThanOrEqual(1)
  })
})
