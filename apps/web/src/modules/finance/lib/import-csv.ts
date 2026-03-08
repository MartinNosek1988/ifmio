export interface ImportRow {
  datum: string;
  popis: string;
  castka: number;
  vs: string;
  protiUcet: string;
  typ: 'prijem' | 'vydej';
  uctId: string;
}

/**
 * Parse FIO bank CSV export.
 * FIO format: semicolon-separated, dates DD.MM.YYYY, negative amounts = expense.
 */
export function parseCsvTransakce(text: string, uctId: string): ImportRow[] {
  const rows: ImportRow[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let headerIdx = -1;
  let colDatum = -1, colCastka = -1, colVS = -1, colProtiUcet = -1, colPopis = -1;

  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const lower = lines[i].toLowerCase();
    if (lower.includes('datum') || lower.includes('date')) {
      headerIdx = i;
      const cols = lines[i].split(/[;\t]/).map(c => c.replace(/"/g, '').toLowerCase().trim());
      colDatum = cols.findIndex(c => c.includes('datum') || c === 'date');
      colCastka = cols.findIndex(c => c.includes('objem') || c.includes('amount') || c.includes('castka') || c.includes('částka'));
      colVS = cols.findIndex(c => c.includes('variabiln') || c === 'vs' || c.includes('variable'));
      colProtiUcet = cols.findIndex(c => c.includes('protiúčet') || c.includes('protistrana') || c.includes('account'));
      colPopis = cols.findIndex(c => c.includes('zpráva') || c.includes('popis') || c.includes('poznámka') || c.includes('message'));
      break;
    }
  }

  if (headerIdx < 0) return rows;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const cols = line.split(/[;\t]/).map(c => c.replace(/"/g, '').trim());
    if (cols.length < 3) continue;

    const datumRaw = colDatum >= 0 ? cols[colDatum] || '' : '';
    const castkaRaw = colCastka >= 0 ? cols[colCastka] || '' : '';
    const vs = colVS >= 0 ? (cols[colVS] || '').replace(/\D/g, '') : '';
    const protiUcet = colProtiUcet >= 0 ? cols[colProtiUcet] || '' : '';
    const popis = colPopis >= 0 ? cols[colPopis] || `Import ${datumRaw}` : `Import ${datumRaw}`;

    let datum = '';
    if (datumRaw.includes('.')) {
      const parts = datumRaw.split('.');
      if (parts.length >= 3) datum = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    } else if (datumRaw.includes('-')) {
      datum = datumRaw.slice(0, 10);
    }
    if (!datum) continue;

    const castkaStr = castkaRaw.replace(/\s/g, '').replace(',', '.').replace(/[^\d.\-]/g, '');
    const castka = parseFloat(castkaStr);
    if (isNaN(castka) || castka === 0) continue;

    rows.push({
      datum,
      popis,
      castka: Math.abs(castka),
      vs,
      protiUcet,
      typ: castka >= 0 ? 'prijem' : 'vydej',
      uctId,
    });
  }

  return rows;
}

/**
 * Parse ABO/GPC bank format (KB, ČSOB).
 * Record type 075 = transaction line.
 */
export function parseAboTransakce(text: string, uctId: string): ImportRow[] {
  const rows: ImportRow[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (!line.startsWith('075') || line.length < 60) continue;

    try {
      const datumRaw = line.slice(122, 130);
      const datum = `${datumRaw.slice(0, 4)}-${datumRaw.slice(4, 6)}-${datumRaw.slice(6, 8)}`;
      const castkaHalere = parseInt(line.slice(40, 56), 10);
      const castka = castkaHalere / 100;
      const sign = line[56];
      const vs = line.slice(73, 83).trim().replace(/^0+/, '');
      const protiUcet = line.slice(3, 19).trim();
      const popis = line.slice(97, 117)?.trim() || 'ABO import';

      if (isNaN(castka) || castka === 0) continue;

      rows.push({
        datum,
        popis,
        castka,
        vs,
        protiUcet,
        typ: sign !== '-' ? 'prijem' : 'vydej',
        uctId,
      });
    } catch { continue; }
  }

  return rows;
}
