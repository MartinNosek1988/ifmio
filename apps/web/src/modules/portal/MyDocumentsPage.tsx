import { useMyDocuments } from './api/portal.queries'
import { LoadingSpinner } from '../../shared/components'
import { Download, FolderOpen } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  contract: 'Smlouva', invoice: 'Faktura', protocol: 'Protokol',
  photo: 'Foto', plan: 'Plán', regulation: 'Předpis', other: 'Ostatní',
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function MyDocumentsPage() {
  const { data: docs, isLoading, error } = useMyDocuments()

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-danger">Nepodařilo se načíst dokumenty.</div>

  if (!docs?.length) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
        <FolderOpen size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
        <p style={{ fontWeight: 600, fontSize: '.95rem' }}>Žádné dostupné dokumenty</p>
        <p style={{ fontSize: '.85rem' }}>Správce zatím nesdílel žádné dokumenty.</p>
      </div>
    )
  }

  const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'

  // Group by entityType
  const propertyDocs = docs.filter((d: any) => d.entityType === 'property')
  const unitDocs = docs.filter((d: any) => d.entityType === 'unit')

  const renderGroup = (title: string, items: any[]) => {
    if (!items.length) return null
    return (
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '.95rem', fontWeight: 600, marginBottom: 10 }}>{title}</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((d: any) => (
            <div key={d.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: '.9rem' }}>{d.name}</div>
                <div className="text-muted" style={{ fontSize: '.78rem', display: 'flex', gap: 10, marginTop: 2 }}>
                  <span style={{ fontSize: '.7rem', fontWeight: 600, borderRadius: 3, padding: '1px 6px', background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                    {CATEGORY_LABELS[d.category] ?? d.category}
                  </span>
                  <span>{formatSize(d.size)}</span>
                  <span>{d.createdAt?.slice(0, 10)}</span>
                </div>
              </div>
              <a href={`${baseUrl}/documents/${d.id}/download`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary, #6366f1)', fontSize: '.82rem', textDecoration: 'none', fontWeight: 500 }}
              >
                <Download size={14} /> Stáhnout
              </a>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {renderGroup('Dokumenty nemovitosti', propertyDocs)}
      {renderGroup('Dokumenty jednotky', unitDocs)}
    </div>
  )
}
