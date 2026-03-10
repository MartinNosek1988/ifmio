import { Suspense, useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Building2, Users, FolderOpen, Calendar,
  Wrench, Headphones, Box, Gauge, FileText, UserCheck,
  ShieldCheck, Wallet, AlertTriangle, TrendingUp,
  MessageSquare, Mail, Settings, BarChart3,
  ClipboardList, ScrollText,
} from 'lucide-react';
import { LoadingSpinner } from '../shared/components';
import { GlobalSearch } from '../modules/search/GlobalSearch';
import { MioPanel } from '../modules/ai/MioPanel';
import { NotificationCenter } from '../modules/notifications/NotificationCenter';
import { OnboardingWizard } from '../modules/onboarding/OnboardingWizard';
import { useKeyboardShortcuts } from '../shared/hooks/useKeyboardShortcuts';
import { apiClient } from '../core/api/client';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Přehled',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
    ],
  },
  {
    title: 'Správa',
    items: [
      { to: '/properties', label: 'Nemovitosti', icon: <Building2 size={17} /> },
      { to: '/contacts', label: 'Adresář', icon: <Users size={17} /> },
      { to: '/contracts', label: 'Nájemní smlouvy', icon: <FileText size={17} /> },
      { to: '/documents', label: 'Dokumenty', icon: <FolderOpen size={17} /> },
      { to: '/calendar', label: 'Kalendář', icon: <Calendar size={17} /> },
    ],
  },
  {
    title: 'Provoz',
    items: [
      { to: '/workorders', label: 'Work Orders', icon: <Wrench size={17} /> },
      { to: '/helpdesk', label: 'HelpDesk', icon: <Headphones size={17} /> },
      { to: '/assets', label: 'Asset Management', icon: <Box size={17} /> },
      { to: '/meters', label: 'Měřidla & Energie', icon: <Gauge size={17} /> },
      { to: '/residents', label: 'Bydlící', icon: <UserCheck size={17} /> },
    ],
  },
  {
    title: 'Compliance',
    items: [
      { to: '/compliance', label: 'ISO 41001', icon: <ShieldCheck size={17} /> },
    ],
  },
  {
    title: 'Finance',
    items: [
      { to: '/finance', label: 'Finance', icon: <Wallet size={17} /> },
      { to: '/finance?tab=debtors', label: 'Dlužníci', icon: <AlertTriangle size={17} /> },
      { to: '/finance?tab=revenues', label: 'Výnosy SVJ', icon: <TrendingUp size={17} /> },
    ],
  },
  {
    title: 'Komunikace',
    items: [
      { to: '/communication', label: 'Komunikace', icon: <MessageSquare size={17} /> },
      { to: '/communication?tab=mail', label: 'Pošta', icon: <Mail size={17} /> },
    ],
  },
  {
    title: 'Systém',
    items: [
      { to: '/reporting', label: 'Reporting', icon: <BarChart3 size={17} /> },
      { to: '/reports', label: 'Výkazy', icon: <ClipboardList size={17} /> },
      { to: '/audit', label: 'Audit log', icon: <ScrollText size={17} /> },
      { to: '/admin', label: 'Admin', icon: <Settings size={17} /> },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/properties': 'Nemovitosti',
  '/contacts': 'Adresář',
  '/contracts': 'Nájemní smlouvy',
  '/documents': 'Dokumenty',
  '/calendar': 'Kalendář',
  '/workorders': 'Work Orders',
  '/helpdesk': 'HelpDesk',
  '/assets': 'Asset Management',
  '/meters': 'Měřidla & Energie',
  '/residents': 'Bydlící',
  '/compliance': 'Compliance — ISO 41001',
  '/finance': 'Finance',
  '/communication': 'Komunikace',
  '/reporting': 'Reporting',
  '/reports': 'Výkazy',
  '/audit': 'Audit log',
  '/admin': 'Administrace',
};

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/properties/')) return 'Detail nemovitosti';
  return PAGE_TITLES[pathname] || 'ifmio';
}

export default function AppShell() {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useKeyboardShortcuts();

  const { data: onboardingData } = useQuery({
    queryKey: ['admin', 'onboarding'],
    queryFn: () => apiClient.get('/admin/onboarding').then((r) => r.data),
    staleTime: Infinity,
  });

  const { data: helpdeskData } = useQuery({
    queryKey: ['helpdesk', 'list', { status: 'open', limit: 1 }],
    queryFn: () => apiClient.get('/helpdesk', { params: { status: 'open', limit: 1 } }).then((r) => r.data),
    staleTime: 60_000,
    retry: false,
  });
  const { data: helpdeskInProgress } = useQuery({
    queryKey: ['helpdesk', 'list', { status: 'in_progress', limit: 1 }],
    queryFn: () => apiClient.get('/helpdesk', { params: { status: 'in_progress', limit: 1 } }).then((r) => r.data),
    staleTime: 60_000,
    retry: false,
  });
  const openTicketsCount = (helpdeskData?.total ?? 0) + (helpdeskInProgress?.total ?? 0);

  useEffect(() => {
    if (onboardingData && !onboardingData.completed) {
      setShowOnboarding(true);
    }
  }, [onboardingData]);

  return (
    <div>
      <nav className="sidebar">
        <div className="sidebar__logo">ifmio</div>
        {NAV_SECTIONS.map((sec) => (
          <div key={sec.title} className="sidebar__section">
            <div className="sidebar__section-title">{sec.title}</div>
            {sec.items.map((item) => {
              const hasQuery = item.to.includes('?');
              const badgeCount = item.to === '/helpdesk' ? openTicketsCount : 0;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => {
                    if (hasQuery) {
                      const active = location.pathname + location.search === item.to;
                      return `sidebar__link${active ? ' active' : ''}`;
                    }
                    return `sidebar__link${isActive ? ' active' : ''}`;
                  }}
                  end={item.to === '/dashboard' || hasQuery}
                >
                  {item.icon}
                  {item.label}
                  {badgeCount > 0 && (
                    <span style={{
                      marginLeft: 'auto', background: 'var(--danger, #ef4444)', color: '#fff',
                      fontSize: '0.65rem', fontWeight: 700, borderRadius: 10,
                      padding: '1px 6px', minWidth: 18, textAlign: 'center',
                    }}>
                      {badgeCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: '12px 16px', fontSize: '0.7rem', color: '#5A6578' }}>
          ifmio v1.2
        </div>
      </nav>

      {/* Topbar */}
      <div className="topbar">
        <div className="topbar__title">{pageTitle}</div>
        <GlobalSearch />
        <div className="topbar__actions">
          <NotificationCenter />
          <div className="topbar__avatar" title="Martin Nosek">MN</div>
        </div>
      </div>

      <main className="main-content">
        <Suspense fallback={<LoadingSpinner />}>
          <Outlet />
        </Suspense>
      </main>

      <MioPanel />

      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}
