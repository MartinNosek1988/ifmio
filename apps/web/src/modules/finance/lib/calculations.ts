import type {
  FinComponent,
  FinPrescription,
  FinTransaction,
  FinTenant,
  OpeningBalance,
  TenantDebt,
} from '../types';

/**
 * Calculate component amount for a tenant — matches calcSlozkaForTenant().
 * vypocet: pevna=fixed, plocha=per m², osoby=per person, nepocitat=skip
 */
export function calcComponentAmount(
  component: FinComponent,
  tenant: FinTenant,
  unitArea: number,
): number {
  if (!component || !component.aktivni) return 0;

  const osoby = tenant.pocetOsob || 1;

  switch (component.vypocet) {
    case 'pevna':
      return component.castka || 0;
    case 'plocha':
      return Math.round((component.castka || 0) * unitArea);
    case 'osoby':
      return Math.round((component.castka || 0) * osoby);
    case 'nepocitat':
      return 0;
    default:
      return component.castka || 0;
  }
}

/**
 * Calculate total monthly prescription for a tenant — matches calcTenantPredpis().
 * Filters active, non-deposit components assigned to the tenant's unit.
 * Respects individual overrides from tenant.individualniSlozky.
 */
export function calcPrescriptionTotal(
  tenant: FinTenant,
  components: FinComponent[],
  propId: number,
  unitArea: number,
): number {
  const assigned = components.filter(
    (s) =>
      String(s.propId) === String(propId) &&
      s.aktivni &&
      s.typ !== 'kauce' &&
      (s.prirazenoVsem ||
        (s.unitIds || []).some(
          (uid) => uid === tenant.unitNum || uid === (tenant as unknown as Record<string, unknown>).unitId,
        )),
  );

  let total = assigned.reduce((sum, sl) => {
    const ind = (tenant.individualniSlozky || []).find((i) => i.slozkaId === sl.id);
    if (ind) return sum + (ind.castka || 0);
    return sum + calcComponentAmount(sl, tenant, unitArea);
  }, 0);

  // Include orphaned individual items not matching any component
  (tenant.individualniSlozky || []).forEach((i) => {
    if (!components.find((s) => s.id === i.slozkaId)) {
      total += i.castka || 0;
    }
  });

  return total;
}

/**
 * Get tenant debt breakdown — matches getTenantDebt().
 */
export function getTenantDebt(
  tenantId: string,
  prescriptions: FinPrescription[],
  openingBalances: OpeningBalance[],
): TenantDebt {
  const pending = prescriptions.filter(
    (p) => p.tenantId === tenantId && p.status === 'pending',
  );
  const predpisDluh = pending.reduce((s, p) => s + (p.kUhrade || p.castka || 0), 0);

  const pocDluh = (openingBalances || []).find(
    (x) => x.tenantId === tenantId && x.typ === 'dluh',
  );
  const pocDluhUhr = (openingBalances || []).find(
    (x) => x.tenantId === tenantId && x.typ === 'dluh' && x.uhrazeno,
  );
  const pocCastka = pocDluhUhr ? 0 : pocDluh?.castka || 0;

  return {
    predpisDluh,
    pocDluh: pocCastka,
    celkem: predpisDluh + pocCastka,
    predpisy: pending,
  };
}

/**
 * Check if a payment can be applied without overpaying.
 * Returns false if amount exceeds current debt.
 */
export function canApplyPayment(
  amount: number,
  currentDebt: number,
): boolean {
  if (amount <= 0) return false;
  return amount <= currentDebt;
}

/**
 * Sum incoming transactions for a tenant.
 */
export function getTenantPayments(
  tenantId: string,
  transactions: FinTransaction[],
): number {
  return transactions
    .filter((t) => t.tenantId === tenantId && t.typ === 'prijem')
    .reduce((s, t) => s + t.castka, 0);
}
