import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { PasswordStrengthIndicator } from '../../../../shared/components/PasswordStrengthIndicator';
import type { SupplierCategory } from '@ifmio/shared-types';
import { inputStyle, labelStyle, errorStyle, SUPPLIER_CATEGORY_OPTIONS, type StepProps } from '../../register.types';
import { AresLookup } from './AresLookup';

const INITIAL_VISIBLE = 8;

export function SupplierStep({ form, set, errors }: StepProps) {
  const { t } = useTranslation();
  const [showPw, setShowPw] = useState(false);
  const [showAllCats, setShowAllCats] = useState(false);

  const visibleCats = showAllCats ? SUPPLIER_CATEGORY_OPTIONS : SUPPLIER_CATEGORY_OPTIONS.slice(0, INITIAL_VISIBLE);

  function toggleCategory(value: SupplierCategory) {
    const next = form.supplierCategories.includes(value)
      ? form.supplierCategories.filter((c) => c !== value)
      : [...form.supplierCategories, value];
    set('supplierCategories', next);
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1A1A2E', margin: '0 0 20px' }}>
        {t('register.step.supplier')}
      </h2>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{t('register.supplier.companyName')}</label>
        <input value={form.supplierCompanyName} onChange={(e) => set('supplierCompanyName', e.target.value)} style={inputStyle} />
        {errors.supplierCompanyName && <div style={errorStyle}>{errors.supplierCompanyName}</div>}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 14 }}>
        <input
          type="checkbox"
          checked={form.supplierIsOsvc}
          onChange={(e) => set('supplierIsOsvc', e.target.checked)}
          style={{ accentColor: '#0F6E56' }}
        />
        <span style={{ fontSize: '.85rem', color: '#374151' }}>{t('register.supplier.isOsvc')}</span>
      </label>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{t('register.organization.ico')}</label>
        <input value={form.ico} onChange={(e) => set('ico', e.target.value)} style={inputStyle} maxLength={8} />
        <AresLookup
          ico={form.ico}
          onResult={(d) => {
            if (d.tenantName) set('supplierCompanyName', d.tenantName);
            if (d.dic) set('dic', d.dic);
            if (d.city) set('supplierRegionCity', d.city);
          }}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{t('register.organization.dic')}</label>
        <input value={form.dic} onChange={(e) => set('dic', e.target.value)} style={inputStyle} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{t('register.personal.name')}</label>
        <input value={form.name} onChange={(e) => set('name', e.target.value)} style={inputStyle} placeholder="Jan Novák" />
        {errors.name && <div style={errorStyle}>{errors.name}</div>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{t('register.personal.email')}</label>
        <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} style={inputStyle} />
        {errors.email && <div style={errorStyle}>{errors.email}</div>}
      </div>

      <div style={{ marginBottom: 14, position: 'relative' }}>
        <label style={labelStyle}>{t('register.personal.password')}</label>
        <input
          type={showPw ? 'text' : 'password'}
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
          style={{ ...inputStyle, paddingRight: 44 }}
          placeholder={t('register.personal.passwordPlaceholder')}
        />
        <button
          type="button"
          onClick={() => setShowPw(!showPw)}
          style={{ position: 'absolute', right: 12, top: 34, background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
        >
          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        <PasswordStrengthIndicator password={form.password} />
        {errors.password && <div style={errorStyle}>{errors.password}</div>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{t('register.personal.phone')}</label>
        <input value={form.phone} onChange={(e) => set('phone', e.target.value)} style={inputStyle} placeholder="+420 777 123 456" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{t('register.supplier.categories')}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {visibleCats.map((cat) => {
            const selected = form.supplierCategories.includes(cat.value);
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => toggleCategory(cat.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 16,
                  border: selected ? '0.5px solid #0F6E56' : '0.5px solid #E5E7EB',
                  background: selected ? '#E1F5EE' : '#fff',
                  color: selected ? '#0F6E56' : '#374151',
                  fontSize: '.78rem',
                  fontWeight: selected ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {t(cat.label)}
              </button>
            );
          })}
        </div>
        {SUPPLIER_CATEGORY_OPTIONS.length > INITIAL_VISIBLE && (
          <button
            type="button"
            onClick={() => setShowAllCats(!showAllCats)}
            style={{ marginTop: 8, background: 'none', border: 'none', color: '#0F6E56', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            {showAllCats ? t('register.supplier.showLess') : t('register.supplier.showAll')}
          </button>
        )}
        {errors.supplierCategories && <div style={errorStyle}>{errors.supplierCategories}</div>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{t('register.supplier.description')}</label>
        <textarea
          value={form.supplierDescription}
          onChange={(e) => set('supplierDescription', e.target.value.slice(0, 500))}
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: "'DM Sans', sans-serif" }}
          placeholder={t('register.supplier.descriptionPlaceholder')}
        />
        <div style={{ fontSize: '.72rem', color: '#9CA3AF', marginTop: 4, textAlign: 'right' }}>
          {form.supplierDescription.length} / 500
        </div>
      </div>
    </div>
  );
}
