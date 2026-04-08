import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppShell from './AppShell';
import LoginPage from '../modules/auth/LoginPage';
import RegisterPage from '../modules/auth/RegisterPage';
import { I18nProvider } from '../i18n/I18nProvider';
const LandingPage = lazy(() => import('../modules/landing/LandingPage'));
const PricingPage = lazy(() => import('../modules/pricing/PricingPage'));
const DemoPage = lazy(() => import('../modules/pages/DemoPage'));
const ContactPage = lazy(() => import('../modules/pages/ContactPage'));
const AboutPage = lazy(() => import('../modules/pages/AboutPage'));
const CareersPage = lazy(() => import('../modules/pages/CareersPage'));
const BlogPage = lazy(() => import('../modules/pages/BlogPage'));
const LegalDocsPage = lazy(() => import('../modules/pages/LegalPage'));
const SecurityPage = lazy(() => import('../modules/pages/SecurityPage'));
const SolutionPage = lazy(() => import('../modules/solutions/SolutionPage'));
const PlatformModulePage = lazy(() => import('../modules/platform-modules/PlatformModulePage'));
const PartnerSearchPage = lazy(() => import('../modules/partners/PartnerSearchPage'));
const PartnerRegisterPage = lazy(() => import('../modules/partners/PartnerRegisterPage'));

const VerifyEmailPage = lazy(() => import('../modules/auth/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('../modules/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../modules/auth/ResetPasswordPage'));
const AcceptInvitationPage = lazy(() => import('../modules/auth/AcceptInvitationPage'));
const OAuthCallbackPage = lazy(() => import('../modules/auth/OAuthCallbackPage'));
const PortalPage = lazy(() => import('../modules/portal/PortalPage'));
import { ErrorBoundary } from '../shared/components';

const DashboardPage = lazy(() => import('../modules/dashboard/DashboardPage'));
const PropertiesPage = lazy(() => import('../modules/properties/PropertiesPage'));
const PropertyFormPage = lazy(() => import('../modules/properties/PropertyFormPage'));
const PropertyDetailPage = lazy(() => import('../modules/properties/PropertyDetailPage'));
const UnitDetailPage = lazy(() => import('../modules/properties/UnitDetailPage'));
const FinancePage = lazy(() => import('../modules/finance/FinancePage'));
const InvoiceReviewPage = lazy(() => import('../modules/finance/components/InvoiceReviewPage'));
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
const MioChatPage = lazy(() => import('../modules/mio/MioChatPage'));
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
const KnowledgeBaseDashboard = lazy(() => import('../modules/admin/KnowledgeBaseDashboard'));
const CrmBuildingsPage = lazy(() => import('../modules/crm/CrmBuildingsPage'));
const CrmBuildingDetailPage = lazy(() => import('../modules/crm/CrmBuildingDetailPage'));
const CrmOrganizationsPage = lazy(() => import('../modules/crm/CrmOrganizationsPage'));
const CrmMapPage = lazy(() => import('../modules/crm/CrmMapPage'));
const CrmImportPage = lazy(() => import('../modules/crm/CrmImportPage'));
const PersonProfilePage = lazy(() => import('../modules/registry/PersonProfilePage'));
const ESignListPage = lazy(() => import('../modules/esign/ESignListPage'));
const SignPage = lazy(() => import('../modules/esign/SignPage'));
const OrganizationProfilePage = lazy(() => import('../modules/registry/OrganizationProfilePage'));
const QrResolvePage = lazy(() => import('../modules/asset-qr/QrResolvePage'));
const PrincipalsPage = lazy(() => import('../modules/principals/PrincipalsPage'));
const PrincipalDetailPage = lazy(() => import('../modules/principals/PrincipalDetailPage'));
const OnboardingPage = lazy(() => import('../modules/onboarding/OnboardingPage'));
const AssemblyListPage = lazy(() => import('../modules/assemblies/AssemblyListPage'));
const AssemblyDetailPage = lazy(() => import('../modules/assemblies/AssemblyDetailPage'));
const PerRollamListPage = lazy(() => import('../modules/assemblies/per-rollam/PerRollamListPage'));
const PerRollamDetailPage = lazy(() => import('../modules/assemblies/per-rollam/PerRollamDetailPage'));
const PublicBallotPage = lazy(() => import('../modules/assemblies/per-rollam/PublicBallotPage'));
const LiveDashboardPage = lazy(() => import('../modules/assemblies/live/LiveDashboardPage'));
const PartiesPage = lazy(() => import('../modules/parties/PartiesPage'));
const PartyDetailPage = lazy(() => import('../modules/parties/PartyDetailPage'));
const SettlementPage = lazy(() => import('../modules/settlement/SettlementPage'));
const KanbanPage = lazy(() => import('../modules/kanban/KanbanPage'));
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
  // Production: handled by nginx 301 — see apps/web/nginx.conf
  // Development fallback (Vite dev server has no nginx):
  { path: '/', element: <Navigate to="/en/" replace /> },
  { path: '/cenik', element: <Navigate to="/cs/cenik" replace /> },
  { path: '/demo', element: <Navigate to="/cs/demo" replace /> },
  { path: '/kontakt', element: <Navigate to="/cs/kontakt" replace /> },
  { path: '/pricing', element: <Navigate to="/en/pricing" replace /> },
  { path: '/contact', element: <Navigate to="/en/contact" replace /> },

  // Locale-prefixed public pages
  {
    path: '/:locale',
    element: <I18nProvider />,
    children: [
      { index: true, element: <LandingPage /> },
      // CS slugs
      { path: 'cenik', element: withBoundary('Ceník', PricingPage) },
      { path: 'demo', element: withBoundary('Demo', DemoPage) },
      { path: 'kontakt', element: withBoundary('Kontakt', ContactPage) },
      { path: 'reseni/:slug', element: withBoundary('Řešení', SolutionPage) },
      { path: 'platforma/:slug', element: withBoundary('Platforma', PlatformModulePage) },
      { path: 'partneri/registrace', element: withBoundary('Registrace', PartnerRegisterPage) },
      { path: 'partneri/:type', element: withBoundary('Partneři', PartnerSearchPage) },
      { path: 'o-nas', element: withBoundary('O nás', AboutPage) },
      { path: 'kariera', element: withBoundary('Kariéra', CareersPage) },
      { path: 'blog', element: withBoundary('Blog', BlogPage) },
      { path: 'pravni-dokumenty', element: withBoundary('Legal', LegalDocsPage) },
      { path: 'bezpecnost', element: withBoundary('Bezpečnost', SecurityPage) },
      // EN slugs (same components, different URL)
      { path: 'pricing', element: withBoundary('Pricing', PricingPage) },
      { path: 'contact', element: withBoundary('Contact', ContactPage) },
      { path: 'solutions/:slug', element: withBoundary('Solutions', SolutionPage) },
      { path: 'platform/:slug', element: withBoundary('Platform', PlatformModulePage) },
      { path: 'partners/register', element: withBoundary('Partners', PartnerRegisterPage) },
      { path: 'partners/:type', element: withBoundary('Partners', PartnerSearchPage) },
      { path: 'about', element: withBoundary('About', AboutPage) },
      { path: 'careers', element: withBoundary('Careers', CareersPage) },
      { path: 'legal', element: withBoundary('Legal', LegalDocsPage) },
      { path: 'security', element: withBoundary('Security', SecurityPage) },
    ],
  },

  // Auth routes (no locale prefix)
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/verify-email', element: withBoundary('VerifyEmail', VerifyEmailPage) },
  { path: '/forgot-password', element: withBoundary('Obnova hesla', ForgotPasswordPage) },
  { path: '/reset-password', element: withBoundary('Nové heslo', ResetPasswordPage) },
  { path: '/accept-invitation', element: withBoundary('Přijetí pozvánky', AcceptInvitationPage) },
  { path: '/q/:token', element: withBoundary('QR Scan', QrResolvePage) },
  { path: '/hlasovani/:accessToken', element: withBoundary('Hlasování', PublicBallotPage) },
  { path: '/auth/callback', element: withBoundary('OAuth Callback', OAuthCallbackPage) },
  // Public registry pages (SEO, no auth)
  { path: '/registry/organizations/:ico', element: withBoundary('Výpis z rejstříku', OrganizationProfilePage) },
  { path: '/registry/persons/:id', element: withBoundary('Profil osoby', PersonProfilePage) },
  { path: '/sign/:token', element: withBoundary('Elektronický podpis', SignPage) },
  { path: '/terms', element: withBoundary('Terms', TermsPage) },
  { path: '/privacy', element: withBoundary('Privacy', PrivacyPage) },
  { path: '/gdpr', element: withBoundary('GDPR', GdprPage) },
  { path: '/cookies', element: withBoundary('Cookies', CookiesPage) },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { path: 'onboarding', element: withBoundary('Onboarding', OnboardingPage) },
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
      { path: 'properties/new', element: withBoundary('Nová nemovitost', PropertyFormPage) },
      { path: 'properties/:id/edit', element: withBoundary('Upravit nemovitost', PropertyFormPage) },
      { path: 'properties/:id', element: withBoundary('Detail nemovitosti', PropertyDetailPage) },
      { path: 'properties/:id/units/:unitId', element: withBoundary('Detail jednotky', UnitDetailPage) },
      { path: 'properties/:id/assemblies', element: withBoundary('Shromáždění', AssemblyListPage) },
      { path: 'properties/:id/assemblies/:assemblyId', element: withBoundary('Detail shromáždění', AssemblyDetailPage) },
      { path: 'properties/:id/assemblies/:assemblyId/live', element: withBoundary('Živé hlasování', LiveDashboardPage) },
      { path: 'properties/:id/per-rollam', element: withBoundary('Per rollam', PerRollamListPage) },
      { path: 'properties/:id/per-rollam/:votingId', element: withBoundary('Detail per rollam', PerRollamDetailPage) },
      { path: 'principals', element: withBoundary('Klienti', PrincipalsPage) },
      { path: 'principals/:principalId', element: withBoundary('Detail klienta', PrincipalDetailPage) },
      { path: 'finance', element: withBoundary('Finance', FinancePage) },
      { path: 'finance/invoices/:id/review', element: withBoundary('Detail dokladu', InvoiceReviewPage) },
      { path: 'settlements', element: withBoundary('Vyúčtování', SettlementPage) },
      { path: 'kanban', element: withBoundary('Pipeline', KanbanPage) },
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
      { path: 'esign', element: withBoundary('Elektronické podpisy', ESignListPage) },
      { path: 'parties', element: withBoundary('Adresář', PartiesPage) },
      { path: 'parties/:id', element: withBoundary('Detail subjektu', PartyDetailPage) },
      { path: 'calendar', element: withBoundary('Kalendář', CalendarPage) },
      { path: 'communication', element: withBoundary('Komunikace', CommunicationPage) },
      { path: 'reporting', element: withBoundary('Reporting', ReportingPage) },
      { path: 'reporting/operations', element: withBoundary('Provozní reporty', OperationalReportsPage) },
      { path: 'mio/insights', element: withBoundary('Mio Insights', MioInsightsPage) },
      { path: 'mio', element: withBoundary('Mio AI', MioChatPage) },
      { path: 'mio/:conversationId', element: withBoundary('Mio AI', MioChatPage) },
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
      { path: 'settings', element: withBoundary('Nastavení', SettingsPage) },
      { path: 'notifications', element: withBoundary('Notifikace', NotificationsPage) },
      { path: 'profile', element: withBoundary('Profil', ProfilePage) },
      { path: 'super-admin', element: withBoundary('Super Admin', SuperAdminPage) },
      { path: 'knowledge-base', element: withBoundary('Knowledge Base', KnowledgeBaseDashboard) },
      { path: 'crm', element: withBoundary('CRM Přehled', KnowledgeBaseDashboard) },
      { path: 'crm/buildings', element: withBoundary('CRM Budovy', CrmBuildingsPage) },
      { path: 'crm/buildings/:id', element: withBoundary('CRM Detail budovy', CrmBuildingDetailPage) },
      { path: 'crm/organizations', element: withBoundary('CRM Organizace', CrmOrganizationsPage) },
      { path: 'crm/import', element: withBoundary('CRM Import', CrmImportPage) },
      { path: 'crm/map', element: withBoundary('CRM Mapa', CrmMapPage) },
      { path: 'crm/registry/persons/:id', element: withBoundary('Profil osoby', PersonProfilePage) },
      { path: 'crm/registry/organizations/:ico', element: withBoundary('Profil organizace', OrganizationProfilePage) },
    ],
  },
]);