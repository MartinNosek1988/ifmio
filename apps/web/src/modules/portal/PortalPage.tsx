import { useAuthStore } from '../../core/auth/auth.store'

export default function PortalPage() {
  const user = useAuthStore(s => s.user)

  const handleLogout = () => {
    sessionStorage.removeItem('ifmio:access_token')
    sessionStorage.removeItem('ifmio:refresh_token')
    sessionStorage.removeItem('ifmio:user')
    window.location.href = '/login'
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117' }}>
      <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: '12px', padding: '48px', width: '100%', maxWidth: '500px', textAlign: 'center' }}>
        <h1 style={{ color: '#6366f1', fontSize: '2rem', fontWeight: 700, margin: 0 }}>ifmio</h1>
        <h2 style={{ color: '#f3f4f6', marginTop: '16px', fontSize: '1.2rem' }}>Klientský portál</h2>
        <p style={{ color: '#9ca3af', marginTop: '12px', lineHeight: 1.6 }}>
          Vítejte{user?.name ? `, ${user.name}` : ''}. Váš přístup do klientského portálu je připraven.
          Plná verze portálu bude brzy k dispozici.
        </p>
        <button
          onClick={handleLogout}
          style={{ marginTop: '24px', padding: '10px 24px', background: '#374151', border: 'none', borderRadius: '8px', color: '#f3f4f6', fontSize: '0.9rem', cursor: 'pointer' }}
        >
          Odhlásit se
        </button>
      </div>
    </div>
  )
}
