import { Logger } from '@nestjs/common';

const AUTH_URL = 'https://portal-auth.moje.veolia.cz/realms/pvk/protocol/openid-connect/token';
const API_BASE = 'https://portal-api.pvk.cz';
const TIMEOUT = 30_000;
const RATE_LIMIT_MS = 1_000;

const logger = new Logger('PvkApiClient');

// ─── Types ──────────────────────────────────────────────────────

export interface PvkTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface PvkPartner {
  id: number;
  name: string;
  role: string;
  privileges: string[];
}

export interface PvkCustomerAccount {
  id: number;
  accountNumber: string;
  consumptionPlaces: PvkConsumptionPlace[];
}

export interface PvkConsumptionPlace {
  id: number;
  address: string;
  advancesAmount?: number;
  waterMeterNumbers?: string[];
}

export interface PvkInvoice {
  id: number;
  created: string;
  due: string;
  variableSymbol: string;
  total: number; // in haléře (CZK * 100)
  state: string;
  hasAttachment: boolean;
  periodFrom: string;
  periodTo: string;
}

export interface PvkPayment {
  id: number;
  date: string;
  amount: number;
  variableSymbol: string;
  paymentMethodName: string;
  accountingInfo?: string;
}

export interface PvkWaterDeduction {
  id: number;
  measuredDateFrom: string;
  measuredDateTo: string;
  waterMeterNumber: string;
  measuredValueFrom: number;
  measuredValueTo: number;
  amount: number; // m³
  averagePerDay: number;
  measurementType: string;
  intervalLengthDays: number;
}

export interface PvkAttachment {
  documentId: number;
  fileName: string;
  fileType: string;
}

export interface PvkPagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// ─── Helpers ────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Auth ───────────────────────────────────────────────────────

export async function getToken(email: string, password: string): Promise<PvkTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: 'portal',
    username: email,
    password,
  });

  const res = await fetchWithTimeout(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PVK auth failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<PvkTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: 'portal',
    refresh_token: refreshToken,
  });

  const res = await fetchWithTimeout(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`PVK token refresh failed (${res.status})`);
  return res.json();
}

// ─── API calls ──────────────────────────────────────────────────

async function apiGet<T>(path: string, token: string): Promise<T> {
  await sleep(RATE_LIMIT_MS); // rate limit: max 1 req/sec
  const res = await fetchWithTimeout(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`PVK API ${path} failed (${res.status})`);
  }
  return res.json();
}

export async function getPartners(token: string): Promise<PvkPartner[]> {
  const data = await apiGet<{ partners: PvkPartner[] }>(
    '/api/web/protected/user/currentUserAccount',
    token,
  );
  return data.partners ?? [];
}

export async function getCustomerAccounts(token: string): Promise<PvkCustomerAccount[]> {
  return apiGet<PvkCustomerAccount[]>(
    '/api/web/protected/customerAccount/list',
    token,
  );
}

export async function getConsumptionPlaces(token: string): Promise<PvkConsumptionPlace[]> {
  return apiGet<PvkConsumptionPlace[]>(
    '/api/web/protected/consumptionPlace/list',
    token,
  );
}

export async function getInvoices(
  token: string,
  consumptionPlaceId: number,
  page = 0,
  size = 50,
): Promise<PvkPagedResponse<PvkInvoice>> {
  return apiGet(
    `/api/web/protected/invoice/all/pagedList?consumptionPlaceId=${consumptionPlaceId}&page=${page}&size=${size}`,
    token,
  );
}

export async function getAllInvoices(
  token: string,
  consumptionPlaceId: number,
): Promise<PvkInvoice[]> {
  const all: PvkInvoice[] = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const res = await getInvoices(token, consumptionPlaceId, page);
    all.push(...res.content);
    totalPages = res.totalPages;
    page++;
    logger.debug(`Invoices page ${page}/${totalPages} for place ${consumptionPlaceId}`);
  }

  return all;
}

export async function getPayments(
  token: string,
  customerAccountId: number,
  page = 0,
  size = 50,
): Promise<PvkPagedResponse<PvkPayment>> {
  return apiGet(
    `/api/web/protected/payment/pagedList?customerAccountId=${customerAccountId}&page=${page}&size=${size}`,
    token,
  );
}

export async function getAllPayments(
  token: string,
  customerAccountId: number,
): Promise<PvkPayment[]> {
  const all: PvkPayment[] = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const res = await getPayments(token, customerAccountId, page);
    all.push(...res.content);
    totalPages = res.totalPages;
    page++;
  }

  return all;
}

// ─── Water deductions ───────────────────────────────────────

export async function getWaterDeductions(
  token: string,
  consumptionPlaceId: number,
  page = 0,
  size = 50,
): Promise<PvkPagedResponse<PvkWaterDeduction>> {
  return apiGet(
    `/api/web/protected/consumptionPlace/${consumptionPlaceId}/waterDeduction/pagedList?page=${page}&size=${size}`,
    token,
  );
}

export async function getAllWaterDeductions(
  token: string,
  consumptionPlaceId: number,
): Promise<PvkWaterDeduction[]> {
  const all: PvkWaterDeduction[] = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const res = await getWaterDeductions(token, consumptionPlaceId, page);
    all.push(...res.content);
    totalPages = res.totalPages;
    page++;
  }

  return all;
}

// ─── Invoice PDF attachments ────────────────────────────────

export async function getInvoiceAttachments(
  token: string,
  invoiceId: number,
  customerAccountId: number,
  consumptionPlaceId: number,
): Promise<PvkAttachment[]> {
  return apiGet(
    `/api/web/protected/invoice/${invoiceId}/attachment/list?customerAccountId=${customerAccountId}&consumptionPlaceId=${consumptionPlaceId}`,
    token,
  );
}

export async function downloadDocument(token: string, documentId: number): Promise<Buffer> {
  await sleep(RATE_LIMIT_MS);
  const res = await fetchWithTimeout(`${API_BASE}/api/web/protected/document/${documentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`PVK document download failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}
