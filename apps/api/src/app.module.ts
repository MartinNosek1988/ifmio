import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
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
import { SuperAdminModule } from './super-admin/super-admin.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    SuperAdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
