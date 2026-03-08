import type { FinPaymentOrder, FinAccount } from '../types';

/**
 * Generate ABO format file (.kpc) — matches exportABO().
 * Czech bank standard for payment orders (KB, CSOB).
 */
export function generateABO(order: FinPaymentOrder, account: FinAccount): string {
  const datum = (order.datum || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  // ABO date format: DDMMYYYY
  const datumABO = datum.slice(6) + datum.slice(4, 6) + datum.slice(0, 4);

  const cislo = (account.cislo || '000/0000').replace(/[^0-9/\-]/g, '');
  let hlavniCislo: string;
  let kodBanky: string;

  if (cislo.includes('/')) {
    const parts = cislo.split('/');
    const acctPart = parts[0];
    kodBanky = parts[1] || '0100';
    // Handle prefix-number format: 19-4782530257/0100
    hlavniCislo = acctPart.includes('-') ? acctPart.split('-')[1] : acctPart;
  } else {
    hlavniCislo = cislo;
    kodBanky = '0100';
  }

  let body = '';
  (order.polozky || []).forEach((pol, i) => {
    const protiCislo = (pol.protiUcet || '').split('/')[0] || '0';
    const protiBanka = (pol.protiUcet || '').split('/')[1] || '0100';
    const castkaHal = Math.round((pol.castka || 0) * 100)
      .toString()
      .padStart(12, '0');
    body +=
      `UBS${String(i + 1).padStart(5, '0')}` +
      `${(pol.vs || '').padStart(10, ' ')}          ` +
      `${(pol.ks || '').padStart(4, ' ')}          ` +
      `${protiCislo.padStart(16, ' ')}` +
      `${protiBanka.padStart(4, '0')}` +
      `${castkaHal}` +
      `${datumABO}    ` +
      `${(pol.ss || '').padStart(10, ' ')}` +
      `${(pol.popis || '').substring(0, 35).padEnd(35, ' ')}\n`;
  });

  const total = (order.polozky || []).reduce((s, p) => s + (p.castka || 0), 0);
  const header =
    `UHL${datumABO}` +
    `${(order.polozky || []).length.toString().padStart(6, '0')}` +
    `${Math.round(total * 100).toString().padStart(15, '0')}` +
    `${hlavniCislo.padStart(16, ' ')}` +
    `${kodBanky.padStart(4, '0')}\n`;

  return header + body;
}

/**
 * Download ABO file as .kpc via blob URL.
 */
export function downloadABO(order: FinPaymentOrder, account: FinAccount): void {
  const content = generateABO(order, account);
  const blob = new Blob([content], { type: 'text/plain;charset=windows-1250' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `prikaz_${order.id}_${order.datum || 'export'}.kpc`;
  a.click();
  URL.revokeObjectURL(a.href);
}
