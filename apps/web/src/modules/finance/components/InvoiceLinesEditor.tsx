import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { formatKc } from '../../../shared/utils/format';

export interface LineItem {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  vatRate: string;
}

export function emptyLine(): LineItem {
  return { description: '', quantity: '1', unit: 'ks', unitPrice: '', vatRate: '21' };
}

export function calcLine(l: LineItem) {
  const qty = parseFloat(l.quantity) || 0;
  const price = parseFloat(l.unitPrice) || 0;
  const base = Math.round(qty * price * 100) / 100;
  const rate = parseInt(l.vatRate) || 0;
  const vat = Math.round(base * rate / 100 * 100) / 100;
  return { base, vat, total: base + vat };
}

export function InvoiceLinesEditor({ lines, onChange }: {
  lines: LineItem[];
  onChange: (lines: LineItem[]) => void;
}) {
  const update = (idx: number, key: keyof LineItem, value: string) => {
    const next = [...lines];
    next[idx] = { ...next[idx], [key]: value };
    onChange(next);
  };
  const remove = (idx: number) => onChange(lines.filter((_, i) => i !== idx));
  const add = () => onChange([...lines, emptyLine()]);

  const totals = lines.reduce((acc, l) => {
    const c = calcLine(l);
    return { base: acc.base + c.base, vat: acc.vat + c.vat, total: acc.total + c.total };
  }, { base: 0, vat: 0, total: 0 });

  const cellStyle: React.CSSProperties = {
    padding: '4px 4px', fontSize: '0.82rem',
  };
  const inputSm: React.CSSProperties = {
    width: '100%', padding: '5px 6px', borderRadius: 4,
    border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))',
    color: 'var(--text)', fontSize: '0.82rem', boxSizing: 'border-box',
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>Položky faktury</label>
        <button type="button" onClick={add}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--accent)', fontSize: '0.78rem', padding: '2px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Plus size={12} /> Přidat řádek
        </button>
      </div>

      {lines.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                <th style={{ ...cellStyle, textAlign: 'left', minWidth: 140 }}>Popis</th>
                <th style={{ ...cellStyle, textAlign: 'right', width: 55 }}>Množ.</th>
                <th style={{ ...cellStyle, textAlign: 'left', width: 50 }}>Jedn.</th>
                <th style={{ ...cellStyle, textAlign: 'right', width: 80 }}>J.cena</th>
                <th style={{ ...cellStyle, textAlign: 'right', width: 60 }}>DPH %</th>
                <th style={{ ...cellStyle, textAlign: 'right', width: 70 }}>Základ</th>
                <th style={{ ...cellStyle, textAlign: 'right', width: 70 }}>DPH</th>
                <th style={{ ...cellStyle, textAlign: 'right', width: 70 }}>Celkem</th>
                <th style={{ ...cellStyle, width: 28 }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const c = calcLine(l);
                return (
                  <tr key={i}>
                    <td style={cellStyle}>
                      <input value={l.description} onChange={e => update(i, 'description', e.target.value)} style={inputSm} placeholder="Popis položky" />
                    </td>
                    <td style={cellStyle}>
                      <input type="number" value={l.quantity} onChange={e => update(i, 'quantity', e.target.value)} style={{ ...inputSm, textAlign: 'right' }} />
                    </td>
                    <td style={cellStyle}>
                      <input value={l.unit} onChange={e => update(i, 'unit', e.target.value)} style={{ ...inputSm, width: 50 }} />
                    </td>
                    <td style={cellStyle}>
                      <input type="number" value={l.unitPrice} onChange={e => update(i, 'unitPrice', e.target.value)} style={{ ...inputSm, textAlign: 'right' }} placeholder="0" />
                    </td>
                    <td style={cellStyle}>
                      <select value={l.vatRate} onChange={e => update(i, 'vatRate', e.target.value)} style={{ ...inputSm, textAlign: 'right' }}>
                        <option value="0">0%</option>
                        <option value="10">10%</option>
                        <option value="12">12%</option>
                        <option value="15">15%</option>
                        <option value="21">21%</option>
                      </select>
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right', fontSize: '0.82rem', fontVariantNumeric: 'tabular-nums' }}>{formatKc(c.base)}</td>
                    <td style={{ ...cellStyle, textAlign: 'right', fontSize: '0.82rem', fontVariantNumeric: 'tabular-nums' }}>{formatKc(c.vat)}</td>
                    <td style={{ ...cellStyle, textAlign: 'right', fontSize: '0.82rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatKc(c.total)}</td>
                    <td style={cellStyle}>
                      <button type="button" onClick={() => remove(i)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 2 }}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {lines.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 6, fontSize: '0.84rem', fontWeight: 600 }}>
          <span>Základ: {formatKc(totals.base)}</span>
          <span>DPH: {formatKc(totals.vat)}</span>
          <span style={{ color: 'var(--accent)' }}>Celkem: {formatKc(totals.total)}</span>
        </div>
      )}
    </div>
  );
}
