import type { BaseEntity } from './base';

export type TenantPlan = 'free' | 'starter' | 'professional' | 'enterprise';

export interface Tenant extends BaseEntity {
  name: string;
  plan: TenantPlan;
  ico?: string;
  dic?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo_url?: string;
  settings: TenantSettings;
}

export interface TenantSettings {
  currency: 'CZK' | 'EUR';
  locale: 'cs' | 'sk' | 'en';
  timezone: string;
  date_format: 'DD.MM.YYYY' | 'YYYY-MM-DD';
  vat_payer: boolean;
  auto_generate_prescriptions: boolean;
  prescription_due_day: number;
}

export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  currency: 'CZK',
  locale: 'cs',
  timezone: 'Europe/Prague',
  date_format: 'DD.MM.YYYY',
  vat_payer: false,
  auto_generate_prescriptions: false,
  prescription_due_day: 15,
};
