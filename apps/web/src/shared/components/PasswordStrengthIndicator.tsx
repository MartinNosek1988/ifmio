const COMMON = ['password', 'password123', 'Password123', '12345678', '123456789', 'qwerty123', 'heslo123', 'Heslo123', 'admin123', '11111111']

function getStrength(password: string): number {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (COMMON.includes(password)) score = Math.max(0, score - 1)
  return score
}

const LEVELS: { label: string; color: string }[] = [
  { label: '', color: 'transparent' },
  { label: 'Slabé', color: '#ef4444' },
  { label: 'Průměrné', color: '#f59e0b' },
  { label: 'Dobré', color: '#eab308' },
  { label: 'Silné', color: '#22c55e' },
]

export function PasswordStrengthIndicator({ password }: { password: string }) {
  const strength = getStrength(password)
  if (!password) return null
  const level = LEVELS[strength] ?? LEVELS[0]

  return (
    <div style={{ marginTop: 6, marginBottom: 4 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= strength ? level.color : '#2a2d3a',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
      {strength > 0 && (
        <div style={{ fontSize: '0.72rem', color: level.color, marginTop: 2 }}>{level.label}</div>
      )}
    </div>
  )
}
