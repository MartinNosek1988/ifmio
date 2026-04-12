import { useTranslation } from 'react-i18next';
import { inputStyle, labelStyle, errorStyle, type StepProps } from '../../register.types';

export function PropertyStep({ form, set, errors }: StepProps) {
  const { t } = useTranslation();

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1A1A2E', margin: '0 0 20px' }}>
        {t('register.step.property')}
      </h2>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{t('register.property.name')}</label>
        <input value={form.propertyName} onChange={(e) => set('propertyName', e.target.value)} style={inputStyle} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{t('register.property.address')}</label>
        <input value={form.propertyAddress} onChange={(e) => set('propertyAddress', e.target.value)} style={inputStyle} />
        {errors.propertyAddress && <div style={errorStyle}>{errors.propertyAddress}</div>}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>{t('register.property.city')}</label>
          <input value={form.propertyCity} onChange={(e) => set('propertyCity', e.target.value)} style={inputStyle} />
          {errors.propertyCity && <div style={errorStyle}>{errors.propertyCity}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>{t('register.property.postalCode')}</label>
          <input value={form.propertyPostalCode} onChange={(e) => set('propertyPostalCode', e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{t('register.property.type')}</label>
        <select
          value={form.propertyType}
          onChange={(e) => set('propertyType', e.target.value)}
          style={{ ...inputStyle, appearance: 'auto' }}
        >
          <option value="">—</option>
          <option value="apartment">{t('register.property.typeApartment')}</option>
          <option value="family">{t('register.property.typeFamily')}</option>
          <option value="commercial">{t('register.property.typeCommercial')}</option>
          <option value="mixed">{t('register.property.typeMixed')}</option>
        </select>
      </div>
    </div>
  );
}
