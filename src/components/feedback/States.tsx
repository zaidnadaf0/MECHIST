import type { ReactNode } from 'react';
import { Button } from '@/components/ui';

export type ErrorKind = 'firebase' | 'gps' | 'permission' | 'network' | 'ml' | 'api' | 'empty-results' | 'generic';

const COPY: Record<ErrorKind, { title: string; description: string }> = {
  firebase:        { title: 'Connection issue',     description: 'We could not reach our servers. Your changes are saved locally and will sync when we reconnect.' },
  gps:             { title: 'Location unavailable', description: 'We could not determine your location. You can enter it manually instead.' },
  permission:      { title: 'Permission needed',    description: 'RoadAssisst needs this permission to continue. You can update your choice in browser settings.' },
  network:         { title: 'You are offline',      description: 'Reconnect to the internet to continue. Anything you do now will be retried automatically.' },
  ml:              { title: 'Smart matching paused',description: 'Our matching service is temporarily unavailable. You can still browse mechanics nearby.' },
  api:             { title: 'Something went wrong', description: 'Our team has been notified. Please try again in a moment.' },
  'empty-results': { title: 'No matches yet',       description: 'Try changing your filters or expanding the search radius.' },
  generic:         { title: 'Something went wrong', description: 'Please try again. If the problem persists, contact support.' },
};

export function ErrorState({
  kind = 'generic',
  title,
  description,
  onRetry,
  retryLabel = 'Try again',
  children,
}: {
  kind?: ErrorKind;
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  children?: ReactNode;
}) {
  const t = COPY[kind];
  return (
    <div role="alert" className="grid place-items-center rounded-2xl border border-danger-500/30 bg-danger-500/5 p-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-danger-500/10 text-danger-500">
        <WarnIcon />
      </div>
      <h3 className="mt-4 text-h3 text-fg-app">{title ?? t.title}</h3>
      <p className="mt-1.5 max-w-sm text-small text-fg-muted">{description ?? t.description}</p>
      {children}
      {onRetry && (
        <Button className="mt-5" variant="secondary" size="sm" onClick={onRetry}>{retryLabel}</Button>
      )}
    </div>
  );
}

export function SuccessState({ title = 'All set', description, action, onAction, actionLabel }: {
  title?: ReactNode; description?: ReactNode;
  action?: ReactNode; onAction?: () => void; actionLabel?: string;
}) {
  return (
    <div className="grid place-items-center rounded-2xl border border-success-500/30 bg-success-500/5 p-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-success-500/10 text-success-500">
        <CheckIcon />
      </div>
      <h3 className="mt-4 text-h3 text-fg-app">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-small text-fg-muted">{description}</p>}
      {(action ?? (onAction && actionLabel)) && (
        <div className="mt-5">
          {action ?? <Button variant="primary" size="sm" onClick={onAction}>{actionLabel}</Button>}
        </div>
      )}
    </div>
  );
}

function WarnIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></svg>; }
function CheckIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5"/></svg>; }
