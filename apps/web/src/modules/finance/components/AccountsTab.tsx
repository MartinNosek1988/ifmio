import { Table, Badge } from '../../../shared/components';
import type { Column } from '../../../shared/components';
import { formatKc } from '../../../shared/utils/format';
import type { FinAccount } from '../types';

export function AccountsTab({ accounts }: { accounts: FinAccount[] }) {
  const columns: Column<FinAccount>[] = [
    { key: 'nazev', label: 'Název', render: u => <span style={{ fontWeight: 600 }}>{u.nazev}</span> },
    { key: 'cislo', label: 'Číslo účtu', render: u => <span style={{ fontFamily: 'monospace' }}>{u.cislo}</span> },
    { key: 'typ', label: 'Typ', render: u => <Badge variant="blue">{u.typ}</Badge> },
    { key: 'zustatek', label: 'Zůstatek', align: 'right', render: u => (
      <span style={{ fontWeight: 600, color: u.zustatek >= 0 ? 'var(--success)' : 'var(--danger)' }}>
        {formatKc(u.zustatek)}
      </span>
    )},
  ];

  return <Table data={accounts} columns={columns} rowKey={u => u.id} emptyText="Žádné účty" />;
}
