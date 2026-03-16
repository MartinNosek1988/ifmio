import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Badge } from '../../shared/components';
import { propertiesApi } from './properties-api';
import { SPACE_TYPES } from './UnitForm';
import type { SpaceTypeValue } from './properties-api';

interface Props {
  propertyId: string;
  propertyName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BulkUnitForm({ propertyId, propertyName, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [prefix, setPrefix] = useState('Byt');
  const [separator, setSeparator] = useState(' ');
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(10);
  const [floor, setFloor] = useState('');
  const [area, setArea] = useState('');
  const [spaceType, setSpaceType] = useState<SpaceTypeValue>('RESIDENTIAL');
  const [disposition, setDisposition] = useState('');

  const count = Math.max(0, to - from + 1);
  const isValid = count > 0 && count <= 100;

  const preview = useMemo(() => {
    if (count <= 0) return [];
    const items: string[] = [];
    for (let i = from; i <= Math.min(from + 2, to); i++) {
      items.push((prefix ? prefix + separator : '') + i);
    }
    if (count > 3) {
      items.push('...');
      items.push((prefix ? prefix + separator : '') + to);
    }
    return items;
  }, [prefix, separator, from, to, count]);

  const mutation = useMutation({
    mutationFn: async () => {
      const results: string[] = [];
      for (let i = from; i <= to; i++) {
        const name = (prefix ? prefix + separator : '') + i;
        await propertiesApi.createUnit(propertyId, {
          name,
          floor: floor ? parseInt(floor) : undefined,
          area: area ? parseFloat(area) : undefined,
          spaceType,
          disposition: disposition || undefined,
        });
        results.push(name);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      onSuccess?.();
    },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Hromadné přidání jednotek"
      subtitle={propertyName}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button
            variant="primary"
            onClick={() => mutation.mutate()}
            disabled={!isValid || mutation.isPending}
          >
            {mutation.isPending ? `Vytvářím... (${count})` : `Vytvořit ${count} jednotek`}
          </Button>
        </div>
      }
    >
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Vytvoří jednotky s automatickým číslováním v zadaném rozmezí. Max. 100 najednou.
      </div>

      {/* Prefix + separator */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Prefix názvu</label>
          <input
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="Byt, Garáž, PM..."
            style={inputStyle}
          />
        </div>
        <div>
          <label className="form-label">Oddělovač</label>
          <select
            value={separator}
            onChange={(e) => setSeparator(e.target.value)}
            style={inputStyle}
          >
            <option value=" ">mezera</option>
            <option value="">(žádný)</option>
            <option value="/">/</option>
            <option value="-">-</option>
          </select>
        </div>
      </div>

      {/* From-To */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: 8, alignItems: 'end', marginBottom: 14 }}>
        <div>
          <label className="form-label">Od čísla</label>
          <input
            type="number"
            value={from}
            onChange={(e) => setFrom(parseInt(e.target.value) || 1)}
            min={1}
            max={9999}
            style={{ ...inputStyle, fontWeight: 700 }}
          />
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem', paddingBottom: 8 }}>—</span>
        <div>
          <label className="form-label">Do čísla</label>
          <input
            type="number"
            value={to}
            onChange={(e) => setTo(parseInt(e.target.value) || 1)}
            min={1}
            max={9999}
            style={{ ...inputStyle, fontWeight: 700 }}
          />
        </div>
        <div style={{ paddingBottom: 6 }}>
          <Badge variant={count > 100 ? 'red' : count <= 0 ? 'muted' : 'green'}>
            {count} jednotek
          </Badge>
        </div>
      </div>

      {/* Validation warning */}
      {count > 100 && (
        <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid var(--danger)', borderRadius: 6, padding: '6px 10px', fontSize: '0.8rem', color: 'var(--danger)', marginBottom: 12 }}>
          Maximum je 100 jednotek najednou.
        </div>
      )}
      {count <= 0 && from > 0 && to > 0 && (
        <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid var(--danger)', borderRadius: 6, padding: '6px 10px', fontSize: '0.8rem', color: 'var(--danger)', marginBottom: 12 }}>
          Číslo "Do" musí být větší nebo rovno číslu "Od".
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
          Náhled: <strong style={{ color: 'var(--text)' }}>{preview.join(', ')}</strong>
        </div>
      )}

      {/* Shared values */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
          Společné hodnoty (volitelné)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
          <div>
            <label className="form-label">Typ prostoru</label>
            <select value={spaceType} onChange={(e) => setSpaceType(e.target.value as SpaceTypeValue)} style={inputStyle}>
              {SPACE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Dispozice</label>
            <input value={disposition} onChange={(e) => setDisposition(e.target.value)} placeholder="2+kk" style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="form-label">Patro</label>
            <input type="number" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="1" style={inputStyle} />
          </div>
          <div>
            <label className="form-label">Plocha (m²)</label>
            <input type="number" step="0.01" value={area} onChange={(e) => setArea(e.target.value)} placeholder="65" style={inputStyle} />
          </div>
        </div>
      </div>

      {mutation.isError && (
        <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 12 }}>
          Chyba při vytváření jednotek.
        </div>
      )}

      {mutation.isSuccess && (
        <div style={{ color: 'var(--success)', fontSize: '0.85rem', marginTop: 12, fontWeight: 600 }}>
          Vytvořeno {count} jednotek.
        </div>
      )}
    </Modal>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'var(--surface-2, var(--surface))',
  color: 'var(--text)',
  boxSizing: 'border-box',
};
