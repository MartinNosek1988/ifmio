import { useState } from 'react';
import { useAuditLog, useAuditEntities } from './api/audit.queries';
import type { AuditFilters } from './api/audit.api';

function DiffViewer({ oldData, newData }: { oldData: Record<string, unknown> | null; newData: Record<string, unknown> | null }) {
  if (!oldData && !newData) return <span style={{ color: 'var(--text-muted)' }}>—</span>;

  const allKeys = Array.from(new Set([
    ...Object.keys(oldData || {}),
    ...Object.keys(newData || {}),
  ])).filter((k) => !['id', 'tenantId', 'createdAt', 'updatedAt'].includes(k));

  const changes = allKeys.filter((k) => {
    const o = oldData?.[k];
    const n = newData?.[k];
    return JSON.stringify(o) !== JSON.stringify(n);
  });

  if (changes.length === 0) return <span style={{ color: 'var(--text-muted)' }}>Bez změn</span>;

  return (
    <div style={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
      {changes.slice(0, 8).map((key) => {
        const o = oldData?.[key];
        const n = newData?.[key];
        return (
          <div key={key}>
            <strong>{key}</strong>:{' '}
            {o !== undefined && (
              <span style={{ color: '#ef4444', textDecoration: 'line-through' }}>
                {typeof o === 'object' ? JSON.stringify(o) : String(o)}
              </span>
            )}
            {o !== undefined && n !== undefined && ' → '}
            {n !== undefined && (
              <span style={{ color: '#22c55e' }}>
                {typeof n === 'object' ? JSON.stringify(n) : String(n)}
              </span>
            )}
          </div>
        );
      })}
      {changes.length > 8 && <div style={{ color: 'var(--text-muted)' }}>+{changes.length - 8} dalších</div>}
    </div>
  );
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Vytvořeno',
  update: 'Upraveno',
  delete: 'Smazáno',
  bulk_deactivate: 'Hrom. deaktivace',
  bulk_activate: 'Hrom. aktivace',
  bulk_assign_property: 'Hrom. přiřazení',
  bulk_mark_debtors: 'Hrom. dlužníci',
};

const ACTION_COLORS: Record<string, string> = {
  create: '#22c55e',
  update: '#6366f1',
  delete: '#ef4444',
};

export default function AuditPage() {
  const [filters, setFilters] = useState<AuditFilters>({ page: 1, limit: 50 });
  const { data, isLoading } = useAuditLog(filters);
  const { data: entities } = useAuditEntities();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const updateFilter = (key: string, value: string) => {
    setFilters((f) => ({ ...f, [key]: value || undefined, page: 1 }));
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit log</h1>
          <p className="page-subtitle">{data ? `${data.total} záznamů` : 'Načítám...'}</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select
          className="form-select"
          value={filters.entity || ''}
          onChange={(e) => updateFilter('entity', e.target.value)}
          style={{ width: 160 }}
        >
          <option value="">Všechny entity</option>
          {entities?.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <select
          className="form-select"
          value={filters.action || ''}
          onChange={(e) => updateFilter('action', e.target.value)}
          style={{ width: 140 }}
        >
          <option value="">Všechny akce</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
        </select>
        <input
          type="date"
          className="form-input"
          value={filters.dateFrom || ''}
          onChange={(e) => updateFilter('dateFrom', e.target.value)}
          style={{ width: 150 }}
          placeholder="Od"
        />
        <input
          type="date"
          className="form-input"
          value={filters.dateTo || ''}
          onChange={(e) => updateFilter('dateTo', e.target.value)}
          style={{ width: 150 }}
          placeholder="Do"
        />
        {(filters.entity || filters.action || filters.dateFrom || filters.dateTo) && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setFilters({ page: 1, limit: 50 })}
          >
            Resetovat
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Načítám...</div>
        ) : !data?.data.length ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Žádné záznamy</div>
        ) : (
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 160 }}>Čas</th>
                <th style={{ width: 150 }}>Uživatel</th>
                <th style={{ width: 100 }}>Akce</th>
                <th style={{ width: 110 }}>Entita</th>
                <th>Změny</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ fontSize: '0.8rem' }}>
                    {new Date(entry.createdAt).toLocaleString('cs-CZ', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>{entry.user?.name || entry.user?.email || '—'}</td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#fff',
                        background: ACTION_COLORS[entry.action] || '#64748b',
                      }}
                    >
                      {ACTION_LABELS[entry.action] || entry.action}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{entry.entity}</td>
                  <td>
                    {expandedId === entry.id ? (
                      <DiffViewer oldData={entry.oldData} newData={entry.newData} />
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {entry.oldData || entry.newData ? 'Klikněte pro detail' : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button
            className="btn btn-sm btn-secondary"
            disabled={filters.page === 1}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}
          >
            Předchozí
          </button>
          <span style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
            {filters.page || 1} / {totalPages}
          </span>
          <button
            className="btn btn-sm btn-secondary"
            disabled={(filters.page || 1) >= totalPages}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
          >
            Další
          </button>
        </div>
      )}
    </div>
  );
}
