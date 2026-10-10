/**
 * MECHIST — AuthScreen.
 *
 * Page chrome for every sign-in / sign-up page. Centralises the
 * mesh + grid background, the centred header (icon tile / eyebrow /
 * title / description), the "Firebase connected" badge, and the
 * "back to sign in" link. The card body (form, links) is owned by
 * the caller via `children`.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from './Badge';
import { FadeIn, PageTransition } from '@/components/motion';
import { IconTile } from './Data';
import { cx } from '@/lib/utils';

type Hue = 'azure' | 'aqua' | 'iris' | 'gold' | 'neutral';

export interface AuthScreenProps {
  /** Lucide icon node for the header tile. */
  icon: ReactNode;
  /** Hue the icon tile and the card edge take. */
  hue: Hue;
  /** Small label above the title — e.g. "Customer sign-in". */
  eyebrow: string;
  /** Page title (H1). */
  title: ReactNode;
  /** Lede paragraph under the title. */
  description: ReactNode;
  /** Optional content between the lede and the status badge — e.g. a status pipeline for mechanic signup. */
  between?: ReactNode;
  /** Width of the form card. `narrow` ≈ 28rem, `wide` ≈ 42rem. */
  width?: 'narrow' | 'wide';
  /** Whether Firebase is wired up. Drives the status badge + dev warning. */
  configured: boolean;
  /** Href of the role-selection page. */
  backHref: string;
  /** Label of the back link. */
  backLabel: string;
  /** Card body. */
  children: ReactNode;
  /** Optional footer (terms, alternate portal links) below the card. */
  footer?: ReactNode;
}

const hueAccent: Record<Hue, string> = {
  azure: 'from-azure-500 via-azure-500 to-transparent',
  aqua: 'from-aqua-500 via-aqua-500 to-transparent',
  iris: 'from-iris-500 via-iris-500 to-transparent',
  gold: 'from-gold-400 via-gold-400 to-transparent',
  neutral: 'from-transparent via-line-strong to-transparent',
};

const huePanel: Record<Hue, string> = {
  azure: 'bg-azure-500/10 border-azure-500/15',
  aqua: 'bg-aqua-500/10 border-aqua-500/15',
  iris: 'bg-iris-500/10 border-iris-500/15',
  gold: 'bg-gold-400/10 border-gold-400/15',
  neutral: 'bg-surface-1 border-line-soft',
};

export function AuthScreen({
  icon,
  hue,
  eyebrow,
  title,
  description,
  between,
  width = 'narrow',
  configured,
  backHref,
  backLabel,
  children,
  footer,
}: AuthScreenProps) {
  const isPortal = width === 'narrow';
  return (
    <PageTransition>
      <div className="relative isolate overflow-hidden">
        <span aria-hidden className="mesh-layer opacity-60" />
        <span aria-hidden className="grid-layer opacity-40" />

        <div className="container section-sm">
          <div className={cx('mx-auto flex w-full flex-col gap-6', isPortal ? 'max-w-5xl' : 'max-w-2xl')}>
            {/* Portal-style split: role card on left, form on right for login pages */}
            {isPortal ? (
              <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
                {/* Role identity panel — inspired by RoadAssist auth aside */}
                <FadeIn>
                  <div className={cx('rounded-2xl border p-6 lg:p-8 lg:sticky lg:top-24', huePanel[hue])}>
                    <div className={cx('h-px w-12 bg-gradient-to-r opacity-70', hueAccent[hue])} />
                    <div className="mt-4 flex items-center gap-3">
                      <IconTile icon={icon} hue={hue} />
                      <span className="eyebrow">{eyebrow}</span>
                    </div>
                    <h1 className="display mt-3 text-h1 text-fg-app text-balance leading-tight">{title}</h1>
                    <p className="mt-3 max-w-sm text-small leading-relaxed text-fg-muted text-pretty">{description}</p>
                    {between && <div className="mt-5">{between}</div>}
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Badge tone={configured ? 'success' : 'warning'} dot>
                        {configured ? 'Firebase connected' : 'Firebase not configured'}
                      </Badge>
                      <Link to={backHref} className="link-quiet text-xs">{backLabel}</Link>
                    </div>
                    {!configured && (
                      <p className="mt-4 rounded-lg border border-warning-500/30 bg-warning-500/10 p-3 text-xs text-warning-700 dark:text-warning-300">
                        Add your Firebase keys to <code className="font-mono">.env.local</code> and restart <code className="font-mono">npm run dev</code>.
                      </p>
                    )}
                    <div className="mt-6 rounded-xl bg-surface-1/70 p-4 text-xs leading-relaxed text-fg-muted">
                      {hue === 'azure' && 'Request help in one tap, follow your mechanic live, and keep every vehicle in one garage.'}
                      {hue === 'aqua' && 'Go live to receive nearby jobs. Offers live for 120 seconds — accept, decline or hide and keep working.'}
                      {hue === 'iris' && 'Staff-only. Verify mechanics, oversee live requests, and keep the network healthy from one place.'}
                    </div>
                  </div>
                </FadeIn>
                <FadeIn delay={0.06}>
                  <div className="flex flex-col gap-4">
                    {children}
                    {footer && <div className="pt-2">{footer}</div>}
                  </div>
                </FadeIn>
              </div>
            ) : (
              <>
                <FadeIn>
                  <div className="flex flex-col items-center gap-3 text-center">
                    <IconTile icon={icon} hue={hue} />
                    <div>
                      <div className="eyebrow">{eyebrow}</div>
                      <h1 className="display mt-1 text-h1 text-fg-app text-balance">{title}</h1>
                    </div>
                    <p className="max-w-sm text-small text-fg-muted text-pretty">{description}</p>
                    {between}
                  </div>
                </FadeIn>
                <FadeIn delay={0.05}>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Badge tone={configured ? 'success' : 'warning'} dot>
                        {configured ? 'Firebase connected' : 'Firebase not configured'}
                      </Badge>
                      <Link to={backHref} className="link-quiet text-xs">{backLabel}</Link>
                    </div>
                    {!configured && (
                      <p className="rounded-lg border border-warning-500/30 bg-warning-500/10 p-3 text-xs text-warning-700 dark:text-warning-300">
                        Add your Firebase keys to <code className="font-mono">.env.local</code> and restart <code className="font-mono">npm run dev</code>.
                      </p>
                    )}
                    {children}
                  </div>
                </FadeIn>
                {footer && <div className="flex flex-col gap-2">{footer}</div>}
              </>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
