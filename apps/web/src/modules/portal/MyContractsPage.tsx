import { useTranslation } from 'react-i18next';

export default function MyContractsPage() {
  const { t } = useTranslation();
  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1A1A2E', marginBottom: 16 }}>
        {t('portal.contracts.title')}
      </h1>
      <div
        style={{
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: 32,
          textAlign: 'center',
          color: '#6B7280',
          background: '#fff',
        }}
      >
        <p style={{ fontSize: '.95rem', margin: '0 0 8px' }}>{t('portal.contracts.comingSoon')}</p>
        <p style={{ fontSize: '.85rem', margin: 0, color: '#9CA3AF' }}>{t('portal.contracts.comingSoonDesc')}</p>
      </div>
    </div>
  );
}
