import {
  Controller, Get, Post, Put, Delete, Body, Query, Param, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { InvoicesService } from './invoices.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditAction } from '../common/decorators/audit.decorator';
import { ROLES_WRITE } from '../common/constants/roles.constants';
import type { FastifyRequest } from 'fastify';

interface AuthUser {
  id: string;
  tenantId: string;
  role: string;
}

@ApiTags('Finance')
@ApiBearerAuth()
@Controller('finance')
export class FinanceController {
  constructor(
    private service: FinanceService,
    private invoicesService: InvoicesService,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Finance summary — přehled' })
  getSummary(
    @CurrentUser() user: AuthUser,
    @Query('propertyId') propertyId?: string,
  ) {
    return this.service.getSummary(user, propertyId);
  }

  @Get('bank-accounts')
  @ApiOperation({ summary: 'Bankovní účty' })
  listBankAccounts(@CurrentUser() user: AuthUser) {
    return this.service.listBankAccounts(user);
  }

  @Post('bank-accounts')
  @Roles(...ROLES_WRITE)
  @AuditAction('bankAccount', 'create')
  @ApiOperation({ summary: 'Přidat bankovní účet' })
  createBankAccount(@CurrentUser() user: AuthUser, @Body() dto: {
    name: string; accountNumber: string; iban?: string;
    bankCode?: string; currency?: string; propertyId?: string;
  }) {
    return this.service.createBankAccount(user, dto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Bankovní transakce' })
  listTransactions(@CurrentUser() user: AuthUser, @Query() query: {
    bankAccountId?: string; status?: string; type?: string;
    dateFrom?: string; dateTo?: string;
    page?: number; limit?: number;
  }) {
    return this.service.listTransactions(user, query);
  }

  @Post('transactions')
  @Roles(...ROLES_WRITE)
  @AuditAction('bankTransaction', 'create')
  @ApiOperation({ summary: 'Přidat transakci' })
  createTransaction(@CurrentUser() user: AuthUser, @Body() dto: {
    bankAccountId: string; amount: number; type: 'credit' | 'debit';
    date: string; counterparty?: string; counterpartyIban?: string;
    variableSymbol?: string; specificSymbol?: string;
    constantSymbol?: string; description?: string;
  }) {
    return this.service.createTransaction(user, dto);
  }

  @Get('prescriptions')
  @ApiOperation({ summary: 'Předpisy' })
  listPrescriptions(@CurrentUser() user: AuthUser, @Query() query: {
    propertyId?: string; residentId?: string; status?: string; type?: string; page?: number; limit?: number;
  }) {
    return this.service.listPrescriptions(user, query);
  }

  @Post('prescriptions')
  @Roles(...ROLES_WRITE)
  @AuditAction('prescription', 'create')
  @ApiOperation({ summary: 'Vytvořit předpis' })
  createPrescription(@CurrentUser() user: AuthUser, @Body() dto: {
    propertyId: string; unitId?: string; residentId?: string;
    type: 'advance' | 'service' | 'rent' | 'other';
    amount: number; vatRate?: number; dueDay?: number;
    variableSymbol?: string; description: string;
    validFrom: string; validTo?: string;
    items?: { name: string; amount: number; vatRate?: number; unit?: string; quantity?: number }[];
  }) {
    return this.service.createPrescription(user, dto);
  }

  @Get('billing-periods')
  @ApiOperation({ summary: 'Zúčtovací období' })
  listBillingPeriods(
    @CurrentUser() user: AuthUser,
    @Query('propertyId') propertyId?: string,
  ) {
    return this.service.listBillingPeriods(user, propertyId);
  }

  @Post('billing-periods')
  @Roles(...ROLES_WRITE)
  @AuditAction('billingPeriod', 'create')
  @ApiOperation({ summary: 'Vytvořit zúčtovací období' })
  createBillingPeriod(@CurrentUser() user: AuthUser, @Body() dto: {
    propertyId: string; name: string; dateFrom: string; dateTo: string;
  }) {
    return this.service.createBillingPeriod(user, dto);
  }

  // ─── IMPORT ─────────────────────────────────────────────────

  @Post('import/:bankAccountId')
  @Roles(...ROLES_WRITE)
  @AuditAction('BankTransaction', 'IMPORT')
  @ApiOperation({ summary: 'Import CSV/ABO transakcí' })
  async importTransactions(
    @CurrentUser() user: AuthUser,
    @Param('bankAccountId') bankAccountId: string,
    @Req() req: FastifyRequest,
  ) {
    const data = await req.file()
    if (!data) throw new Error('No file uploaded')

    const chunks: Buffer[] = []
    for await (const chunk of data.file) {
      chunks.push(chunk)
    }

    return this.service.importTransactions(user, bankAccountId, {
      buffer:       Buffer.concat(chunks),
      originalname: data.filename,
    })
  }

  // ─── PÁROVÁNÍ ───────────────────────────────────────────────

  @Post('match')
  @Roles(...ROLES_WRITE)
  @AuditAction('BankTransaction', 'MATCH')
  @ApiOperation({ summary: 'Auto-párování transakcí s předpisy' })
  matchTransactions(
    @CurrentUser() user: AuthUser,
    @Body() body: { bankAccountId?: string },
  ) {
    return this.service.matchTransactions(user, body.bankAccountId)
  }

  // ─── GENEROVÁNÍ PŘEDPISŮ ───────────────────────────────────

  @Post('prescriptions/generate')
  @Roles(...ROLES_WRITE)
  @AuditAction('Prescription', 'BULK_GENERATE')
  @ApiOperation({ summary: 'Hromadné generování předpisů' })
  generatePrescriptions(
    @CurrentUser() user: AuthUser,
    @Body() dto: {
      propertyId: string
      month:      string
      dueDay?:    number
      amount?:    number
    },
  ) {
    return this.service.generatePrescriptions(user, dto)
  }

  // ─── MANUÁLNÍ PÁROVÁNÍ 1:1 ─────────────────────────────────

  @Post('match-single')
  @Roles(...ROLES_WRITE)
  @AuditAction('BankTransaction', 'MATCH_SINGLE')
  @ApiOperation({ summary: 'Manuální párování 1 transakce ↔ 1 předpis' })
  matchSingle(
    @CurrentUser() user: AuthUser,
    @Body() body: { transactionId: string; prescriptionId: string },
  ) {
    return this.service.matchSingle(
      user,
      body.transactionId,
      body.prescriptionId,
    )
  }

  // ─── DELETE ───────────────────────────────────────────────────

  @Delete('prescriptions/:id')
  @Roles(...ROLES_WRITE)
  @AuditAction('Prescription', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat předpis' })
  deletePrescription(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.deletePrescription(user, id)
  }

  @Delete('transactions/:id')
  @Roles(...ROLES_WRITE)
  @AuditAction('BankTransaction', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat transakci' })
  deleteTransaction(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.deleteTransaction(user, id)
  }

  // ─── INVOICES ─────────────────────────────────────────────────────

  @Get('invoices')
  @ApiOperation({ summary: 'Seznam dokladů' })
  listInvoices(@CurrentUser() user: AuthUser, @Query() query: any) {
    return this.invoicesService.list(user, query);
  }

  @Get('invoices/stats')
  @ApiOperation({ summary: 'Statistiky dokladů' })
  invoiceStats(@CurrentUser() user: AuthUser) {
    return this.invoicesService.stats(user);
  }

  @Post('invoices')
  @Roles(...ROLES_WRITE)
  @AuditAction('invoice', 'create')
  @ApiOperation({ summary: 'Vytvořit doklad' })
  createInvoice(@CurrentUser() user: AuthUser, @Body() dto: any) {
    return this.invoicesService.create(user, dto);
  }

  @Post('invoices/import-isdoc')
  @Roles(...ROLES_WRITE)
  @AuditAction('invoice', 'import_isdoc')
  @ApiOperation({ summary: 'Import dokladu z ISDOC XML' })
  importIsdoc(@CurrentUser() user: AuthUser, @Body() body: { xmlContent: string }) {
    return this.invoicesService.importIsdoc(user, body.xmlContent);
  }

  @Get('invoices/:id/export-isdoc')
  @ApiOperation({ summary: 'Export dokladu do ISDOC XML' })
  exportIsdoc(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoicesService.exportIsdoc(user, id);
  }

  @Put('invoices/:id')
  @Roles(...ROLES_WRITE)
  @AuditAction('invoice', 'update')
  @ApiOperation({ summary: 'Aktualizovat doklad' })
  updateInvoice(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: any) {
    return this.invoicesService.update(user, id, dto);
  }

  @Post('invoices/:id/mark-paid')
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Označit doklad jako uhrazený' })
  markInvoicePaid(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto?: any) {
    return this.invoicesService.markPaid(user, id, dto);
  }

  @Post('invoices/:id/pair')
  @Roles(...ROLES_WRITE)
  @AuditAction('invoice', 'pair')
  @ApiOperation({ summary: 'Párovat doklad s bankovní transakcí' })
  pairInvoice(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { transactionId: string }) {
    return this.invoicesService.pairWithTransaction(user, id, body.transactionId);
  }

  @Delete('invoices/:id')
  @Roles(...ROLES_WRITE)
  @AuditAction('invoice', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat doklad' })
  deleteInvoice(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoicesService.remove(user, id);
  }
}
