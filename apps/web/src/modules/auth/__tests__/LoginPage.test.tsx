import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import LoginPage from '../LoginPage'

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  it('renders the login form with email, password, and submit button', () => {
    renderLogin()

    expect(screen.getByText('ifmio')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Heslo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /přihlásit se/i })).toBeInTheDocument()
  })

  it('has a link to the registration page', () => {
    renderLogin()

    const link = screen.getByRole('link', { name: /zaregistrujte se/i })
    expect(link).toHaveAttribute('href', '/register')
  })

  it('renders email and password inputs as required', () => {
    renderLogin()

    const emailInput = screen.getByRole('textbox') // email type renders as textbox
    expect(emailInput).toBeRequired()

    // Password input doesn't have a role, find by type
    const passwordInput = document.querySelector('input[type="password"]')
    expect(passwordInput).toBeRequired()
  })

  it('allows typing into form fields', async () => {
    const user = userEvent.setup()
    renderLogin()

    const emailInput = screen.getByRole('textbox')
    const passwordInput = document.querySelector('input[type="password"]')!

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')

    expect(emailInput).toHaveValue('test@example.com')
    expect(passwordInput).toHaveValue('password123')
  })
})
