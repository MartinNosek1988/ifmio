import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { inputStyle, labelStyle, errorStyle, type StepProps } from '../../register.types';

export function UnitStep({ form, set, errors }: StepProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'manual' | 'code'>('manual');

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1A1A2E', margin: '0 0 20px' }}>
        {t('register.step.unit')}
      </h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <ModeButton active={mode === 'manual'} onClick={() => setMode('manual')}>
          {t('register.unit.modeManual')}
        </ModeButton>
        <ModeButton active={mode === 'code'} onClick={() => setMode('code')}>
          {t('register.unit.modeJoinCode')}
        </ModeButton>
      </div>

      {mode === 'manual' ? (
        <>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>{t('register.unit.address')}</label>
            <input value={form.unitAddress} onChange={(e) => set('unitAddress', e.target.value)} style={inputStyle} />
            {errors.unitAddress && <div style={errorStyle}>{errors.unitAddress}</div>}
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t('register.unit.number')}</label>
              <input value={form.unitNumber} onChange={(e) => set('unitNumber', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t('register.unit.disposition')}</label>
              <select
                value={form.unitDisposition}
                onChange={(e) => set('unitDisposition', e.target.value)}
                style={{ ...inputStyle, appearance: 'auto' }}
              >
                <option value="">{t('register.unit.dispositionSelect')}</option>
                {['1+kk', '1+1', '2+kk', '2+1', '3+kk', '3+1', '4+kk', '4+1', '5+kk', '5+1'].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{t('register.unit.joinCode')}</label>
          <input
            value={form.joinCode}
            onChange={(e) => set('joinCode', e.target.value)}
            style={inputStyle}
            placeholder={t('register.unit.joinCodePlaceholder')}
            disabled
          />
          <div style={{ fontSize: '.78rem', color: '#9CA3AF', marginTop: 6 }}>
            {t('register.unit.joinCodeDisabled')}
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
