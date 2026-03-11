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
    expect(screen.getByPlaceholderText('Jan Novak')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('jan@firma.cz')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Min. 8 znaku')).toBeInTheDocument()
  })

  it('has a link to the login page', () => {
    renderRegister()

    const link = screen.getByRole('link', { name: /prihlaste se/i })
    expect(link).toHaveAttribute('href', '/login')
  })

  it('shows step progress indicators', () => {
    renderRegister()

    expect(screen.getByText('Osobni udaje')).toBeInTheDocument()
    expect(screen.getByText('Organizace')).toBeInTheDocument()
    expect(screen.getByText('Plan')).toBeInTheDocument()
  })
})
