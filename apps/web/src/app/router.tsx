import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppShell from './AppShell';
import LoginPage from '../modules/auth/LoginPage';
import RegisterPage from '../modules/auth/RegisterPage';
import LandingPage from '../modules/landing/LandingPage';

const VerifyEmailPage = lazy(() => import('../modules/auth/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('../modules/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../modules/auth/ResetPasswordPage'));
const AcceptInvitationPage = lazy(() => import('../modules/auth/AcceptInvitationPage'));
const OAuthCallbackPage = lazy(() => import('../modules/auth/OAuthCallbackPage'));
const PortalPage = lazy(() => import('../modules/portal/PortalPage'));
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
const ContractsPage = lazy(() => import('../modules/contracts/ContractsPage'));
const ResidentsPage = lazy(() => import('../modules/residents/ResidentsPage'));
const DocumentsPage = lazy(() => import('../modules/documents/DocumentsPage'));
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
// AdminPage removed — was localStorage placeholder; /admin redirects to /team
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
const PrincipalsPage = lazy(() => import('../modules/principals/PrincipalsPage'));
const PrincipalDetailPage = lazy(() => import('../modules/principals/PrincipalDetailPage'));
const PartiesPage = lazy(() => import('../modules/parties/PartiesPage'));
const SettlementPage = lazy(() => import('../modules/settlement/SettlementPage'));
const TermsPage = lazy(() => import('../modules/legal/TermsPage'));
const PrivacyPage = lazy(() => import('../modules/legal/PrivacyPage'));
const GdprPage = lazy(() => import('../modules/legal/GdprPage'));
const CookiesPage = lazy(() => import('../modules/legal/CookiesPage'));
const MyUnitsPage = lazy(() => import('../modules/portal/MyUnitsPage'));
const MyPrescriptionsPage = lazy(() => import('../modules/portal/MyPrescriptionsPage'));
const MySettlementsPage = lazy(() => import('../modules/portal/MySettlementsPage'));
const MyTicketsPage = lazy(() => import('../modules/portal/MyTicketsPage'));
const MyMetersPage = lazy(() => import('../modules/portal/MyMetersPage'));
const MyDocumentsPage = lazy(() => import('../modules/portal/MyDocumentsPage'));
const MyKontoPage = lazy(() => import('../modules/portal/MyKontoPage'));

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
  { path: '/forgot-password', element: withBoundary('Obnova hesla', ForgotPasswordPage) },
  { path: '/reset-password', element: withBoundary('Nové heslo', ResetPasswordPage) },
  { path: '/accept-invitation', element: withBoundary('Přijetí pozvánky', AcceptInvitationPage) },
  { path: '/q/:token', element: withBoundary('QR Scan', QrResolvePage) },
  { path: '/auth/callback', element: withBoundary('OAuth Callback', OAuthCallbackPage) },
  { path: '/terms', element: withBoundary('Terms', TermsPage) },
  { path: '/privacy', element: withBoundary('Privacy', PrivacyPage) },
  { path: '/gdpr', element: withBoundary('GDPR', GdprPage) },
  { path: '/cookies', element: withBoundary('Cookies', CookiesPage) },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { path: 'dashboard', element: withBoundary('Dashboard', DashboardPage) },
      { path: 'portal', element: withBoundary('Klientský portál', PortalPage) },
      { path: 'portal/units', element: withBoundary('Moje jednotky', MyUnitsPage) },
      { path: 'portal/prescriptions', element: withBoundary('Předpisy plateb', MyPrescriptionsPage) },
      { path: 'portal/settlements', element: withBoundary('Vyúčtování', MySettlementsPage) },
      { path: 'portal/tickets', element: withBoundary('Požadavky', MyTicketsPage) },
      { path: 'portal/meters', element: withBoundary('Měřiče', MyMetersPage) },
      { path: 'portal/documents', element: withBoundary('Dokumenty', MyDocumentsPage) },
      { path: 'portal/konto', element: withBoundary('Konto', MyKontoPage) },
      { path: 'properties', element: withBoundary('Nemovitosti', PropertiesPage) },
      { path: 'properties/:id', element: withBoundary('Detail nemovitosti', PropertyDetailPage) },
      { path: 'principals', element: withBoundary('Klienti', PrincipalsPage) },
      { path: 'principals/:principalId', element: withBoundary('Detail klienta', PrincipalDetailPage) },
      { path: 'finance', element: withBoundary('Finance', FinancePage) },
      { path: 'settlements', element: withBoundary('Vyúčtování', SettlementPage) },
      { path: 'workorders', element: withBoundary('Pracovní úkoly', WorkOrdersPage) },
      { path: 'my-agenda', element: withBoundary('Moje agenda', TechnicianAgendaPage) },
      { path: 'workorders/:id/execute', element: withBoundary('Provádění úkolu', WorkOrderExecutionPage) },
      { path: 'helpdesk', element: withBoundary('Helpdesk', HelpdeskPage) },
      { path: 'helpdesk/dashboard', element: withBoundary('HelpDesk Dashboard', HelpdeskDashboardPage) },
      { path: 'helpdesk/sla-config', element: withBoundary('SLA konfigurace', SlaConfigPage) },
      { path: 'assets', element: withBoundary('Pasportizace', AssetListPage) },
      { path: 'assets/:id', element: withBoundary('Karta zařízení', AssetPassportPage) },
      { path: 'meters', element: withBoundary('Měřidla', MetersPage) },
      { path: 'contracts', element: withBoundary('Smlouvy', ContractsPage) },
      { path: 'residents', element: withBoundary('Bydlící', ResidentsPage) },
      { path: 'documents', element: withBoundary('Dokumenty', DocumentsPage) },
      { path: 'parties', element: withBoundary('Adresář', PartiesPage) },
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
      { path: 'admin', element: <Navigate to="/team" replace /> },
      { path: 'settings', element: withBoundary('Nastaveni', SettingsPage) },
      { path: 'notifications', element: withBoundary('Notifikace', NotificationsPage) },
      { path: 'profile', element: withBoundary('Profil', ProfilePage) },
      { path: 'super-admin', element: withBoundary('Super Admin', SuperAdminPage) },
    ],
  },
]);