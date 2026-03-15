import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import AppShell from './AppShell';
import LoginPage from '../modules/auth/LoginPage';
import RegisterPage from '../modules/auth/RegisterPage';
import LandingPage from '../modules/landing/LandingPage';

const VerifyEmailPage = lazy(() => import('../modules/auth/VerifyEmailPage'));
import { ErrorBoundary } from '../shared/components';

const DashboardPage = lazy(() => import('../modules/dashboard/DashboardPage'));
const PropertiesPage = lazy(() => import('../modules/properties/PropertiesPage'));
const PropertyDetailPage = lazy(() => import('../modules/properties/PropertyDetailPage'));
const FinancePage = lazy(() => import('../modules/finance/FinancePage'));
const WorkOrdersPage = lazy(() => import('../modules/workorders/WorkOrdersPage'));
const TechnicianAgendaPage = lazy(() => import('../modules/workorders/TechnicianAgendaPage'));
const WorkOrderExecutionPage = lazy(() => import('../modules/workorders/WorkOrderExecutionPage'));
const HelpdeskPage = lazy(() => import('../modules/helpdesk/HelpdeskPage'));
const HelpdeskDashboardPage = lazy(() => import('../modules/helpdesk/HelpdeskDashboardPage'));
const SlaConfigPage = lazy(() => import('../modules/helpdesk/SlaConfigPage'));
const AssetListPage = lazy(() => import('../modules/assets/AssetListPage'));
const MetersPage = lazy(() => import('../modules/meters/MetersPage'));
const CompliancePage = lazy(() => import('../modules/compliance/CompliancePage'));
const ContractsPage = lazy(() => import('../modules/contracts/ContractsPage'));
const ResidentsPage = lazy(() => import('../modules/residents/ResidentsPage'));
const DocumentsPage = lazy(() => import('../modules/documents/DocumentsPage'));
const DirectoryPage = lazy(() => import('../modules/directory/DirectoryPage'));
const CalendarPage = lazy(() => import('../modules/calendar/CalendarPage'));
const CommunicationPage = lazy(() => import('../modules/communication/CommunicationPage'));
const ReportingPage = lazy(() => import('../modules/reporting/ReportingPage'));
const OperationalReportsPage = lazy(() => import('../modules/reporting/OperationalReportsPage'));
const ReportsPage = lazy(() => import('../modules/reports/ReportsPage'));
const AuditPage = lazy(() => import('../modules/audit/AuditPage'));
const MioInsightsPage = lazy(() => import('../modules/mio-insights/MioInsightsPage'));
const MioAdminPage = lazy(() => import('../modules/mio/MioAdminPage'));
const MioWebhooksPage = lazy(() => import('../modules/mio/MioWebhooksPage'));
const TeamPage = lazy(() => import('../modules/team/TeamPage'));
const AdminPage = lazy(() => import('../modules/admin/AdminPage'));
const SettingsPage = lazy(() => import('../modules/settings/SettingsPage'));
const NotificationsPage = lazy(() => import('../modules/notifications/NotificationsPage'));
const ProfilePage = lazy(() => import('../modules/profile/ProfilePage'));
const ProtocolsPage = lazy(() => import('../modules/protocols/ProtocolsPage'));
const RevisionsPage = lazy(() => import('../modules/revisions/RevisionsPage'));
const RevisionDashboardPage = lazy(() => import('../modules/revisions/RevisionDashboardPage'));
const RevisionSettingsPage = lazy(() => import('../modules/revisions/RevisionSettingsPage'));
const AssetTypesPage = lazy(() => import('../modules/asset-types/AssetTypesPage'));
const AssetPassportPage = lazy(() => import('../modules/assets/AssetPassportPage'));
const SuperAdminPage = lazy(() => import('../modules/super-admin/SuperAdminPage'));
const QrResolvePage = lazy(() => import('../modules/asset-qr/QrResolvePage'));

function withBoundary(name: string, Component: React.ComponentType) {
  return (
    <ErrorBoundary moduleName={name}>
      <Component />
    </ErrorBoundary>
  );
}

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/verify-email', element: withBoundary('VerifyEmail', VerifyEmailPage) },
  { path: '/q/:token', element: withBoundary('QR Scan', QrResolvePage) },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { path: 'dashboard', element: withBoundary('Dashboard', DashboardPage) },
      { path: 'properties', element: withBoundary('Nemovitosti', PropertiesPage) },
      { path: 'properties/:id', element: withBoundary('Detail nemovitosti', PropertyDetailPage) },
      { path: 'finance', element: withBoundary('Finance', FinancePage) },
      { path: 'workorders', element: withBoundary('Pracovní úkoly', WorkOrdersPage) },
      { path: 'my-agenda', element: withBoundary('Moje agenda', TechnicianAgendaPage) },
      { path: 'workorders/:id/execute', element: withBoundary('Provádění úkolu', WorkOrderExecutionPage) },
      { path: 'helpdesk', element: withBoundary('Helpdesk', HelpdeskPage) },
      { path: 'helpdesk/dashboard', element: withBoundary('HelpDesk Dashboard', HelpdeskDashboardPage) },
      { path: 'helpdesk/sla-config', element: withBoundary('SLA konfigurace', SlaConfigPage) },
      { path: 'assets', element: withBoundary('Pasportizace', AssetListPage) },
      { path: 'assets/:id', element: withBoundary('Karta zařízení', AssetPassportPage) },
      { path: 'meters', element: withBoundary('Měřidla', MetersPage) },
      { path: 'compliance', element: withBoundary('Compliance', CompliancePage) },
      { path: 'contracts', element: withBoundary('Smlouvy', ContractsPage) },
      { path: 'residents', element: withBoundary('Bydlící', ResidentsPage) },
      { path: 'documents', element: withBoundary('Dokumenty', DocumentsPage) },
      { path: 'contacts', element: withBoundary('Adresář', DirectoryPage) },
      { path: 'calendar', element: withBoundary('Kalendář', CalendarPage) },
      { path: 'communication', element: withBoundary('Komunikace', CommunicationPage) },
      { path: 'reporting', element: withBoundary('Reporting', ReportingPage) },
      { path: 'reporting/operations', element: withBoundary('Provozní reporty', OperationalReportsPage) },
      { path: 'mio/insights', element: withBoundary('Mio Insights', MioInsightsPage) },
      { path: 'mio/admin', element: withBoundary('Mio Admin', MioAdminPage) },
      { path: 'mio/webhooks', element: withBoundary('Mio Webhooky', MioWebhooksPage) },
      { path: 'reports', element: withBoundary('Výkazy', ReportsPage) },
      { path: 'team', element: withBoundary('Tým', TeamPage) },
      { path: 'protocols', element: withBoundary('Protokoly', ProtocolsPage) },
      { path: 'revisions', element: withBoundary('Plán činností', RevisionsPage) },
      { path: 'revisions/dashboard', element: withBoundary('Revize Dashboard', RevisionDashboardPage) },
      { path: 'revisions/settings', element: withBoundary('Revize Katalog', RevisionSettingsPage) },
      { path: 'asset-types', element: withBoundary('Typy zařízení', AssetTypesPage) },
      { path: 'audit', element: withBoundary('Audit log', AuditPage) },
      { path: 'admin', element: withBoundary('Admin', AdminPage) },
      { path: 'settings', element: withBoundary('Nastaveni', SettingsPage) },
      { path: 'notifications', element: withBoundary('Notifikace', NotificationsPage) },
      { path: 'profile', element: withBoundary('Profil', ProfilePage) },
      { path: 'super-admin', element: withBoundary('Super Admin', SuperAdminPage) },
    ],
  },
]);