const COMMON_PASSWORDS = [
  'password', 'password123', 'Password123', '12345678', '123456789',
  'qwerty123', 'Qwerty123', 'letmein', 'welcome', 'admin123',
  'heslo123', 'Heslo123', 'heslo1234', '11111111', 'abc12345',
  'iloveyou', 'trustno1', '1q2w3e4r', 'sunshine', 'princess',
]

export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Heslo musí mít alespoň 8 znaků.')
  }
  if (password.length > 128) {
    errors.push('Heslo může mít nejvýše 128 znaků.')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Heslo musí obsahovat alespoň jedno velké písmeno.')
  }
  if (COMMON_PASSWORDS.includes(password)) {
    errors.push('Toto heslo je příliš jednoduché. Zvolte jiné.')
  }

  return { valid: errors.length === 0, errors }
}
