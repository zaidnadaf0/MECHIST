import type { ReactNode } from 'react';
import { Button } from '@/components/ui';

export type EmptyKind = 'vehicles' | 'requests' | 'mechanics' | 'history' | 'incoming' | 'generic';

const COPY: Record<EmptyKind, { title: string; description: string; cta?: string }> = {
  vehicles:  { title: 'No vehicles yet',     description: 'Add your first vehicle so we can match you to the right mechanic.', cta: 'Add vehicle' },
  requests:  { title: 'No active request',   description: 'When you need help, request assistance and a verified mechanic will be on the way.', cta: 'Request assistance' },
  mechanics: { title: 'No mechanics nearby', description: 'Try widening your search or check back in a few minutes — availability changes throughout the day.' },
  history:   { title: 'No service history',  description: 'Completed services will appear here. Your first service is one request away.' },
  incoming:  { title: 'No incoming requests',description: 'New requests from customers will appear here in real time.' },
  generic:   { title: 'Nothing here yet',    description: 'When there is something to show, it will appear here.' },
};

export function EmptyState({
  kind = 'generic',
  title,
  description,
  ctaLabel,
  onAction,
  icon,
}: {
  kind?: EmptyKind;
  title?: ReactNode;
  description?: ReactNode;
  ctaLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}) {
  const t = COPY[kind];
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-[color:var(--border-subtle)] p-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-ink-100 text-fg-muted dark:bg-ink-800">
        {icon ?? <DotIcon />}
      </div>
      <h3 className="mt-4 text-h3 text-fg-app">{title ?? t.title}</h3>
      <p className="mt-1.5 max-w-sm text-small text-fg-muted">{description ?? t.description}</p>
      {(ctaLabel ?? t.cta) && onAction && (
        <Button className="mt-5" variant="primary" size="sm" onClick={onAction}>
          {ctaLabel ?? t.cta}
        </Button>
      )}
    </div>
  );
}

function DotIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="3"/></svg>;
}
