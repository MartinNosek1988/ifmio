import React from 'react';
import { formatKc } from '../../../shared/utils/format';
import type { InvoiceLine } from '../api/finance.api';

export function InvoiceLinesDetail({ lines }: { lines: InvoiceLine[] }) {
  // Group by VAT rate for summary
  const vatGroups: Record<number, { base: number; vat: number }> = {};
  let totalBase = 0, totalVat = 0, totalWithVat = 0;

  for (const l of lines) {
    const base = l.lineTotal;
    const vat = l.vatAmount ?? Math.round(base * (l.vatRate || 0) / 100 * 100) / 100;
    totalBase += base;
    totalVat += vat;
    totalWithVat += base + vat;
    if (!vatGroups[l.vatRate]) vatGroups[l.vatRate] = { base: 0, vat: 0 };
    vatGroups[l.vatRate].base += base;
    vatGroups[l.vatRate].vat += vat;
  }

  const thStyle: React.CSSProperties = {
    padding: '6px 8px', fontSize: '0.72rem', color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600,
    borderBottom: '2px solid var(--border)', textAlign: 'left',
  };
  const tdStyle: React.CSSProperties = {
    padding: '6px 8px', fontSize: '0.84rem', borderBottom: '1px solid var(--border)',
  };
  const numTd: React.CSSProperties = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
        Položky faktury
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Popis</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Množství</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>J.cena</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Základ</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>DPH %</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>DPH Kč</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Celkem</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const vat = l.vatAmount ?? Math.round(l.lineTotal * (l.vatRate || 0) / 100 * 100) / 100;
              return (
                <tr key={i}>
                  <td style={tdStyle}>{l.description}</td>
                  <td style={numTd}>{l.quantity} {l.unit}</td>
                  <td style={numTd}>{formatKc(l.unitPrice)}</td>
                  <td style={numTd}>{formatKc(l.lineTotal)}</td>
                  <td style={numTd}>{l.vatRate}%</td>
                  <td style={numTd}>{formatKc(vat)}</td>
                  <td style={{ ...numTd, fontWeight: 600 }}>{formatKc(l.lineTotal + vat)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* VAT summary by rate */}
      <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--surface-2, var(--surface))', borderRadius: 6, fontSize: '0.82rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 6 }}>
          {Object.entries(vatGroups).sort(([a], [b]) => Number(a) - Number(b)).map(([rate, g]) => (
            <span key={rate} style={{ color: 'var(--text-muted)' }}>
              Základ {rate}%: <strong>{formatKc(g.base)}</strong>, DPH: <strong>{formatKc(g.vat)}</strong>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 20, fontWeight: 600 }}>
          <span>Základ celkem: {formatKc(totalBase)}</span>
          <span>DPH celkem: {formatKc(totalVat)}</span>
          <span style={{ color: 'var(--accent)' }}>K úhradě: {formatKc(totalWithVat)}</span>
        </div>
      </div>
    </div>
  );
}
