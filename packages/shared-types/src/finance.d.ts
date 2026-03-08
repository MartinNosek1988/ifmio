import type { UUID, ISODate } from './common';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'pending' | 'completed' | 'cancelled';
export type VatRate = 0 | 12 | 21;
export interface FinanceTransaction {
    id: UUID;
    tenantId: UUID;
    propertyId?: UUID;
    type: TransactionType;
    status: TransactionStatus;
    amount: number;
    vatRate: VatRate;
    vatAmount: number;
    description: string;
    date: ISODate;
    createdAt: ISODate;
    updatedAt: ISODate;
}
export type CreateTransactionDto = Pick<FinanceTransaction, 'type' | 'amount' | 'vatRate' | 'description' | 'date' | 'propertyId'>;
export type UpdateTransactionDto = Partial<CreateTransactionDto>;
export interface BankAccount {
    id: UUID;
    tenantId: UUID;
    propertyId?: UUID;
    name: string;
    accountNumber: string;
    iban?: string;
    bankCode?: string;
    currency: string;
    isActive: boolean;
    createdAt: ISODate;
    updatedAt: ISODate;
}
export type BankTransactionType = 'credit' | 'debit';
export type BankTransactionStatus = 'unmatched' | 'matched' | 'partially_matched';
export interface BankTransaction {
    id: UUID;
    tenantId: UUID;
    bankAccountId: UUID;
    amount: number;
    type: BankTransactionType;
    status: BankTransactionStatus;
    date: ISODate;
    counterparty?: string;
    counterpartyIban?: string;
    variableSymbol?: string;
    specificSymbol?: string;
    constantSymbol?: string;
    description?: string;
    prescriptionId?: UUID;
    residentId?: UUID;
    createdAt: ISODate;
    updatedAt: ISODate;
}
export type BillingPeriodStatus = 'open' | 'closed' | 'settled';
export interface BillingPeriod {
    id: UUID;
    tenantId: UUID;
    propertyId: UUID;
    name: string;
    dateFrom: ISODate;
    dateTo: ISODate;
    status: BillingPeriodStatus;
    createdAt: ISODate;
    updatedAt: ISODate;
}
export type PrescriptionType = 'advance' | 'service' | 'rent' | 'other';
export type PrescriptionStatus = 'active' | 'inactive' | 'cancelled';
export interface PrescriptionItem {
    id: UUID;
    prescriptionId: UUID;
    name: string;
    amount: number;
    vatRate: number;
    unit?: string;
    quantity: number;
    createdAt: ISODate;
}
export interface Prescription {
    id: UUID;
    tenantId: UUID;
    propertyId: UUID;
    unitId?: UUID;
    residentId?: UUID;
    billingPeriodId?: UUID;
    type: PrescriptionType;
    status: PrescriptionStatus;
    amount: number;
    vatRate: number;
    vatAmount: number;
    dueDay: number;
    variableSymbol?: string;
    description: string;
    validFrom: ISODate;
    validTo?: ISODate;
    items: PrescriptionItem[];
    createdAt: ISODate;
    updatedAt: ISODate;
}
export type CreateBankAccountDto = Pick<BankAccount, 'name' | 'accountNumber' | 'propertyId'> & Partial<Pick<BankAccount, 'iban' | 'bankCode' | 'currency'>>;
export type CreatePrescriptionDto = Pick<Prescription, 'propertyId' | 'type' | 'amount' | 'description' | 'validFrom'> & Partial<Pick<Prescription, 'unitId' | 'residentId' | 'vatRate' | 'dueDay' | 'variableSymbol' | 'validTo'>> & {
    items?: Omit<PrescriptionItem, 'id' | 'prescriptionId' | 'createdAt'>[];
};
