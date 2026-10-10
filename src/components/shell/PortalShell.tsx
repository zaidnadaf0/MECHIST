import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3, Bell, Car, FileText, Gauge, History, Inbox, LayoutDashboard, MapPin,
  Menu, ScrollText, Settings as SettingsIcon, ShieldCheck, Siren, Truck, User, Users2, Wrench, LogOut, X, Radio,
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { useAuth, type AppRole } from '@/app/AuthProvider';
import { useUnreadCount } from '@/lib/useNotifications';
import { cx } from '@/lib/utils';
import { useTheme } from '@/app/ThemeProvider';

interface NavItem { to: string; label: string; icon: ReactNode; end?: boolean; }
interface NavGroup { label: string; items: NavItem[]; }

const CUSTOMER_NAV: NavGroup[] = [
  {
    label: 'Assistance',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} />, end: true },
      { to: '/request', label: 'Request Help', icon: <Wrench size={16} />, end: true },
      { to: '/services', label: 'Services', icon: <Inbox size={16} />, end: true },
      { to: '/history', label: 'Service History', icon: <Radio size={16} />, end: false },
      { to: '/notifications', label: 'Notifications', icon: <Bell size={16} />, end: true },
    ],
  },
  {
    label: 'My garage',
    items: [
      { to: '/vehicles', label: 'Vehicles', icon: <Car size={16} />, end: true },
      { to: '/map', label: 'Find Mechanics', icon: <MapPin size={16} />, end: true },
      { to: '/emergency', label: 'Emergency', icon: <Siren size={16} />, end: true },
      { to: '/profile', label: 'Profile', icon: <User size={16} />, end: true },
      { to: '/settings', label: 'Settings', icon: <SettingsIcon size={16} />, end: true },
    ],
  },
];

const MECHANIC_NAV: NavGroup[] = [
  {
    label: 'Workshop',
    items: [
      { to: '/mechanic', label: 'Dashboard', icon: <LayoutDashboard size={16} />, end: true },
      { to: '/mechanic/requests', label: 'Incoming Requests', icon: <Inbox size={16} />, end: true },
      { to: '/mechanic/history', label: 'Job History', icon: <History size={16} />, end: true },
      { to: '/mechanic/notifications', label: 'Notifications', icon: <Bell size={16} />, end: true },
      { to: '/mechanic/earnings', label: 'Earnings', icon: <BarChart3 size={16} />, end: true },
      { to: '/mechanic/profile', label: 'Profile', icon: <ShieldCheck size={16} />, end: true },
    ],
  },
];

const ADMIN_NAV: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { to: '/admin', label: 'Overview', icon: <Gauge size={16} />, end: true },
      { to: '/admin/requests', label: 'Requests', icon: <Radio size={16} />, end: true },
      { to: '/admin/dispatch', label: 'Live Dispatch', icon: <Truck size={16} />, end: true },
      { to: '/admin/mechanics', label: 'Mechanics', icon: <Users2 size={16} />, end: true },
      { to: '/admin/users', label: 'Users', icon: <Users2 size={16} />, end: true },
    ],
  },
  {
    label: 'Insight',
    items: [
      { to: '/admin/analytics', label: 'Analytics', icon: <BarChart3 size={16} />, end: true },
      { to: '/admin/reports', label: 'Reports', icon: <FileText size={16} />, end: true },
      { to: '/admin/logs', label: 'Logs', icon: <ScrollText size={16} />, end: true },
    ],
  },
];

const CONFIG: Record<string, { groups: NavGroup[]; title: string; sub: string; hue: string; tone: 'azure'|'aqua'|'iris'; accent: string; }> = {
  customer: { groups: CUSTOMER_NAV, title: 'Customer', sub: 'Customer portal', hue: 'azure', tone: 'azure', accent: 'from-azure-500 via-azure-500 to-transparent' },
  mechanic: { groups: MECHANIC_NAV, title: 'Mechanic', sub: 'Mechanic console', hue: 'aqua', tone: 'aqua', accent: 'from-aqua-500 via-aqua-500 to-transparent' },
  admin:    { groups: ADMIN_NAV, title: 'Admin', sub: 'Control room', hue: 'iris', tone: 'iris', accent: 'from-iris-500 via-iris-500 to-transparent' },
};

function Sidebar({ role, onClose }: { role: AppRole; onClose?: () => void }) {
  const cfg = CONFIG[role ?? 'customer'] ?? CONFIG.customer;
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  // Real unread count, shared with the Notifications page subscription.
  // Null for admin (their nav has no inbox item → badge hidden).
  const unread = useUnreadCount(role === 'admin' ? null : (user?.uid ?? null));
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-ember-600 text-white shadow-sm">
          {role === 'mechanic' ? <Wrench size={18}/> : role === 'admin' ? <Gauge size={18}/> : <Truck size={18}/>}
        </span>
        <div className="min-w-0">
          <div className="text-small font-bold tracking-tight text-fg-app">RoadAssisst</div>
          <div className="text-[11px] text-fg-subtle">{cfg.sub}</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto grid h-8 w-8 place-items-center rounded-md text-fg-muted hover:bg-hair/[0.07] lg:hidden" aria-label="Close menu"><X size={18}/></button>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {cfg.groups.map(g => (
          <div key={g.label}>
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-subtle/80">{g.label}</div>
            <div className="space-y-1">
              {g.items.map(it => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  onClick={onClose}
                  className={({ isActive }) => cx(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-small font-medium transition-colors',
                    isActive ? 'bg-ember-500/12 text-ember-600 dark:text-ember-300' : 'text-fg-muted hover:text-fg-app hover:bg-surface-2/60'
                  )}
                >
                  <span className="opacity-90">{it.icon}</span>{it.label}
                  {it.to.endsWith('/notifications') && unread > 0 && (
                    <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-danger-500 px-1.5 font-mono text-[11px] font-bold text-white" aria-label={`${unread} unread notifications`}>
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-line-soft p-3">
        {user?.email && <div className="truncate px-3 pb-2 text-xs text-fg-subtle">{user.email}</div>}
        <button
          onClick={() => void signOut().then(()=> navigate('/'))}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-small font-medium text-fg-muted hover:text-fg-app hover:bg-surface-2/60"
        >
          <LogOut size={16}/> Sign out
        </button>
      </div>
    </div>
  );
}

export function PortalShell({ role, children }: { role: AppRole; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const cfg = CONFIG[role ?? 'customer'] ?? CONFIG.customer;
  const { theme } = useTheme();
  const { user } = useAuth();
  // Shares the inbox subscription with Sidebar + Notifications pages.
  const unread = useUnreadCount(role === 'admin' ? null : (user?.uid ?? null));

  // Flatten for bottom tabs (mobile) — show ALL items, scrollable, so no page is orphaned on mobile.
  const tabs = cfg.groups.flatMap(g => g.items);

  return (
    <div className="flex min-h-dvh bg-surface-app">
      {/* Desktop sidebar */}
      <aside className="hidden w-[272px] shrink-0 border-r border-line-soft bg-surface-1 lg:flex lg:flex-col">
        <Sidebar role={role} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={()=>setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[288px] bg-surface-1 shadow-pop">
            <Sidebar role={role} onClose={()=>setOpen(false)} />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Portal top bar — distinct from public TopNav */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line-soft bg-surface-app/80 px-4 backdrop-blur-xl lg:px-6">
          <button onClick={()=>setOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-line-soft text-fg-muted hover:text-fg-app lg:hidden"><Menu size={18}/></button>
          <div className="hidden items-center gap-2 lg:flex">
            <Badge tone={cfg.tone} dot>{cfg.title}</Badge>
            <span className="text-small font-medium text-fg-muted">·</span>
            <span className="text-small text-fg-muted hidden sm:inline">{cfg.sub}</span>
          </div>
          <span className="lg:hidden text-small font-semibold text-fg-app">{cfg.title} · {cfg.sub}</span>
          <div className="ml-auto flex items-center gap-1.5">
            {role !== 'admin' && (
              <NavLink
                to={role === 'mechanic' ? '/mechanic/notifications' : '/notifications'}
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
                className="relative grid h-9 w-9 place-items-center rounded-lg text-fg-muted hover:text-fg-app hover:bg-surface-2/60"
              >
                <Bell size={18} />
                {unread > 0 && (
                  <span aria-hidden className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger-500 px-1 font-mono text-[10px] font-bold text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </NavLink>
            )}
            <span className="hidden text-xs text-fg-subtle sm:inline">{theme} mode</span>
            <span className={cx('h-2 w-2 rounded-full', role==='mechanic' ? 'bg-aqua-500' : role==='admin' ? 'bg-iris-500' : 'bg-azure-500')} />
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 pb-16 lg:pb-0">
          {children}
        </div>

        {/* Mobile bottom tabs — horizontal scroll so every destination stays reachable */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex gap-1 overflow-x-auto border-t border-line-soft bg-surface-1 px-2 py-1 lg:hidden">
          {tabs.map(it => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) => cx('relative flex min-w-[72px] flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-medium', isActive ? 'text-fg-app bg-surface-2' : 'text-fg-subtle')}
            >
              <span>{it.icon}</span>{it.label}
              {it.to.endsWith('/notifications') && unread > 0 && (
                <span className="absolute right-1 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger-500 px-1 font-mono text-[10px] font-bold text-white" aria-label={`${unread} unread notifications`}>
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
