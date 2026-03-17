import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { PropertiesModule } from './properties/properties.module';
import { UnitsModule } from './units/units.module';
import { ResidentsModule } from './residents/residents.module';
import { FinanceModule } from './finance/finance.module';
import { ContractsModule } from './contracts/contracts.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { RemindersModule } from './reminders/reminders.module';
import { HelpdeskModule } from './helpdesk/helpdesk.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentsModule } from './documents/documents.module';
import { AdminModule } from './admin/admin.module';
import { SearchModule } from './search/search.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { PdfModule } from './pdf/pdf.module';
import { CronModule } from './cron/cron.module';
import { EmailModule } from './email/email.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MetersModule } from './meters/meters.module';
import { CalendarModule } from './calendar/calendar.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { AssetsModule } from './assets/assets.module';
import { AssetTypesModule } from './asset-types/asset-types.module';
import { AssetQrModule } from './asset-qr/asset-qr.module';
import { FieldChecksModule } from './field-checks/field-checks.module';
import { RevisionsModule } from './revisions/revisions.module';
import { ProtocolsModule } from './protocols/protocols.module';
import { MioModule } from './mio/mio.module';
import { RecurringPlansModule } from './recurring-plans/recurring-plans.module';
import { KontoModule } from './konto/konto.module';
import { DebtorsModule } from './debtors/debtors.module';
import { PartyModule } from './party/party.module';
import { PrincipalModule } from './principal/principal.module';
import { ManagementContractModule } from './management-contract/management-contract.module';
import { FinancialContextModule } from './financial-context/financial-context.module';
import { OwnershipModule } from './ownership/ownership.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
        autoLogging: {
          ignore: (req: any) => req.url === '/api/v1/health',
        },
        redact: ['req.headers.authorization'],
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60_000,
          limit: 100,
          skipIf: () => process.env.NODE_ENV === 'test',
        },
      ],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    AuditModule,
    PropertiesModule,
    UnitsModule,
    ResidentsModule,
    FinanceModule,
    ContractsModule,
    WorkOrdersModule,
    RemindersModule,
    HelpdeskModule,
    DashboardModule,
    DocumentsModule,
    AdminModule,
    SearchModule,
    IntegrationsModule,
    PdfModule,
    CronModule,
    EmailModule,
    ReportsModule,
    NotificationsModule,
    MetersModule,
    CalendarModule,
    SuperAdminModule,
    AssetsModule,
    AssetTypesModule,
    AssetQrModule,
    FieldChecksModule,
    RevisionsModule,
    ProtocolsModule,
    MioModule,
    RecurringPlansModule,
    KontoModule,
    DebtorsModule,
    PartyModule,
    PrincipalModule,
    ManagementContractModule,
    FinancialContextModule,
    OwnershipModule,
    TenancyModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerBehindProxyGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
