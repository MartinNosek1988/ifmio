import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { apiClient } from '../../core/api/client';
import { Modal } from '../../shared/components/Modal';
import { Badge } from '../../shared/components/Badge';

interface UnitGroupsTabProps {
  propertyId: string;
  units: { id: string; name: string; knDesignation?: string | null }[];
}

interface UnitGroup {
  id: string;
  name: string;
  type: string;
  sortOrder: number;
  memberships: { id: string; unitId: string; unit: { id: string; name: string } }[];
}

const TYPE_LABELS: Record<string, string> = { entrance: 'Vchod', floor: 'Patro', custom: 'Vlastní' };
const TYPE_COLORS: Record<string, 'blue' | 'green' | 'muted'> = { entrance: 'blue', floor: 'green', custom: 'muted' };

export function UnitGroupsTab({ propertyId, units }: UnitGroupsTabProps) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [addToGroup, setAddToGroup] = useState<string | null>(null);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('custom');

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['unit-groups', propertyId],
    queryFn: () => apiClient.get<UnitGroup[]>(`/properties/${propertyId}/unit-groups`).then(r => r.data),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['unit-groups', propertyId] });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; type: string }) =>
      apiClient.post(`/properties/${propertyId}/unit-groups`, data),
    onSuccess: () => { invalidate(); setShowCreate(false); setNewName(''); setNewType('custom'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/properties/${propertyId}/unit-groups/${id}`),
    onSuccess: invalidate,
  });

  const addUnitsMutation = useMutation({
    mutationFn: ({ groupId, unitIds }: { groupId: string; unitIds: string[] }) =>
      apiClient.post(`/properties/${propertyId}/unit-groups/${groupId}/units`, { unitIds }),
    onSuccess: () => { invalidate(); setAddToGroup(null); setSelectedUnits([]); },
  });

  const removeUnitMutation = useMutation({
    mutationFn: ({ groupId, unitId }: { groupId: string; unitId: string }) =>
      apiClient.delete(`/properties/${propertyId}/unit-groups/${groupId}/units/${unitId}`),
    onSuccess: invalidate,
  });

  const autoCreateMutation = useMutation({
    mutationFn: () => apiClient.post(`/properties/${propertyId}/unit-groups/auto-entrance`),
    onSuccess: invalidate,
  });

  // Units not assigned to any group
  const assignedUnitIds = new Set(groups.flatMap(g => g.memberships.map(m => m.unitId)));
  const unassignedUnits = units.filter(u => !assignedUnitIds.has(u.id));

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
    borderRadius: 6, fontSize: '0.85rem', background: 'var(--card-bg)', color: 'var(--text)',
  };

  if (isLoading) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Načítám...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {groups.length} {groups.length === 1 ? 'skupina' : groups.length < 5 ? 'skupiny' : 'skupin'} &middot;{' '}
          {unassignedUnits.length} nepřiřazených jednotek
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn--sm" onClick={() => autoCreateMutation.mutate()} disabled={autoCreateMutation.isPending}>
            <Building2 size={14} /> Auto dle vchodů
          </button>
          <button className="btn btn--primary btn--sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Nová skupina
          </button>
        </div>
      </div>

      {groups.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
          Žádné skupiny. Vytvořte první skupinu nebo použijte "Auto dle vchodů".
        </div>
      )}

      {groups.map(group => (
        <div key={group.id} className="card" style={{ marginBottom: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{group.name}</span>
              <Badge variant={TYPE_COLORS[group.type] ?? 'muted'}>{TYPE_LABELS[group.type] ?? group.type}</Badge>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>({group.memberships.length} jednotek)</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn--sm" onClick={() => { setAddToGroup(group.id); setSelectedUnits([]); }}>
                <Plus size={12} /> Přidat
              </button>
              <button className="btn btn--sm" style={{ color: 'var(--danger)' }}
                onClick={() => { if (confirm(`Smazat skupinu "${group.name}"?`)) deleteMutation.mutate(group.id); }}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          {group.memberships.length === 0 ? (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Prázdná skupina</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {group.memberships.map(m => (
                <span key={m.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'var(--surface, #f1f5f9)', padding: '4px 10px', borderRadius: 6, fontSize: '0.82rem',
                }}>
                  {m.unit.name}
                  <button onClick={() => removeUnitMutation.mutate({ groupId: group.id, unitId: m.unitId })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, lineHeight: 1 }}
                    title="Odebrat">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Create group modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nová skupina jednotek">
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Název</label>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="např. Vchod A" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Typ</label>
          <select value={newType} onChange={e => setNewType(e.target.value)} style={inputStyle}>
            <option value="entrance">Vchod</option>
            <option value="floor">Patro</option>
            <option value="custom">Vlastní</option>
          </select>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn btn--sm" onClick={() => setShowCreate(false)}>Zrušit</button>
          <button className="btn btn--primary btn--sm" disabled={!newName.trim()} onClick={() => createMutation.mutate({ name: newName.trim(), type: newType })}>
            Vytvořit
          </button>
        </div>
      </Modal>

      {/* Add units to group modal */}
      <Modal open={!!addToGroup} onClose={() => setAddToGroup(null)} title="Přidat jednotky do skupiny">
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {unassignedUnits.length === 0 ? (
            <div style={{ padding: 16, color: 'var(--text-muted)', textAlign: 'center' }}>Všechny jednotky jsou přiřazeny.</div>
          ) : (
            unassignedUnits.map(u => (
              <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={selectedUnits.includes(u.id)}
                  onChange={e => setSelectedUnits(prev => e.target.checked ? [...prev, u.id] : prev.filter(x => x !== u.id))} />
                {u.name} {u.knDesignation && <span style={{ color: 'var(--text-muted)' }}>({u.knDesignation})</span>}
              </label>
            ))
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn btn--sm" onClick={() => setAddToGroup(null)}>Zrušit</button>
          <button className="btn btn--primary btn--sm" disabled={selectedUnits.length === 0}
            onClick={() => addToGroup && addUnitsMutation.mutate({ groupId: addToGroup, unitIds: selectedUnits })}>
            Přidat {selectedUnits.length > 0 ? `(${selectedUnits.length})` : ''}
          </button>
        </div>
      </Modal>
    </div>
  );
}
