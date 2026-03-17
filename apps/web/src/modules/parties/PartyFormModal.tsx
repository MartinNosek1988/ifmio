import { useState, useEffect } from 'react'
import { Modal, Button } from '../../shared/components'
import { useCreateParty, useUpdateParty } from './api/parties.queries'
import type { ApiParty } from './api/parties.api'

const TYPE_OPTIONS = [
  { value: 'person', label: 'Osoba' },
  { value: 'company', label: 'Firma' },
  { value: 'hoa', label: 'SVJ' },
] as const

interface Props {
  party?: ApiParty | null
  onClose: () => void
  onSuccess?: () => void
}

export default function PartyFormModal({ party, onClose, onSuccess }: Props) {
  const isEdit = !!party
  const createMutation = useCreateParty()
  const updateMutation = useUpdateParty()
  const isPending = createMutation.isPending || updateMutation.isPending

  const [type, setType] = useState(party?.type ?? 'person')
  const [firstName, setFirstName] = useState(party?.firstName ?? '')
  const [lastName, setLastName] = useState(party?.lastName ?? '')
  const [companyName, setCompanyName] = useState(party?.companyName ?? '')
  const [displayName, setDisplayName] = useState(party?.displayName ?? '')
  const [displayNameManual, setDisplayNameManual] = useState(false)
  const [ic, setIc] = useState(party?.ic ?? '')
  const [dic, setDic] = useState(party?.dic ?? '')
  const [vatId, setVatId] = useState(party?.vatId ?? '')
  const [email, setEmail] = useState(party?.email ?? '')
  const [phone, setPhone] = useState(party?.phone ?? '')
  const [website, setWebsite] = useState(party?.website ?? '')
  const [street, setStreet] = useState(party?.street ?? '')
  const [street2, setStreet2] = useState(party?.street2 ?? '')
  const [city, setCity] = useState(party?.city ?? '')
  const [postalCode, setPostalCode] = useState(party?.postalCode ?? '')
  const [countryCode, setCountryCode] = useState(party?.countryCode ?? 'CZ')
  const [dataBoxId, setDataBoxId] = useState(party?.dataBoxId ?? '')
  const [bankAccount, setBankAccount] = useState(party?.bankAccount ?? '')
  const [bankCode, setBankCode] = useState(party?.bankCode ?? '')
  const [iban, setIban] = useState(party?.iban ?? '')
  const [note, setNote] = useState(party?.note ?? '')
  const [error, setError] = useState<string | null>(null)

  // Auto-fill displayName
  useEffect(() => {
    if (displayNameManual) return
    if (type === 'person') {
      const auto = [lastName, firstName].filter(Boolean).join(' ')
      if (auto) setDisplayName(auto)
    } else {
      if (companyName) setDisplayName(companyName)
    }
  }, [type, firstName, lastName, companyName, displayNameManual])

  const handleSubmit = () => {
    if (!displayName.trim()) { setError('Zobrazovaný název je povinný'); return }
    setError(null)

    const data: Record<string, unknown> = {
      type,
      displayName: displayName.trim(),
      firstName: type === 'person' ? firstName || undefined : undefined,
      lastName: type === 'person' ? lastName || undefined : undefined,
      companyName: type !== 'person' ? companyName || undefined : undefined,
      ic: ic || undefined,
      dic: dic || undefined,
      vatId: vatId || undefined,
      email: email || undefined,
      phone: phone || undefined,
      website: website || undefined,
      street: street || undefined,
      street2: street2 || undefined,
      city: city || undefined,
      postalCode: postalCode || undefined,
      countryCode: countryCode || undefined,
      dataBoxId: dataBoxId || undefined,
      bankAccount: bankAccount || undefined,
      bankCode: bankCode || undefined,
      iban: iban || undefined,
      note: note || undefined,
    }

    if (isEdit) {
      updateMutation.mutate({ id: party!.id, data }, {
        onSuccess: () => { onSuccess?.(); onClose() },
        onError: (e: any) => setError(e?.response?.data?.message ?? 'Nepodařilo se uložit'),
      })
    } else {
      createMutation.mutate(data, {
        onSuccess: () => { onSuccess?.(); onClose() },
        onError: (e: any) => setError(e?.response?.data?.message ?? 'Nepodařilo se vytvořit'),
      })
    }
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '.85rem', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3 }
  const rowStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Upravit subjekt' : 'Nový subjekt'}
      subtitle={isEdit ? party!.displayName : undefined}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Ukládám...' : isEdit ? 'Uložit' : 'Vytvořit'}
          </Button>
        </div>
      }
    >
      {error && (
        <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid var(--danger)', borderRadius: 6, padding: '8px 12px', fontSize: '.85rem', color: 'var(--danger)', marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Type selector */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Typ subjektu</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setType(opt.value)}
              style={{
                padding: '5px 14px', borderRadius: 6, fontSize: '.82rem', fontWeight: 500, cursor: 'pointer',
                border: '1px solid var(--border)',
                background: type === opt.value ? 'var(--primary, #6366f1)' : 'var(--surface)',
                color: type === opt.value ? '#fff' : 'var(--text)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Name fields */}
      {type === 'person' ? (
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Příjmení</label>
            <input value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle} placeholder="Novák" />
          </div>
          <div>
            <label style={labelStyle}>Jméno</label>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle} placeholder="Jan" />
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>{type === 'hoa' ? 'Název SVJ' : 'Název firmy'}</label>
          <input value={companyName} onChange={e => setCompanyName(e.target.value)} style={inputStyle} placeholder={type === 'hoa' ? 'SVJ Lipová 12' : 'Firma s.r.o.'} />
        </div>
      )}

      {/* Display name */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Zobrazovaný název *</label>
        <input
          value={displayName}
          onChange={e => { setDisplayName(e.target.value); setDisplayNameManual(true) }}
          style={inputStyle}
        />
      </div>

      {/* Identification */}
      <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, marginTop: 16 }}>Identifikace</div>
      <div style={rowStyle}>
        <div>
          <label style={labelStyle}>IČ</label>
          <input value={ic} onChange={e => setIc(e.target.value)} style={inputStyle} maxLength={20} />
        </div>
        <div>
          <label style={labelStyle}>DIČ</label>
          <input value={dic} onChange={e => setDic(e.target.value)} style={inputStyle} maxLength={20} />
        </div>
      </div>

      {/* Address */}
      <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, marginTop: 16 }}>Adresa</div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Ulice</label>
        <input value={street} onChange={e => setStreet(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Ulice 2</label>
        <input value={street2} onChange={e => setStreet2(e.target.value)} style={inputStyle} />
      </div>
      <div style={rowStyle}>
        <div>
          <label style={labelStyle}>Město</label>
          <input value={city} onChange={e => setCity(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>PSČ</label>
          <input value={postalCode} onChange={e => setPostalCode(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div style={rowStyle}>
        <div>
          <label style={labelStyle}>Stát</label>
          <select value={countryCode} onChange={e => setCountryCode(e.target.value)} style={inputStyle}>
            <option value="CZ">CZ</option>
            <option value="SK">SK</option>
            <option value="">Jiný</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>IČ DPH</label>
          <input value={vatId} onChange={e => setVatId(e.target.value)} style={inputStyle} maxLength={32} />
        </div>
      </div>

      {/* Contacts */}
      <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, marginTop: 16 }}>Kontakty</div>
      <div style={rowStyle}>
        <div>
          <label style={labelStyle}>E-mail</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Telefon</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div style={rowStyle}>
        <div>
          <label style={labelStyle}>Web</label>
          <input value={website} onChange={e => setWebsite(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Datová schránka</label>
          <input value={dataBoxId} onChange={e => setDataBoxId(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Bank */}
      <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, marginTop: 16 }}>Bankovní spojení</div>
      <div style={rowStyle}>
        <div>
          <label style={labelStyle}>Číslo účtu</label>
          <input value={bankAccount} onChange={e => setBankAccount(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Kód banky</label>
          <input value={bankCode} onChange={e => setBankCode(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>IBAN</label>
        <input value={iban} onChange={e => setIban(e.target.value)} style={inputStyle} />
      </div>

      {/* Note */}
      <div style={{ marginTop: 16 }}>
        <label style={labelStyle}>Poznámka</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
    </Modal>
  )
}
