import { useTranslation } from 'react-i18next';
import { LayoutGrid, Building2, Home, KeyRound, User, Wrench } from 'lucide-react';
import { SUBJECT_TYPE_OPTIONS, type SubjectType } from '../../register.types';

const ICONS = { LayoutGrid, Building2, Home, KeyRound, User, Wrench } as const;

interface Props {
  value: SubjectType | null;
  onChange: (v: SubjectType) => void;
}

export function SubjectTypeStep({ value, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1A1A2E', margin: '0 0 8px' }}>
        {t('register.question')}
      </h2>
      <p style={{ color: '#6B7280', fontSize: '.85rem', marginBottom: 20 }}>{t('register.subtitle')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SUBJECT_TYPE_OPTIONS.map((opt) => {
          const Icon = ICONS[opt.icon as keyof typeof ICONS];
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                borderRadius: 8,
                border: selected ? '0.5px solid #0F6E56' : '0.5px solid #E5E7EB',
                background: selected ? '#E1F5EE' : '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: "'DM Sans', sans-serif",
                transition: 'all .15s',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: selected ? '#fff' : '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: selected ? '#0F6E56' : '#6B7280',
                  flexShrink: 0,
                }}
              >
                {Icon && <Icon size={20} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#1A1A2E', fontSize: '.95rem', marginBottom: 2 }}>
                  {t(opt.label)}
                </div>
                <div style={{ color: '#6B7280', fontSize: '.8rem', lineHeight: 1.4 }}>
                  {t(opt.description)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
