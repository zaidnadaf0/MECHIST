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
  return (
    <PageTransition>
      <div className="relative isolate overflow-hidden">
        <span aria-hidden className="mesh-layer opacity-80" />
        <span aria-hidden className="grid-layer opacity-60" />

        <div className="container section-sm">
          <div
            className={cx(
              'mx-auto flex w-full flex-col gap-6',
              width === 'narrow' ? 'max-w-md' : 'max-w-2xl',
            )}
          >
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
                  <Link to={backHref} className="link-quiet text-xs">
                    {backLabel}
                  </Link>
                </div>

                {!configured && (
                  <p className="rounded-lg border border-warning-500/30 bg-warning-500/10 p-3 text-xs text-warning-700 dark:text-warning-300">
                    Add your Firebase keys to <code className="font-mono">.env.local</code> and
                    restart <code className="font-mono">npm run dev</code> to enable real auth.
                  </p>
                )}

                {children}
              </div>
            </FadeIn>

            {footer && <div className="flex flex-col gap-2">{footer}</div>}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
