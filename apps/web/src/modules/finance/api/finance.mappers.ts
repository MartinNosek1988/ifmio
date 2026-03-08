import type { ApiBankAccount, ApiBankTransaction, ApiPrescription } from './finance.api';
import type { FinAccount, FinTransaction, FinPrescription } from '../types';

export function mapAccount(a: ApiBankAccount): FinAccount {
  return {
    id: a.id,
    nazev: a.name,
    cislo: a.accountNumber,
    typ: 'banka',
    zustatek: 0,
    propId: a.propertyId || '',
  };
}

export function mapPrescription(p: ApiPrescription): FinPrescription {
  const today = new Date().toISOString().slice(0, 10);
  const from = new Date(p.validFrom);
  from.setDate(p.dueDay || 1);
  const splatnost = from.toISOString().slice(0, 10);
  let status: FinPrescription['status'] = p.status as FinPrescription['status'];
  if (!['paid', 'partial', 'pending', 'overdue'].includes(status)) {
    status = splatnost < today ? 'overdue' : 'pending';
  }
  return {
    id: p.id,
    propId: p.propertyId as unknown as number,
    jednotkaId: p.unit?.id || '',
    castka: p.amount,
    kUhrade: p.amount - p.vatAmount,
    datum: p.validFrom,
    splatnost,
    status,
    popis: p.description,
    typ: p.type,
    vs: p.variableSymbol,
    tenantId: p.resident?.id,
  };
}

export function mapTransaction(t: ApiBankTransaction): FinTransaction {
  return {
    id: t.id,
    propId: 0,
    uctId: t.bankAccountId,
    typ: t.type === 'credit' ? 'prijem' : 'vydej',
    datum: t.date,
    castka: t.amount,
    vs: t.variableSymbol || '',
    protiUcet: t.counterparty || '',
    popis: t.description || '',
    cil: '',
    parovani: t.status === 'matched' || t.status === 'partially_matched' ? ['matched'] : [],
    created: t.createdAt,
  };
}
