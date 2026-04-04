import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../core/api/client'
import { useToast } from '../../shared/components/toast/Toast'

type Step = 'welcome' | 'property' | 'unit' | 'done'

function ProgressBar({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: 32 }}>
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              height: 4,
              background: done || active ? '#6366f1' : 'var(--border, #e5e7eb)',
              marginBottom: 6,
              borderRadius: i === 0 ? '4px 0 0 4px' : i === steps.length - 1 ? '0 4px 4px 0' : 0,
            }} />
            <span style={{
              fontSize: 11,
              color: done || active ? '#6366f1' : 'var(--text-muted, #9ca3af)',
              fontWeight: active ? 700 : 400,
            }}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<Step>('welcome')
  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [propertyName, setPropertyName] = useState('')
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    postalCode: '',
    type: 'SVJ',
    ownership: 'vlastnictvi',
  })
  const [unitForm, setUnitForm] = useState({ name: '', floor: '', area: '' })

  const { success, error } = useToast()
  const navigate = useNavigate()

  const stepLabels = ['Vítejte', 'Nemovitost', 'Jednotka', 'Hotovo']


  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
  }
  const card: React.CSSProperties = {
    background: 'var(--surface, #fff)',
    borderRadius: 16, padding: 40,
    width: 540, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  }
  const input: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    border: '1px solid var(--border, #d1d5db)', borderRadius: 8,
    fontSize: 14, boxSizing: 'border-box', marginBottom: 12,
    background: 'var(--surface, #fff)', color: 'var(--text, #111)',
  }
  const btnPrimary: React.CSSProperties = {
    padding: '10px 24px', background: '#6366f1', color: '#fff',
    border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer',
  }
  const btnSecondary: React.CSSProperties = {
    ...btnPrimary, background: 'var(--surface-2, #f3f4f6)', color: 'var(--text, #374151)',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4,
  }

  if (step === 'welcome') {
    return (
      <div style={overlay}>
        <div style={card}>
          <ProgressBar steps={stepLabels} current={0} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#127970;</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Vítejte v ifmio!</h1>
            <p style={{ color: 'var(--text-muted, #6b7280)', marginBottom: 32, lineHeight: 1.6 }}>
              Nastavení zabere méně než 2 minuty. Přidáme vaši první nemovitost a jednotku.
            </p>
            <button style={btnPrimary} onClick={() => setStep('property')}>
              Začít nastavení &rarr;
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'property') {
    const handleCreate = async () => {
      if (!form.name || !form.address) {
        error('Vyplňte název a adresu')
        return
      }
      try {
        const res = await apiClient.post('/properties', form)
        setPropertyId(res.data.id)
        setPropertyName(res.data.name)
        success(`Nemovitost "${res.data.name}" vytvořena`)
        setStep('unit')
      } catch {
        error('Vytvoření nemovitosti selhalo')
      }
    }

    return (
      <div style={overlay}>
        <div style={card}>
          <ProgressBar steps={stepLabels} current={1} />
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Přidejte první nemovitost</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>
            Bytový dům, rodinný dům nebo kancelářská budova.
          </p>
          <label style={labelStyle}>Název nemovitosti *</label>
          <input style={input} placeholder="např. Bytový dům Hlavní 12" value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <label style={labelStyle}>Adresa *</label>
          <input style={input} placeholder="Hlavní 12" value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Město</label>
              <input style={input} placeholder="Praha" value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>PSC</label>
              <input style={input} placeholder="11000" value={form.postalCode}
                onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))} />
            </div>
          </div>
          <label style={labelStyle}>Typ nemovitosti</label>
          <select style={{ ...input, cursor: 'pointer' }} value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            <option value="bytdum">Bytový dům</option>
            <option value="roddum">Rodinný dům</option>
            <option value="komer">Komerční objekt</option>
          </select>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <button style={btnSecondary} onClick={() => setStep('welcome')}>&larr; Zpět</button>
            <button style={btnPrimary} onClick={handleCreate}>Vytvořit nemovitost &rarr;</button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'unit') {
    const handleCreate = async () => {
      if (!unitForm.name) {
        error('Zadejte označení jednotky')
        return
      }
      try {
        await apiClient.post(`/properties/${propertyId}/units`, {
          name: unitForm.name,
          floor: unitForm.floor ? parseInt(unitForm.floor) : 0,
          area: unitForm.area ? parseFloat(unitForm.area) : null,
        })
        success(`Jednotka "${unitForm.name}" vytvořena`)
        setStep('done')
      } catch {
        error('Vytvoření jednotky selhalo')
      }
    }

    return (
      <div style={overlay}>
        <div style={card}>
          <ProgressBar steps={stepLabels} current={2} />
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Přidejte první jednotku</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>
            Jednotka v nemovitosti <strong>{propertyName}</strong>.
          </p>
          <label style={labelStyle}>Označení jednotky *</label>
          <input style={input} placeholder="např. Byt 2+1, Byt č. 12" value={unitForm.name}
            onChange={(e) => setUnitForm((f) => ({ ...f, name: e.target.value }))} />
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Patro</label>
              <input style={input} type="number" placeholder="0" value={unitForm.floor}
                onChange={(e) => setUnitForm((f) => ({ ...f, floor: e.target.value }))} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Plocha (m2)</label>
              <input style={input} type="number" placeholder="65" value={unitForm.area}
                onChange={(e) => setUnitForm((f) => ({ ...f, area: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <button style={btnSecondary} onClick={() => setStep('property')}>&larr; Zpět</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnSecondary} onClick={() => setStep('done')}>Přeskočit</button>
              <button style={btnPrimary} onClick={handleCreate}>Vytvořit jednotku &rarr;</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // DONE
  return (
    <div style={overlay}>
      <div style={{ ...card, textAlign: 'center' }}>
        <ProgressBar steps={stepLabels} current={3} />
        <div style={{ fontSize: 56, marginBottom: 16 }}>&#127881;</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Hotovo! ifmio je připraveno.</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32, lineHeight: 1.6 }}>
          Nemovitost a jednotka byly vytvořeny. Nyní můžete přidat nájemníky a nastavit předpisy.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button style={btnSecondary} onClick={onComplete}>Přejít na dashboard</button>
          <button style={btnPrimary} onClick={() => { onComplete(); navigate('/residents') }}>
            Přidat nájemníky &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}
