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
  it('renders step 1 with subject type selection', () => {
    renderRegister()

    expect(screen.getByText('ifmio')).toBeInTheDocument()
    expect(screen.getByText(/samosprávné svj/i)).toBeInTheDocument()
    expect(screen.getByText(/správcovská firma/i)).toBeInTheDocument()
    expect(screen.getByText(/vlastník nájemního domu/i)).toBeInTheDocument()
    expect(screen.getByText(/vlastník bytové jednotky/i)).toBeInTheDocument()
    expect(screen.getByText(/^nájemník$/i)).toBeInTheDocument()
    expect(screen.getByText(/dodavatel služeb/i)).toBeInTheDocument()
  })

  it('has a link to the login page', () => {
    renderRegister()

    const link = screen.getByRole('link', { name: /přihlaste se/i })
    expect(link).toHaveAttribute('href', '/login')
  })

  it('shows step progress indicators', () => {
    renderRegister()

    // Před výběrem typu má stepper jen jeden krok "Typ subjektu"
    expect(screen.getByText(/typ subjektu/i)).toBeInTheDocument()
  })
})
