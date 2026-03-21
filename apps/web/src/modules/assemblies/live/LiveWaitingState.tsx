export function LiveWaitingState() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%', background: '#f59e0b',
        margin: '0 auto 24px', animation: 'pulse 1.5s infinite',
      }} />
      <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
        Čekání na zahájení hlasování...
      </div>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.3); } }
      `}</style>
    </div>
  )
}
