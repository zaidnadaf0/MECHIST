import type { ReactNode } from 'react';
import { Car, Clock3, History, SearchX, Users, Wrench } from 'lucide-react';
import { Button } from '@/components/ui';

export type EmptyKind = 'vehicles' | 'requests' | 'mechanics' | 'history' | 'incoming' | 'generic'
  | 'adminRequests' | 'adminMechanics' | 'adminUsers' | 'filtered';

const COPY: Record<EmptyKind, { title: string; description: string; cta?: string }> = {
  vehicles:       { title: 'No vehicles yet',      description: 'Add your first vehicle so we can match you to the right mechanic.', cta: 'Add vehicle' },
  requests:       { title: 'No active request',    description: 'When you need help, request assistance and a verified mechanic will be on the way.', cta: 'Request assistance' },
  mechanics:      { title: 'No mechanics nearby',  description: 'Try widening your search or check back in a few minutes — availability changes throughout the day.' },
  history:        { title: 'No service history',   description: 'Completed services will appear here. Your first service is one request away.' },
  incoming:       { title: 'No incoming requests', description: 'New requests from customers will appear here in real time.' },
  generic:        { title: 'Nothing here yet',     description: 'When there is something to show, it will appear here.' },
  adminRequests:  { title: 'No requests yet',      description: 'Customer requests will appear here as they come in.' },
  adminMechanics: { title: 'No mechanics yet',     description: 'Mechanic applications will appear here when someone applies.' },
  adminUsers:     { title: 'No users yet',         description: 'User records will appear here.' },
  filtered:       { title: 'No matches',           description: 'No results for this filter. Try a different category or clear the filter.' },
};

const ICONS: Record<EmptyKind, typeof Car> = {
  vehicles: Car, requests: Clock3, mechanics: Wrench, history: History,
  incoming: SearchX, generic: SearchX,
  adminRequests: Clock3, adminMechanics: Wrench, adminUsers: Users, filtered: SearchX,
};

export function EmptyState({
  kind = 'generic',
  title,
  description,
  ctaLabel,
  onAction,
  icon,
  compact = false,
}: {
  kind?: EmptyKind;
  title?: ReactNode;
  description?: ReactNode;
  ctaLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  compact?: boolean;
}) {
  const t = COPY[kind];
  const Icon = ICONS[kind] ?? SearchX;
  return (
    <div className={`grid place-items-center rounded-xl border border-dashed border-[color:var(--border-subtle)] text-center ${compact ? 'p-6 md:p-7' : 'p-8 md:p-10'}`}>
      <div className={`grid place-items-center rounded-full bg-ink-100 text-fg-muted dark:bg-ink-800 ${compact ? 'h-10 w-10' : 'h-12 w-12'}`}>
        {icon ?? <Icon className="h-5 w-5" aria-hidden />}
      </div>
      <h3 className={`text-fg-app ${compact ? 'mt-3 text-h3' : 'mt-4 text-h3'}`}>{title ?? t.title}</h3>
      <p className={`max-w-md text-small text-fg-muted ${compact ? 'mt-1' : 'mt-1.5'}`}>{description ?? t.description}</p>
      {(ctaLabel ?? t.cta) && onAction && (
        <Button className={compact ? 'mt-4' : 'mt-5'} variant="primary" size="sm" onClick={onAction}>
          {ctaLabel ?? t.cta}
        </Button>
      )}
    </div>
  );
}
