import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Check } from 'lucide-react';
import { getRedirectPath, type SubjectType } from '../../register.types';

const HINT_KEYS: Record<SubjectType, { hints: string[]; ctaKey: string }> = {
  svj_bd: { hints: ['register.done.svjBd.hint1', 'register.done.svjBd.hint2'], ctaKey: 'register.done.svjBd.cta' },
  spravce: { hints: ['register.done.spravce.hint1', 'register.done.spravce.hint2'], ctaKey: 'register.done.spravce.cta' },
  vlastnik_domu: { hints: ['register.done.vlastnikDomu.hint1', 'register.done.vlastnikDomu.hint2'], ctaKey: 'register.done.vlastnikDomu.cta' },
  vlastnik_jednotky: { hints: ['register.done.vlastnikJednotky.hint1', 'register.done.vlastnikJednotky.hint2'], ctaKey: 'register.done.vlastnikJednotky.cta' },
  najemnik: { hints: ['register.done.najemnik.hint1', 'register.done.najemnik.hint2', 'register.done.najemnik.hint3'], ctaKey: 'register.done.najemnik.cta' },
  dodavatel: { hints: ['register.done.dodavatel.hint1', 'register.done.dodavatel.hint2'], ctaKey: 'register.done.dodavatel.cta' },
};

export function DoneStep({ subjectType }: { subjectType: SubjectType }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const config = HINT_KEYS[subjectType];

  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <CheckCircle size={56} style={{ color: '#0F6E56', marginBottom: 16 }} />
      <h2 style={{ color: '#1A1A2E', fontSize: '1.4rem', fontWeight: 700, marginBottom: 16 }}>
        {t('register.done.title')}
      </h2>

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 auto 24px', maxWidth: 320, textAlign: 'left' }}>
        {config.hints.map((key) => (
          <li
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 0',
              fontSize: '.9rem',
              color: '#374151',
            }}
          >
            <Check size={16} style={{ color: '#0F6E56', flexShrink: 0 }} />
            {t(key)}
          </li>
        ))}
      </ul>

      <button
        onClick={() => navigate(getRedirectPath(subjectType), { replace: true })}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 24px',
          background: '#0F6E56',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontWeight: 600,
          fontSize: '.95rem',
          cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {t(config.ctaKey)} <ArrowRight size={16} />
      </button>
    </div>
  );
}
