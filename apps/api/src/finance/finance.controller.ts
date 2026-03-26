import {
  Controller, Get, Post, Put, Patch, Delete, Body, Query, Param, Req, Res, HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { InvoicesService } from './invoices.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditAction } from '../common/decorators/audit.decorator';
import { ROLES_MANAGE, ROLES_FINANCE, ROLES_FINANCE_DRAFT } from '../common/constants/roles.constants';
import { CreateInvoiceDto, UpdateInvoiceDto, InvoiceListQueryDto, MarkPaidDto, ReturnToDraftDto, CreateAllocationDto, UpdateAllocationDto } from './dto/invoice.dto';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthUser } from '@ifmio/shared-types';

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
  listBankAccounts(
    @CurrentUser() user: AuthUser,
    @Query('financialContextId') financialContextId?: string,
  ) {
    return this.service.listBankAccounts(user, financialContextId);
  }

  @Post('bank-accounts')
  @Roles(...ROLES_FINANCE)
  @AuditAction('bankAccount', 'create')
  @ApiOperation({ summary: 'Přidat bankovní účet' })
  createBankAccount(@CurrentUser() user: AuthUser, @Body() dto: {
    name: string; accountNumber: string; iban?: string;
    bankCode?: string; currency?: string; propertyId?: string;
  }) {
    return this.service.createBankAccount(user, dto);
  }

  @Get('bank-accounts/:id')
  @ApiOperation({ summary: 'Detail bankovního účtu' })
  getBankAccount(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.getBankAccount(user, id);
  }

  @Patch('bank-accounts/:id')
  @Roles(...ROLES_FINANCE)
  @AuditAction('bankAccount', 'update')
  @ApiOperation({ summary: 'Upravit bankovní účet' })
  updateBankAccount(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: {
      name?: string; accountNumber?: string; bankCode?: string;
      iban?: string; currency?: string; isDefault?: boolean;
      accountType?: string; isActive?: boolean;
    },
  ) {
    return this.service.updateBankAccount(user, id, dto);
  }

  @Get('bank-accounts/:id/statement')
  @ApiOperation({ summary: 'Bankovní výpis PDF' })
  async bankStatement(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Res() reply?: FastifyReply,
  ) {
    if (!dateFrom || !dateTo) throw new BadRequestException('dateFrom a dateTo jsou povinné')
    const buffer = await this.service.generateStatement(user, id, dateFrom, dateTo)
    reply!
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="vypis-${dateFrom}-${dateTo}.pdf"`)
      .send(buffer)
  }

  @Delete('bank-accounts/:id')
  @Roles(...ROLES_FINANCE)
  @AuditAction('bankAccount', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat bankovní účet' })
  deleteBankAccount(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.deleteBankAccount(user, id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Bankovní transakce' })
  listTransactions(@CurrentUser() user: AuthUser, @Query() query: {
    bankAccountId?: string; status?: string; type?: string;
    dateFrom?: string; dateTo?: string;
    month?: string; matchTarget?: string; componentId?: string;
    financialContextId?: string;
    page?: number; limit?: number;
  }) {
    return this.service.listTransactions(user, query);
  }

  @Get('transactions/export')
  @ApiOperation({ summary: 'Export transakcí (CSV/XLSX)' })
  async exportTransactions(
    @CurrentUser() user: AuthUser,
    @Query() query: { bankAccountId?: string; status?: string; type?: string; dateFrom?: string; dateTo?: string; financialContextId?: string; search?: string; format?: string },
    @Res() reply?: FastifyReply,
  ) {
    const format = (query.format === 'xlsx' ? 'xlsx' : 'csv') as 'csv' | 'xlsx';
    const buffer = await this.service.exportTransactions(user, query, format);
    const ext = format === 'xlsx' ? 'xlsx' : 'csv';
    const mime = format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8';
    reply!.header('Content-Type', mime).header('Content-Disposition', `attachment; filename="transakce.${ext}"`).send(buffer);
  }

  @Post('transactions')
  @Roles(...ROLES_FINANCE)
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

  @Get('prescriptions/:id')
  @ApiOperation({ summary: 'Detail předpisu s položkami' })
  getPrescription(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getPrescription(user, id);
  }

  @Get('prescriptions')
  @ApiOperation({ summary: 'Předpisy' })
  listPrescriptions(@CurrentUser() user: AuthUser, @Query() query: {
    propertyId?: string; residentId?: string; status?: string; type?: string;
    financialContextId?: string;
    page?: number; limit?: number;
  }) {
    return this.service.listPrescriptions(user, query);
  }

  @Post('prescriptions')
  @Roles(...ROLES_FINANCE_DRAFT)
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
  @Roles(...ROLES_FINANCE)
  @AuditAction('billingPeriod', 'create')
  @ApiOperation({ summary: 'Vytvořit zúčtovací období' })
  createBillingPeriod(@CurrentUser() user: AuthUser, @Body() dto: {
    propertyId: string; name: string; dateFrom: string; dateTo: string;
  }) {
    return this.service.createBillingPeriod(user, dto);
  }

  // ─── IMPORT ─────────────────────────────────────────────────

  @Post('import/:bankAccountId')
  @Roles(...ROLES_FINANCE)
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
  @Roles(...ROLES_FINANCE)
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
  @Roles(...ROLES_FINANCE)
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
  @Roles(...ROLES_FINANCE)
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

  @Patch('transactions/:transactionId/unmatch')
  @Roles(...ROLES_FINANCE)
  @AuditAction('BankTransaction', 'UNMATCH')
  @ApiOperation({ summary: 'Odpárovat transakci' })
  unmatchTransaction(
    @CurrentUser() user: AuthUser,
    @Param('transactionId') transactionId: string,
  ) {
    return this.service.unmatchTransaction(user, transactionId)
  }

  // ─── DELETE ───────────────────────────────────────────────────

  @Delete('prescriptions/:id')
  @Roles(...ROLES_MANAGE)
  @AuditAction('Prescription', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat předpis' })
  deletePrescription(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.deletePrescription(user, id)
  }

  @Post('transactions/:id/split')
  @Roles(...ROLES_FINANCE)
  @AuditAction('BankTransaction', 'SPLIT')
  @ApiOperation({ summary: 'Rozdělit transakci' })
  splitTransaction(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { splits: Array<{ amount: number; description?: string; matchTarget?: string; matchedEntityId?: string }> },
  ) {
    return this.service.splitTransaction(user, id, body.splits)
  }

  @Delete('transactions/:id')
  @Roles(...ROLES_MANAGE)
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
  listInvoices(@CurrentUser() user: AuthUser, @Query() query: InvoiceListQueryDto) {
    return this.invoicesService.list(user, query);
  }

  @Get('invoices/stats')
  @ApiOperation({ summary: 'Statistiky dokladů' })
  invoiceStats(@CurrentUser() user: AuthUser) {
    return this.invoicesService.stats(user);
  }

  @Post('invoices')
  @Roles(...ROLES_FINANCE_DRAFT)
  @AuditAction('invoice', 'create')
  @ApiOperation({ summary: 'Vytvořit doklad' })
  createInvoice(@CurrentUser() user: AuthUser, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(user, dto);
  }

  @Post('invoices/import-isdoc')
  @Roles(...ROLES_FINANCE_DRAFT)
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
  @Roles(...ROLES_FINANCE_DRAFT)
  @AuditAction('invoice', 'update')
  @ApiOperation({ summary: 'Aktualizovat doklad' })
  updateInvoice(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoicesService.update(user, id, dto);
  }

  @Post('invoices/:id/mark-paid')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Označit doklad jako uhrazený' })
  markInvoicePaid(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto?: MarkPaidDto) {
    return this.invoicesService.markPaid(user, id, dto);
  }

  @Post('invoices/:id/pair')
  @Roles(...ROLES_FINANCE)
  @AuditAction('invoice', 'pair')
  @ApiOperation({ summary: 'Párovat doklad s bankovní transakcí' })
  pairInvoice(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { transactionId: string }) {
    return this.invoicesService.pairWithTransaction(user, id, body.transactionId);
  }

  // ─── APPROVAL WORKFLOW ───────────────────────────────────────────

  @Post('invoices/:id/submit')
  @Roles(...ROLES_FINANCE_DRAFT)
  @ApiOperation({ summary: 'Odeslat doklad ke schválení' })
  submitInvoice(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoicesService.submitInvoice(user, id);
  }

  @Post('invoices/:id/approve')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Schválit doklad' })
  approveInvoice(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoicesService.approveInvoice(user, id);
  }

  @Post('invoices/:id/return-to-draft')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Vrátit doklad do draftu' })
  returnInvoiceToDraft(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto?: ReturnToDraftDto,
  ) {
    return this.invoicesService.returnInvoiceToDraft(user, id, dto?.reason);
  }

  @Delete('invoices/:id')
  @Roles(...ROLES_MANAGE)
  @AuditAction('invoice', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat doklad' })
  deleteInvoice(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoicesService.remove(user, id);
  }

  // ─── INVOICE ACTIONS (copy, type, number, tags, history) ────

  @Post('invoices/:id/copy')
  @Roles(...ROLES_FINANCE_DRAFT)
  @ApiOperation({ summary: 'Kopírovat doklad' })
  copyInvoice(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoicesService.copyInvoice(user, id)
  }

  @Post('invoices/:id/copy-recurring')
  @Roles(...ROLES_FINANCE_DRAFT)
  @ApiOperation({ summary: 'Kopírovat opakovaně (měsíčně/čtvrtletně)' })
  copyRecurring(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { period: 'monthly' | 'quarterly'; count: number }) {
    return this.invoicesService.copyRecurring(user, id, body.period, body.count)
  }

  @Patch('invoices/:id/change-type')
  @Roles(...ROLES_FINANCE_DRAFT)
  @ApiOperation({ summary: 'Změnit typ dokladu' })
  changeType(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { type: string }) {
    return this.invoicesService.changeType(user, id, body.type)
  }

  @Patch('invoices/:id/change-number')
  @Roles(...ROLES_FINANCE_DRAFT)
  @ApiOperation({ summary: 'Změnit číslo dokladu' })
  changeNumber(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { number: string }) {
    return this.invoicesService.changeNumber(user, id, body.number)
  }

  @Post('invoices/:id/add-tag')
  @Roles(...ROLES_FINANCE_DRAFT)
  @ApiOperation({ summary: 'Přidat štítek' })
  addTag(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { tag: string }) {
    return this.invoicesService.addTag(user, id, body.tag)
  }

  @Post('invoices/:id/remove-tag')
  @Roles(...ROLES_FINANCE_DRAFT)
  @ApiOperation({ summary: 'Odebrat štítek' })
  removeTag(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { tag: string }) {
    return this.invoicesService.removeTag(user, id, body.tag)
  }

  @Get('invoices/:id/history')
  @ApiOperation({ summary: 'Historie změn dokladu' })
  getHistory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoicesService.getHistory(user, id)
  }

  // ─── INVOICE COST ALLOCATIONS ───────────────────────────────

  @Get('invoices/:id/allocations')
  @ApiOperation({ summary: 'Seznam alokací dokladu do složek' })
  getInvoiceAllocations(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoicesService.getAllocations(user, id)
  }

  @Get('invoices/:id/allocation-summary')
  @ApiOperation({ summary: 'Souhrn alokací dokladu' })
  getInvoiceAllocationSummary(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoicesService.getAllocationSummary(user, id)
  }

  @Post('invoices/:id/allocations')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Přidat alokaci do složky' })
  createAllocation(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateAllocationDto) {
    return this.invoicesService.createAllocation(user, id, dto)
  }

  @Put('invoices/:id/allocations/:allocationId')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Upravit alokaci' })
  updateAllocation(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('allocationId') aid: string, @Body() dto: UpdateAllocationDto) {
    return this.invoicesService.updateAllocation(user, id, aid, dto)
  }

  @Delete('invoices/:id/allocations/:allocationId')
  @Roles(...ROLES_FINANCE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat alokaci' })
  deleteAllocation(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('allocationId') aid: string) {
    return this.invoicesService.deleteAllocation(user, id, aid)
  }

  // ─── HROMADNÉ ODESÍLÁNÍ PŘEDPISŮ ────────────────────────────

  @Post('prescriptions/send')
  @Roles(...ROLES_FINANCE)
  @AuditAction('Prescription', 'BULK_SEND')
  @ApiOperation({ summary: 'Hromadně odeslat předpisy emailem' })
  sendPrescriptions(@CurrentUser() user: AuthUser, @Body() dto: {
    propertyId: string;
    month: string;
    type?: 'predpis' | 'faktura';
    subject?: string;
    message?: string;
  }) {
    return this.service.sendPrescriptionEmails(user, dto);
  }
}
