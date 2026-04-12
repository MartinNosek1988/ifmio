import { useTranslation } from 'react-i18next';
import { inputStyle, labelStyle, errorStyle, CZECH_REGIONS, type StepProps } from '../../register.types';

export function RegionStep({ form, set, errors }: StepProps) {
  const { t } = useTranslation();

  function toggleDistrict(region: string) {
    const next = form.supplierRegionDistricts.includes(region)
      ? form.supplierRegionDistricts.filter((r) => r !== region)
      : [...form.supplierRegionDistricts, region];
    set('supplierRegionDistricts', next);
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1A1A2E', margin: '0 0 20px' }}>
        {t('register.step.region')}
      </h2>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{t('register.region.city')}</label>
        <input
          value={form.supplierRegionCity}
          onChange={(e) => set('supplierRegionCity', e.target.value)}
          style={inputStyle}
          placeholder={t('register.region.cityPlaceholder')}
        />
        {errors.supplierRegionCity && <div style={errorStyle}>{errors.supplierRegionCity}</div>}
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>
          {t('register.region.radius')} — <strong style={{ color: '#0F6E56' }}>{t('register.region.radiusValue', { value: form.supplierRegionRadius })}</strong>
        </label>
        <input
          type="range"
          min={10}
          max={200}
          step={10}
          value={form.supplierRegionRadius}
          onChange={(e) => set('supplierRegionRadius', Number(e.target.value))}
          style={{ width: '100%', accentColor: '#0F6E56' }}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{t('register.region.districts')}</label>
        <div style={{ fontSize: '.78rem', color: '#9CA3AF', marginBottom: 8 }}>
          {t('register.region.districtsHint')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {CZECH_REGIONS.map((region) => {
            const checked = form.supplierRegionDistricts.includes(region);
            return (
              <label
                key={region}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: '.82rem',
                  color: '#374151',
                  background: checked ? '#E1F5EE' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleDistrict(region)}
                  style={{ accentColor: '#0F6E56' }}
                />
                {region}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
