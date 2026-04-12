import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { PasswordStrengthIndicator } from '../../../../shared/components/PasswordStrengthIndicator';
import { inputStyle, labelStyle, errorStyle, type StepProps } from '../../register.types';

export function PersonalStep({ form, set, errors }: StepProps) {
  const { t } = useTranslation();
  const [showPw, setShowPw] = useState(false);

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1A1A2E', margin: '0 0 20px' }}>
        {t('register.step.personal')}
      </h2>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{t('register.personal.name')}</label>
        <input value={form.name} onChange={(e) => set('name', e.target.value)} style={inputStyle} placeholder="Jan Novák" />
        {errors.name && <div style={errorStyle}>{errors.name}</div>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{t('register.personal.email')}</label>
        <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} style={inputStyle} placeholder="jan@email.cz" />
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
    </div>
  );
}
