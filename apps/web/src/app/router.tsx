import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppShell from './AppShell';
import LoginPage from '../modules/auth/LoginPage';
import { ErrorBoundary } from '../shared/components';

const DashboardPage = lazy(() => import('../modules/dashboard/DashboardPage'));
const PropertiesPage = lazy(() => import('../modules/properties/PropertiesPage'));
const PropertyDetailPage = lazy(() => import('../modules/properties/PropertyDetailPage'));
const FinancePage = lazy(() => import('../modules/finance/FinancePage'));
const WorkOrdersPage = lazy(() => import('../modules/workorders/WorkOrdersPage'));
const HelpdeskPage = lazy(() => import('../modules/helpdesk/HelpdeskPage'));
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
const ReportsPage = lazy(() => import('../modules/reports/ReportsPage'));
const AuditPage = lazy(() => import('../modules/audit/AuditPage'));
const AdminPage = lazy(() => import('../modules/admin/AdminPage'));

function withBoundary(name: string, Component: React.ComponentType) {
  return (
    <ErrorBoundary moduleName={name}>
      <Component />
    </ErrorBoundary>
  );
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: withBoundary('Dashboard', DashboardPage) },
      { path: 'properties', element: withBoundary('Nemovitosti', PropertiesPage) },
      { path: 'properties/:id', element: withBoundary('Detail nemovitosti', PropertyDetailPage) },
      { path: 'finance', element: withBoundary('Finance', FinancePage) },
      { path: 'workorders', element: withBoundary('Work Orders', WorkOrdersPage) },
      { path: 'helpdesk', element: withBoundary('HelpDesk', HelpdeskPage) },
      { path: 'assets', element: withBoundary('Assets', AssetListPage) },
      { path: 'meters', element: withBoundary('Měřidla', MetersPage) },
      { path: 'compliance', element: withBoundary('Compliance', CompliancePage) },
      { path: 'contracts', element: withBoundary('Smlouvy', ContractsPage) },
      { path: 'residents', element: withBoundary('Bydlící', ResidentsPage) },
      { path: 'documents', element: withBoundary('Dokumenty', DocumentsPage) },
      { path: 'contacts', element: withBoundary('Adresář', DirectoryPage) },
      { path: 'calendar', element: withBoundary('Kalendář', CalendarPage) },
      { path: 'communication', element: withBoundary('Komunikace', CommunicationPage) },
      { path: 'reporting', element: withBoundary('Reporting', ReportingPage) },
      { path: 'reports', element: withBoundary('Výkazy', ReportsPage) },
      { path: 'audit', element: withBoundary('Audit log', AuditPage) },
      { path: 'admin', element: withBoundary('Admin', AdminPage) },
    ],
  },
]);