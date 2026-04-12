import { useTranslation } from 'react-i18next';
import { inputStyle, labelStyle, errorStyle, type StepProps } from '../../register.types';

export function AddressStep({ form, set, errors }: StepProps) {
  const { t } = useTranslation();

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1A1A2E', margin: '0 0 20px' }}>
        {t('register.step.address')}
      </h2>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{t('register.address.street')}</label>
        <input value={form.residenceAddress} onChange={(e) => set('residenceAddress', e.target.value)} style={inputStyle} />
        {errors.residenceAddress && <div style={errorStyle}>{errors.residenceAddress}</div>}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>{t('register.address.city')}</label>
          <input value={form.residenceCity} onChange={(e) => set('residenceCity', e.target.value)} style={inputStyle} />
          {errors.residenceCity && <div style={errorStyle}>{errors.residenceCity}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>{t('register.address.postalCode')}</label>
          <input value={form.residencePostalCode} onChange={(e) => set('residencePostalCode', e.target.value)} style={inputStyle} />
          {errors.residencePostalCode && <div style={errorStyle}>{errors.residencePostalCode}</div>}
        </div>
      </div>

      <div style={{ fontSize: '.78rem', color: '#9CA3AF', marginTop: 12 }}>
        {t('register.address.joinCodeComingSoon')}
      </div>
    </div>
  );
}
