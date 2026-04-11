import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { AddressAutocomplete, type AddressResult } from '../../../shared/components/AddressAutocomplete'
import { wizardApi } from './wizard.api'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1.5px solid var(--border, #e5e7eb)', background: 'var(--surface, #fff)',
  fontSize: '0.9rem', color: 'var(--text, #1a1a2e)', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.82rem', fontWeight: 600,
  color: 'var(--text, #374151)', marginBottom: 4,
}

const PROPERTY_TYPES = [
  { value: 'SVJ', label: 'SVJ' },
  { value: 'BD', label: 'Bytové družstvo' },
  { value: 'RENTAL_HOUSE', label: 'Nájemní dům' },
] as const

export function Step3Property({ archetype, onComplete, onBack }: {
  archetype: string
  onComplete: () => void
  onBack: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [propertyType, setPropertyType] = useState(
    archetype === 'RENTAL_OWNER' ? 'RENTAL_HOUSE' : 'SVJ',
  )
  const [ico, setIco] = useState('')

  const availableTypes = archetype === 'RENTAL_OWNER'
    ? PROPERTY_TYPES.filter(t => t.value === 'RENTAL_HOUSE')
    : archetype === 'SELF_MANAGED_HOA'
      ? PROPERTY_TYPES.filter(t => t.value === 'SVJ' || t.value === 'BD')
      : PROPERTY_TYPES

  const handleAddressSelect = (addr: AddressResult) => {
    setAddress(addr.fullAddress)
    if (addr.city) setCity(addr.city)
    if (addr.postalCode) setPostalCode(addr.postalCode)
    if (!name && addr.street) setName(addr.street)
  }

  const mutation = useMutation({
    mutationFn: () => wizardApi.step3({
      name, address, city, postalCode, type: propertyType,
      ico: ico.replace(/\s/g, '') || undefined,
    }),
    onSuccess: () => onComplete(),
  })

  const canSubmit = name.trim() && address.trim() && city.trim() && postalCode.trim() && !mutation.isPending

  return (
    <div>
      <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text, #1a1a2e)' }}>
        {t('onboarding.step3.title')}
      </h2>
      <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: '0.9rem', margin: '0 0 24px' }}>
        {t('onboarding.step3.subtitle')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle}>{t('onboarding.step3.name')} *</label>
          <input data-testid="property-name" value={name} onChange={e => setName(e.target.value)}
            style={inputStyle} placeholder="Korunní 42" />
        </div>

        <div>
          <label style={labelStyle}>{t('onboarding.step3.address')} *</label>
          <div data-testid="property-address">
            <AddressAutocomplete
              onSelect={handleAddressSelect}
              defaultValue={address}
              placeholder="Začněte psát adresu..."
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>{t('onboarding.step3.city')} *</label>
            <input data-testid="property-city" value={city} onChange={e => setCity(e.target.value)}
              style={inputStyle} placeholder="Praha 2" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>{t('onboarding.step3.postalCode')} *</label>
            <input data-testid="property-postalcode" value={postalCode} onChange={e => setPostalCode(e.target.value)}
              style={inputStyle} placeholder="120 00" maxLength={6} />
          </div>
        </div>

        <div>
          <label id="property-type-label" style={labelStyle}>{t('onboarding.step3.type')} *</label>
          <div role="radiogroup" aria-labelledby="property-type-label" style={{ display: 'flex', gap: 10 }}>
            {availableTypes.map((pt, index) => (
              <button
                key={pt.value}
                type="button"
                role="radio"
                tabIndex={propertyType === pt.value ? 0 : -1}
                data-testid={`property-type-${pt.value}`}
                aria-checked={propertyType === pt.value}
                onClick={() => setPropertyType(pt.value)}
                onKeyDown={e => {
                  if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return
                  e.preventDefault()
                  const next = e.key === 'ArrowRight'
                    ? (index + 1) % availableTypes.length
                    : (index - 1 + availableTypes.length) % availableTypes.length
                  setPropertyType(availableTypes[next].value)
                }}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  border: `2px solid ${propertyType === pt.value ? '#0D9488' : 'var(--border, #e5e7eb)'}`,
                  background: propertyType === pt.value ? 'rgba(13, 148, 136, 0.06)' : 'var(--surface, #fff)',
                  fontWeight: 600, fontSize: '0.85rem', textAlign: 'center',
                  color: propertyType === pt.value ? '#0D9488' : 'var(--text, #374151)',
                }}
              >
                {pt.label}
              </button>
            ))}
          </div>
        </div>

        {(propertyType === 'SVJ' || propertyType === 'BD') && (
          <div>
            <label style={labelStyle}>{t('onboarding.step3.ico')}</label>
            <input value={ico} onChange={e => setIco(e.target.value)}
              style={inputStyle} placeholder="IČ SVJ (pokud jiné než výše)" maxLength={8} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <button data-testid="onboarding-back" onClick={onBack}
          style={{
            flex: 1, padding: '12px', borderRadius: 10,
            border: '1.5px solid var(--border, #e5e7eb)', background: 'var(--surface, #fff)',
            fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', color: 'var(--text, #374151)',
          }}>
          ← {t('onboarding.back')}
        </button>
        <button data-testid="onboarding-next" onClick={() => mutation.mutate()} disabled={!canSubmit}
          style={{
            flex: 2, padding: '12px', borderRadius: 10, border: 'none',
            background: canSubmit ? '#0D9488' : '#d1d5db', color: '#fff',
            fontWeight: 600, fontSize: '0.95rem', cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}>
          {mutation.isPending ? '...' : t('onboarding.continue')} →
        </button>
      </div>
    </div>
  )
}
