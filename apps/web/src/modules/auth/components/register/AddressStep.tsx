import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { inputStyle, labelStyle, errorStyle, type StepProps } from '../../register.types';

export function AddressStep({ form, set, errors }: StepProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'manual' | 'code'>('manual');

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1A1A2E', margin: '0 0 20px' }}>
        {t('register.step.address')}
      </h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <ModeButton active={mode === 'manual'} onClick={() => setMode('manual')}>
          {t('register.address.modeManual')}
        </ModeButton>
        <ModeButton active={mode === 'code'} onClick={() => setMode('code')}>
          {t('register.address.modeJoinCode')}
        </ModeButton>
      </div>

      {mode === 'manual' ? (
        <>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>{t('register.address.street')}</label>
            <input value={form.residenceAddress} onChange={(e) => set('residenceAddress', e.target.value)} style={inputStyle} />
            {errors.residenceAddress && <div style={errorStyle}>{errors.residenceAddress}</div>}
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>{t('register.address.city')}</label>
              <input value={form.residenceCity} onChange={(e) => set('residenceCity', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t('register.address.postalCode')}</label>
              <input value={form.residencePostalCode} onChange={(e) => set('residencePostalCode', e.target.value)} style={inputStyle} />
            </div>
          </div>
        </>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{t('register.address.joinCode')}</label>
          <input
            value={form.tenantJoinCode}
            onChange={(e) => set('tenantJoinCode', e.target.value)}
            style={inputStyle}
            placeholder={t('register.address.joinCodePlaceholder')}
            disabled
          />
          <div style={{ fontSize: '.78rem', color: '#9CA3AF', marginTop: 6 }}>
            {t('register.address.joinCodeDisabled')}
          </div>
        </div>
      )}
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '8px 12px',
        borderRadius: 8,
        border: active ? '0.5px solid #0F6E56' : '0.5px solid #E5E7EB',
        background: active ? '#E1F5EE' : '#fff',
        color: active ? '#0F6E56' : '#6B7280',
        fontSize: '.85rem',
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {children}
    </button>
  );
}
