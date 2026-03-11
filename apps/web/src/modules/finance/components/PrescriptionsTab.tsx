import { useMemo } from 'react';
import { SearchBar, Table, Badge } from '../../../shared/components';
import type { Column } from '../../../shared/components';
import { formatKc, formatCzDate } from '../../../shared/utils/format';
import { FIN_STATUS_LABELS, label } from '../../../constants/labels';
import type { FinPrescription } from '../types';

export const PRES_TYPE_LABELS: Record<string, string> = {
  advance: 'Záloha', service: 'Služby', rent: 'Nájem', other: 'Ostatní',
};

const PRES_STATUS_LABELS: Record<string, string> = {
  active: 'Aktivní', inactive: 'Neaktivní', cancelled: 'Zrušený',
};

export function PrescriptionsTab({ prescriptions, search, onSearch, onSelect, getPropName, filterType, onFilterType, filterStatus, onFilterStatus, onDelete }: {
  prescriptions: FinPrescription[];
  search: string;
  onSearch: (q: string) => void;
  onSelect: (p: FinPrescription) => void;
  getPropName: (id: unknown) => string;
  filterType: string;
  onFilterType: (v: string) => void;
  filterStatus: string;
  onFilterStatus: (v: string) => void;
  onDelete: (p: FinPrescription) => void;
}) {
  const filtered = useMemo(() => {
    let list = [...prescriptions].sort((a, b) => b.datum.localeCompare(a.datum));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.popis.toLowerCase().includes(q) || getPropName(p.propId).toLowerCase().includes(q));
    }
    return list;
  }, [prescriptions, search, getPropName]);

  const statusColor: Record<string, 'green' | 'yellow' | 'red' | 'blue' | 'muted'> = {
    paid: 'green', partial: 'yellow', pending: 'blue', overdue: 'red',
  };

  const selectStyle = {
    padding: '8px 12px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
  };

  const columns: Column<FinPrescription>[] = [
    { key: 'datum', label: 'Datum', render: (p) => <span className="text-muted text-sm">{formatCzDate(p.datum)}</span> },
    { key: 'popis', label: 'Popis', render: (p) => <span style={{ fontWeight: 500 }}>{p.popis}</span> },
    { key: 'typ', label: 'Typ', render: (p) => <Badge variant="blue">{PRES_TYPE_LABELS[p.typ] || p.typ}</Badge> },
    { key: 'propId', label: 'Nemovitost', render: (p) => <span className="text-sm">{getPropName(p.propId)}</span> },
    { key: 'status', label: 'Status', render: (p) => <Badge variant={statusColor[p.status] || 'muted'}>{label(FIN_STATUS_LABELS, p.status)}</Badge> },
    { key: 'castka', label: 'Částka', align: 'right', render: (p) => <span className="font-semibold">{formatKc(p.castka)}</span> },
    { key: 'kUhrade', label: 'K úhradě', align: 'right', render: (p) => (
      <span style={{ color: (p.kUhrade ?? 0) > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
        {formatKc(p.kUhrade ?? 0)}
      </span>
    )},
    { key: 'splatnost', label: 'Splatnost', render: (p) => {
      const overdue = p.splatnost < new Date().toISOString().slice(0, 10) && p.status !== 'paid';
      return <span style={{ color: overdue ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.85rem' }}>{formatCzDate(p.splatnost)}</span>;
    }},
    { key: 'actions', label: '', render: (p) => (
      <button onClick={(e) => { e.stopPropagation(); onDelete(p); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.8rem' }}>
        Smazat
      </button>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1 }}><SearchBar placeholder="Hledat předpisy..." onSearch={onSearch} /></div>
        <select value={filterType} onChange={(e) => onFilterType(e.target.value)} style={selectStyle}>
          <option value="">Všechny typy</option>
          {Object.entries(PRES_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => onFilterStatus(e.target.value)} style={selectStyle}>
          <option value="">Aktivní</option>
          {Object.entries(PRES_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <Table data={filtered} columns={columns} rowKey={p => p.id} onRowClick={onSelect} emptyText="Žádné předpisy. Klikni na Generovat předpisy." />
    </div>
  );
}
