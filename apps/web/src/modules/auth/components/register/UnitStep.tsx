import { useTranslation } from 'react-i18next';
import { inputStyle, labelStyle, errorStyle, type StepProps } from '../../register.types';

export function UnitStep({ form, set, errors }: StepProps) {
  const { t } = useTranslation();

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1A1A2E', margin: '0 0 20px' }}>
        {t('register.step.unit')}
      </h2>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{t('register.unit.address')}</label>
        <input value={form.unitAddress} onChange={(e) => set('unitAddress', e.target.value)} style={inputStyle} />
        {errors.unitAddress && <div style={errorStyle}>{errors.unitAddress}</div>}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>{t('register.unit.number')}</label>
          <input value={form.unitNumber} onChange={(e) => set('unitNumber', e.target.value)} style={inputStyle} />
          {errors.unitNumber && <div style={errorStyle}>{errors.unitNumber}</div>}
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

      <div style={{ fontSize: '.78rem', color: '#9CA3AF', marginTop: 12 }}>
        {t('register.unit.joinCodeComingSoon')}
      </div>
    </div>
  );
}
