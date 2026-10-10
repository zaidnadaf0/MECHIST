/**
 * Customer settings (`/settings`, customer-protected).
 *
 * Only real, working controls — no placeholder toggles:
 * - Appearance: light/dark theme via the existing ThemeProvider
 *   (the app's one intentionally device-local UI preference).
 * - Account: read-only sign-in identity + shortcuts to Profile,
 *   Vehicles and Emergency contacts.
 * - Notifications: live unread count from the shared inbox hook +
 *   mark-all-read, deep-linking to the Notifications page.
 * - Support: product links + sign out.
 */
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Car, LogOut, Moon, Siren, Sun, User } from 'lucide-react';
import { Button, Card, SectionHeading, SectionShell } from '@/components/ui';
import { useAuth } from '@/app/AuthProvider';
import { useTheme } from '@/app/ThemeProvider';
import { useUnreadCount } from '@/lib/useNotifications';
import { markAllRead } from '@/lib/notifications';
import { useToast } from '@/components/ui';

export function Settings() {
  const { user, role, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const toast = useToast();
  const unread = useUnreadCount(user?.uid ?? null);

  if (!user) return null;

  return (
    <SectionShell tone="app">
      <div className="container section-compact flex max-w-xl flex-col gap-6">
        <SectionHeading
          as="h1" size="sm" eyebrow="Preferences" title="Settings"
          description="Appearance, account shortcuts and support. Profile details live under Profile."
        />

        <Card>
          <div className="text-body font-medium text-fg-app">Appearance</div>
          <p className="mt-0.5 text-small text-fg-muted">Kept on this device, like the rest of the app shell.</p>
          <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Colour theme">
            <Button
              variant={theme === 'light' ? 'primary' : 'secondary'} size="md"
              leftIcon={<Sun className="h-4 w-4" />}
              onClick={() => setTheme('light')}
            >
              Light
            </Button>
            <Button
              variant={theme === 'dark' ? 'primary' : 'secondary'} size="md"
              leftIcon={<Moon className="h-4 w-4" />}
              onClick={() => setTheme('dark')}
            >
              Dark
            </Button>
          </div>
        </Card>

        <Card>
          <div className="text-body font-medium text-fg-app">Account</div>
          <div className="mt-1 text-small text-fg-muted">
            Signed in as <span className="font-medium text-fg-app">{user.email ?? user.uid}</span>
            {' · '}Role: <span className="font-medium text-fg-app">{role ?? 'customer'}</span>
          </div>
          <div className="mt-3 grid gap-2">
            <Link to="/profile"><Button variant="secondary" size="md" fullWidth leftIcon={<User className="h-4 w-4" />}>Edit profile</Button></Link>
            <Link to="/vehicles"><Button variant="secondary" size="md" fullWidth leftIcon={<Car className="h-4 w-4" />}>Manage vehicles</Button></Link>
            <Link to="/emergency"><Button variant="secondary" size="md" fullWidth leftIcon={<Siren className="h-4 w-4" />}>Emergency contacts</Button></Link>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div className="text-body font-medium text-fg-app">Notifications</div>
            {unread > 0 && (
              <Button
                variant="ghost" size="sm"
                onClick={() => void markAllRead(user.uid).then((ok) =>
                  toast.push(ok ? { title: 'All marked read', tone: 'success' } : { title: 'Could not update', tone: 'danger' }),
                )}
              >
                Mark all read
              </Button>
            )}
          </div>
          <p className="mt-0.5 text-small text-fg-muted">
            {unread === 0 ? 'You are all caught up.' : `${unread} unread notification${unread === 1 ? '' : 's'}.`}
          </p>
          <div className="mt-3">
            <Link to="/notifications"><Button variant="secondary" size="md" fullWidth leftIcon={<Bell className="h-4 w-4" />}>Open inbox</Button></Link>
          </div>
        </Card>

        <Card>
          <div className="text-body font-medium text-fg-app">Support</div>
          <div className="mt-3 grid gap-2">
            <Link to="/how-it-works"><Button variant="ghost" size="md" fullWidth>How RoadAssisst works</Button></Link>
            <Button
              variant="ghost" size="md" fullWidth
              leftIcon={<LogOut className="h-4 w-4" />}
              onClick={() => void signOut().then(() => navigate('/'))}
            >
              Sign out
            </Button>
          </div>
        </Card>
      </div>
    </SectionShell>
  );
}
