import { useState } from 'react';
import { ChevronDown, Gauge, CornerDownRight } from 'lucide-react';
import { Badge } from '../../../shared/components';
import type { ApiMeter } from '../api/meters.api';

interface Props {
  mainMeter: ApiMeter;
  childMeters: ApiMeter[];
  onSelect: (m: ApiMeter) => void;
}

export function MeterGroupCard({ mainMeter, childMeters, onSelect }: Props) {
  const [expanded, setExpanded] = useState(true);

  const formatReading = (val: number | null, unit: string) =>
    val != null ? `${val.toLocaleString('cs-CZ')} ${unit}` : '—';

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 10,
        marginBottom: 12,
        background: 'var(--surface)',
        overflow: 'hidden',
      }}
    >
      {/* Parent row */}
      <div
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'var(--primary-50)',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <ChevronDown
            size={16}
            style={{
              color: 'var(--text-muted)',
              transition: 'transform .15s',
              transform: expanded ? 'none' : 'rotate(-90deg)',
              flexShrink: 0,
            }}
          />
          <Gauge size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(mainMeter);
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontWeight: 600,
              color: 'var(--text)',
              cursor: 'pointer',
              fontSize: '.95rem',
            }}
          >
            {mainMeter.name}
          </button>
          <Badge variant="green">Patní</Badge>
          <span
            style={{
              color: 'var(--text-muted)',
              fontFamily: 'monospace',
              fontSize: '.78rem',
            }}
          >
            {mainMeter.serialNumber}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: 'var(--text-muted)', fontSize: '.85rem' }}>
          <span>{childMeters.length} podružných</span>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>
            {formatReading(mainMeter.lastReading, mainMeter.unit)}
          </span>
        </div>
      </div>

      {/* Children rows */}
      {expanded && childMeters.length > 0 && (
        <div>
          {childMeters.map((child, i) => (
            <div
              key={child.id}
              onClick={() => onSelect(child)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px 10px 42px',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                cursor: 'pointer',
                fontSize: '.9rem',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-50)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <CornerDownRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ fontWeight: 500, color: 'var(--text)' }}>{child.name}</span>
                <span
                  style={{
                    color: 'var(--text-muted)',
                    fontFamily: 'monospace',
                    fontSize: '.75rem',
                  }}
                >
                  {child.serialNumber}
                </span>
              </div>
              <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 16 }}>
                <span>{child.unitRel?.name ?? '—'}</span>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                  {formatReading(child.lastReading, child.unit)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
