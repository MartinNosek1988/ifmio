import { Suspense, useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CanonicalLink } from '../shared/components/seo/CanonicalLink';
import { KeyboardShortcutsOverlay } from '../shared/components/KeyboardShortcutsOverlay';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Building2, Users, FolderOpen, Calendar,
  Wrench, Headphones, Box, Gauge, FileText, UserCheck,
  Wallet, AlertTriangle, TrendingUp, ShoppingCart, Receipt,
  MessageSquare, Mail, Send, Settings, BarChart3, Database, Download, Landmark, MapPinned,
  ClipboardList, ClipboardCheck, ScrollText, UsersRound, FileCheck2, Columns3, Vote, PenLine,
  User as UserIcon, LogOut, Shield, Menu, X, ChevronDown, Sparkles,
} from 'lucide-react';
import { LoadingSpinner } from '../shared/components';
import { Breadcrumbs as BreadcrumbsNav } from '../shared/components/Breadcrumbs';
import { OfflineBanner } from '../shared/components/OfflineBanner';
import { GlobalSearch } from '../modules/search/GlobalSearch';
import { PropertyPicker } from '../core/components/PropertyPicker';
import { usePropertyPickerStore } from '../core/stores/property-picker.store';
import { MioPanel } from '../modules/ai/MioPanel';
import { NotificationCenter } from '../modules/notifications/NotificationCenter';
// OnboardingWizard removed — onboarding now handled by /onboarding route
import { useKeyboardShortcuts } from '../shared/hooks/useKeyboardShortcuts';
import { useRoleUX, type UXRole } from '../shared/hooks/useRoleUX';
import { apiClient } from '../core/api/client';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  /** If provided, item is only shown for users whose UXRole is in this list */
  roles?: UXRole[];
}

interface NavSection {
  title: string;
  items: NavItem[];
  /** If provided, section is only shown for users whose UXRole is in this list */
  roles?: UXRole[];
}

// TODO: Sidebar items should be filtered by PropertyTypeConfig.features
// e.g. hide "Shromáždění" for COMMERCIAL_OFFICE, hide "Fond oprav" for RENTAL_RESIDENTIAL
// Requires: selected property context → getPropertyTypeConfig(property.type).features.hasAssembly
const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Přehled',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
    ],
  },
  {
    title: 'Provoz',
    items: [
      { to: '/helpdesk', label: 'Helpdesk', icon: <Headphones size={17} /> },
      { to: '/kanban', label: 'Pipeline', icon: <Columns3 size={17} />, roles: ['fm', 'tech'] },
      { to: '/my-agenda', label: 'Moje agenda', icon: <ClipboardCheck size={17} />, roles: ['tech'] },
      { to: '/workorders', label: 'Pracovní úkoly', icon: <Wrench size={17} />, roles: ['fm', 'tech', 'owner'] },
      { to: '/workorders/dispatch', label: 'Dispečink', icon: <Columns3 size={17} />, roles: ['fm'] },
      { to: '/workorders/my-schedule', label: 'Můj plán', icon: <ClipboardCheck size={17} />, roles: ['tech'] },
      { to: '/assets', label: 'Pasportizace', icon: <Box size={17} />, roles: ['fm', 'tech', 'owner'] },
      { to: '/revisions', label: 'Plán činností', icon: <ClipboardCheck size={17} />, roles: ['fm', 'tech', 'owner'] },
      { to: '/protocols', label: 'Protokoly', icon: <FileCheck2 size={17} />, roles: ['fm', 'tech'] },
      { to: '/documents', label: 'Dokumenty', icon: <FolderOpen size={17} />, roles: ['fm', 'tech', 'owner'] },
      { to: '/esign', label: 'eSign', icon: <FileCheck2 size={17} />, roles: ['fm'] },
    ],
  },
  {
    title: 'Správa',
    roles: ['fm', 'owner'],
    items: [
      { to: '/properties', label: 'Nemovitosti', icon: <Building2 size={17} /> },
      { to: '/principals', label: 'Klienti', icon: <UsersRound size={17} /> },
      { to: '/parties', label: 'Adresář', icon: <Users size={17} /> },
      { to: '/contracts', label: 'Nájemní smlouvy', icon: <FileText size={17} /> },
      { to: '/residents', label: 'Bydlící', icon: <UserCheck size={17} /> },
      { to: '/meters', label: 'Měřidla & Energie', icon: <Gauge size={17} /> },
      { to: '/calendar', label: 'Kalendář', icon: <Calendar size={17} /> },
    ],
  },
  {
    title: 'Finance',
    roles: ['fm', 'owner'],
    items: [
      { to: '/finance', label: 'Finance', icon: <Wallet size={17} /> },
      { to: '/finance?tab=konto', label: 'Konto vlastníků', icon: <Wallet size={17} /> },
      { to: '/finance?tab=debtors', label: 'Dlužníci', icon: <AlertTriangle size={17} /> },
      { to: '/finance?tab=revenues', label: 'Výnosy SVJ', icon: <TrendingUp size={17} /> },
      { to: '/expenses', label: 'Výdaje', icon: <Receipt size={17} />, roles: ['fm', 'tech'] },
      { to: '/purchase-orders', label: 'Objednávky', icon: <ShoppingCart size={17} /> },
      { to: '/settlements', label: 'Vyúčtování', icon: <BarChart3 size={17} /> },
    ],
  },
  {
    title: 'Komunikace',
    roles: ['fm', 'owner'],
    items: [
      { to: '/communication', label: 'Komunikace', icon: <MessageSquare size={17} /> },
      { to: '/communication?tab=mail', label: 'Pošta', icon: <Mail size={17} /> },
      { to: '/mass-mailing', label: 'Hromadna posta', icon: <Send size={17} />, roles: ['fm'] },
    ],
  },
  {
    title: 'Systém',
    roles: ['fm'],
    items: [
      { to: '/reporting', label: 'Reporting', icon: <BarChart3 size={17} /> },
      { to: '/reports', label: 'Výkazy', icon: <ClipboardList size={17} /> },
      { to: '/team', label: 'Uživatelé & Tým', icon: <UsersRound size={17} /> },
      { to: '/asset-types', label: 'Typy zařízení', icon: <ClipboardList size={17} /> },
      { to: '/mio', label: 'Mio AI', icon: <Sparkles size={17} /> },
      { to: '/mio/insights', label: 'Mio Insights', icon: <AlertTriangle size={17} />, roles: ['fm', 'owner'] },
      { to: '/knowledge-base', label: 'Knowledge Base', icon: <Database size={17} />, roles: ['fm', 'owner'] },
      { to: '/audit', label: 'Audit log', icon: <ScrollText size={17} /> },
      { to: '/settings', label: 'Nastavení', icon: <Settings size={17} /> },
    ],
  },
  {
    title: 'CRM',
    roles: ['fm'],
    items: [
      { to: '/crm', label: 'Přehled', icon: <LayoutDashboard size={17} /> },
      { to: '/crm/buildings', label: 'Budovy', icon: <Building2 size={17} /> },
      { to: '/crm/organizations', label: 'Organizace', icon: <Landmark size={17} /> },
      { to: '/crm/map', label: 'Mapa', icon: <MapPinned size={17} /> },
      { to: '/crm/import', label: 'Import dat', icon: <Download size={17} /> },
      { to: '/crm/pipeline', label: 'Pipeline', icon: <TrendingUp size={17} /> },
      { to: '/crm/kb-candidates', label: 'KB kandidati', icon: <Database size={17} /> },
    ],
  },
  {
    title: 'Portál',
    roles: ['client'],
    items: [
      { to: '/portal', label: 'Přehled', icon: <LayoutDashboard size={17} /> },
      { to: '/portal/units', label: 'Moje jednotky', icon: <Building2 size={17} /> },
      { to: '/portal/prescriptions', label: 'Předpisy plateb', icon: <FileText size={17} /> },
      { to: '/portal/settlements', label: 'Vyúčtování', icon: <BarChart3 size={17} /> },
      { to: '/portal/tickets', label: 'Požadavky', icon: <Headphones size={17} /> },
      { to: '/portal/meters', label: 'Měřiče', icon: <Gauge size={17} /> },
      { to: '/portal/documents', label: 'Dokumenty', icon: <FolderOpen size={17} /> },
      { to: '/portal/konto', label: 'Konto', icon: <Wallet size={17} /> },
      { to: '/portal/voting', label: 'Hlasování', icon: <Vote size={17} /> },
      { to: '/portal/esign', label: 'Podpisy', icon: <PenLine size={17} /> },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/onboarding': 'Průvodce nastavením',
  '/dashboard': 'Dashboard',
  '/properties': 'Nemovitosti',
  '/contacts': 'Adresář',
  '/parties': 'Adresář',
  '/settlements': 'Roční vyúčtování',
  '/contracts': 'Nájemní smlouvy',
  '/documents': 'Dokumenty',
  '/calendar': 'Kalendář',
  '/workorders': 'Pracovní úkoly',
  '/helpdesk': 'Helpdesk',
  '/assets': 'Pasportizace',
  '/asset-types': 'Typy zařízení',
  '/meters': 'Měřidla & Energie',
  '/residents': 'Bydlící',
  '/protocols': 'Protokoly',
  '/revisions': 'Plán činností',
  '/compliance': 'Stav plnění',
  '/finance': 'Finance',
  '/expenses': 'Výdaje',
  '/purchase-orders': 'Objednávky dodavatelů',
  '/communication': 'Komunikace',
  '/reporting': 'Reporting',
  '/reports': 'Výkazy',
  '/team': 'Uživatelé & Tým',
  '/audit': 'Audit log',
  // /admin redirects to /team
  '/settings': 'Nastavení organizace',
  '/notifications': 'Notifikace',
  '/profile': 'Můj profil',
  '/super-admin': 'Super Admin',
  '/portal': 'Klientský portál',
  '/portal/units': 'Moje jednotky',
  '/portal/prescriptions': 'Předpisy plateb',
  '/portal/settlements': 'Vyúčtování',
  '/portal/tickets': 'Požadavky',
  '/portal/meters': 'Měřiče',
  '/portal/documents': 'Dokumenty',
  '/portal/konto': 'Konto',
  '/portal/voting': 'Hlasování',
  '/portal/esign': 'Podpisy',
  '/crm/pipeline': 'CRM Pipeline',
  '/crm/kb-candidates': 'KB Kandidati',
  '/kanban': 'Pipeline',
  '/mass-mailing': 'Hromadna posta',
};

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/properties/')) return 'Detail nemovitosti';
  if (pathname.startsWith('/assets/')) return 'Karta zařízení';
  return PAGE_TITLES[pathname] || 'ifmio';
}

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const pageTitle = getPageTitle(location.pathname);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const globalPropertyId = usePropertyPickerStore(s => s.selectedPropertyId);
  const clearGlobalProperty = usePropertyPickerStore(s => s.clear);

  // Detect active property from URL
  const propertyMatch = location.pathname.match(/^\/properties\/([^/]+)/);
  const activePropertyId = propertyMatch?.[1] ?? null;

  // Fetch active property name for topbar breadcrumb
  const { data: activePropertyData } = useQuery({
    queryKey: ['properties', activePropertyId],
    queryFn: () => apiClient.get(`/properties/${activePropertyId}`).then(r => r.data),
    enabled: !!activePropertyId,
    staleTime: 60_000,
  });

  // Close mobile sidebar on navigation
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { showHelp, closeHelp } = useKeyboardShortcuts();

  const { data: onboardingData } = useQuery({
    queryKey: ['admin', 'onboarding'],
    queryFn: () => apiClient.get('/admin/onboarding').then((r) => r.data),
    staleTime: 30_000,
  });

  // Consolidated badge counts — single API call replaces 4 separate queries
  const { data: badges } = useQuery({
    queryKey: ['dashboard', 'badges'],
    queryFn: () => apiClient.get('/dashboard/badges').then((r) => r.data),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: false,
  });
  const openTicketsCount = (badges?.helpdesk?.open ?? 0) + (badges?.helpdesk?.inProgress ?? 0);
  const expiringContracts = badges?.contracts?.expiringSoon ?? 0;
  const openWOCount = badges?.workOrders?.open ?? 0;

  const { data: meData } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.get('/auth/me').then((r) => r.data),
    staleTime: 300_000,
    retry: false,
  });
  // Fetch avatar via authenticated API call (img tags can't send Authorization header)
  const { data: avatarData } = useQuery({
    queryKey: ['auth', 'avatar'],
    queryFn: () => apiClient.get('/auth/me/avatar').then((r) => r.data?.avatarBase64 ?? null).catch(() => null),
    enabled: !!meData?.hasAvatar,
    staleTime: Infinity,
  });
  const { data: saCheck } = useQuery({
    queryKey: ['super-admin', 'check'],
    queryFn: () => apiClient.get('/super-admin/check').then((r) => r.data),
    staleTime: Infinity,
    retry: false,
  });
  const isSuperAdmin = saCheck?.isSuperAdmin === true;
  const trialDays = (() => {
    if (!meData?.tenant?.trialEndsAt) return null;
    const diff = new Date(meData.tenant.trialEndsAt).getTime() - Date.now();
    const days = Math.ceil(diff / 86_400_000);
    return days > 0 ? days : null;
  })();

  const [onboardingDismissed, setOnboardingDismissed] = useState(() => localStorage.getItem('onboarding-banner-dismissed') === 'true');
  const showOnboardingBanner = onboardingData
    && !onboardingData.completed
    && !onboardingData.dismissed
    && !onboardingDismissed
    && location.pathname !== '/onboarding';

  const uxRole = useRoleUX();

  // Redirect client users to portal if they land on dashboard or root
  useEffect(() => {
    if (uxRole === 'client' && (location.pathname === '/dashboard' || location.pathname === '/')) {
      navigate('/portal', { replace: true });
    }
  }, [uxRole, location.pathname, navigate]);

  const visibleSections = NAV_SECTIONS
    .filter((sec) => !sec.roles || sec.roles.includes(uxRole))
    .map((sec) => ({
      ...sec,
      items: sec.items.filter((item) => !item.roles || item.roles.includes(uxRole)),
    }))
    .filter((sec) => sec.items.length > 0);

  return (
    <div>
      <a href="#main-content" className="sr-only" style={{ position: 'absolute', top: -9999 }} onFocus={e => { e.currentTarget.style.position = 'fixed'; e.currentTarget.style.top = '8px'; e.currentTarget.style.left = '8px'; e.currentTarget.style.zIndex = '10000'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.padding = '8px 16px'; e.currentTarget.style.borderRadius = '6px'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'; }} onBlur={e => { e.currentTarget.style.position = 'absolute'; e.currentTarget.style.top = '-9999px'; }}>Přeskočit na hlavní obsah</a>
      <CanonicalLink />
      <KeyboardShortcutsOverlay open={showHelp} onClose={closeHelp} />
      {/* Mobile sidebar overlay */}
      <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <nav className={`sidebar${sidebarOpen ? ' open' : ''}`} aria-label="Hlavní navigace">
        <div className="sidebar__logo">ifmio</div>
        {visibleSections.map((sec) => (
          <div key={sec.title} className="sidebar__section">
            <div className="sidebar__section-title">{sec.title}</div>
            {sec.items.map((item) => {
              const hasQuery = item.to.includes('?');
              const badgeCount = item.to === '/helpdesk' ? openTicketsCount
                : item.to === '/contracts' ? expiringContracts
                : item.to === '/workorders' ? openWOCount : 0;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  data-testid={`sidebar-nav-${item.to.replace(/^\//, '').replace(/[/?=]/g, '-') || 'home'}`}
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
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Menu">
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div className="topbar__title" style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="hide-on-mobile">{pageTitle}</span>
          <span className="show-mobile-only" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activePropertyData?.name ?? pageTitle}
          </span>
          {activePropertyData?.name && (
            <span className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 400 }}>›</span>
              <button
                onClick={() => setShowPropertyPicker(true)}
                style={{
                  background: 'none', border: '1px solid var(--border, #e5e7eb)', borderRadius: 6,
                  padding: '2px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: '0.82rem', fontWeight: 500, color: 'var(--text)',
                  maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
                title="Přepnout nemovitost"
              >
                {activePropertyData.name}
                <ChevronDown size={12} color="var(--text-muted)" />
              </button>
            </span>
          )}
        </div>
        {/* Global property filter indicator */}
        {globalPropertyId && !activePropertyId && (
          <div
            data-testid="global-property-indicator"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '2px 10px', borderRadius: 16,
              background: 'rgba(99,102,241,.1)', border: '1px solid rgba(99,102,241,.2)',
              fontSize: '0.78rem', fontWeight: 500, color: 'var(--primary, #6366f1)',
              whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden',
            }}
          >
            <Building2 size={12} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Filtr nemovitosti</span>
            <button
              onClick={clearGlobalProperty}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 0, display: 'flex' }}
              title="Zrušit filtr"
              aria-label="Zrušit filtr"
            >
              <X size={12} />
            </button>
          </div>
        )}
        <GlobalSearch />
        <div className="topbar__actions">
          {trialDays !== null && (
            <div className="trial-badge" title={`Trial konci za ${trialDays} dni`}>
              Trial: {trialDays} {trialDays === 1 ? 'den' : trialDays < 5 ? 'dny' : 'dni'}
            </div>
          )}
          <NotificationCenter />
          <div className="user-menu-wrap" ref={userMenuRef}>
            <button
              className="topbar__avatar"
              data-testid="user-menu"
              title={meData?.name ?? 'Uzivatel'}
              aria-label="Uživatelské menu"
              onClick={() => setShowUserMenu((v) => !v)}
              style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
            >
              {avatarData ? (
                <img src={avatarData} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                (meData?.name ?? 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
              )}
            </button>
            {showUserMenu && (
              <div className="user-dropdown">
                <div className="user-dropdown__header">
                  <div style={{ fontWeight: 600, color: '#f3f4f6', fontSize: '.9rem' }}>{meData?.name ?? 'Uživatel'}</div>
                  <div style={{ color: '#6b7280', fontSize: '.78rem' }}>{meData?.email ?? ''}</div>
                </div>
                <div className="user-dropdown__sep" />
                <button className="user-dropdown__item" onClick={() => { setShowUserMenu(false); navigate('/profile'); }}>
                  <UserIcon size={15} /> Můj profil
                </button>
                <button className="user-dropdown__item" onClick={() => { setShowUserMenu(false); navigate('/settings'); }}>
                  <Settings size={15} /> Nastavení
                </button>
                {isSuperAdmin && (
                  <button className="user-dropdown__item" onClick={() => { setShowUserMenu(false); navigate('/super-admin'); }}
                    style={{ color: '#ef4444' }}>
                    <Shield size={15} /> Super Admin
                  </button>
                )}
                <div className="user-dropdown__sep" />
                <button className="user-dropdown__item user-dropdown__item--danger" onClick={() => {
                  setShowUserMenu(false);
                  sessionStorage.removeItem('ifmio:access_token');
                  sessionStorage.removeItem('ifmio:refresh_token');
                  sessionStorage.removeItem('ifmio:user');
                  window.location.href = '/login';
                }}>
                  <LogOut size={15} /> Odhlásit se
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <main id="main-content" className="main-content">
        {showOnboardingBanner && (
          <div
            data-testid="onboarding-banner"
            style={{
              margin: '0 0 16px', padding: '12px 20px',
              background: 'linear-gradient(135deg, var(--primary-dark, #0F766E), var(--primary, #0D9488))',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 8,
              color: '#fff',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 500 }}>
              Dokončete nastavení nemovitosti — {onboardingData.progress.done}/{onboardingData.progress.total} kroků hotovo
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => navigate('/onboarding')}
                style={{
                  padding: '6px 16px', borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff', fontWeight: 600, fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Pokračovat
              </button>
              <button
                onClick={() => { localStorage.setItem('onboarding-banner-dismissed', 'true'); setOnboardingDismissed(true); }}
                aria-label="Zavřít"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.7)', padding: '4px 8px',
                  fontSize: '1.2rem', marginLeft: 8,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}
        <OfflineBanner />
        <BreadcrumbsNav />
        <Suspense fallback={<LoadingSpinner />}>
          <Outlet />
        </Suspense>
      </main>

      <MioPanel />

      <PropertyPicker open={showPropertyPicker} onClose={() => setShowPropertyPicker(false)} />
    </div>
  );
}
