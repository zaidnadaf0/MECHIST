/**
 * MECHIST — single source of truth for the request lifecycle.
 *
 * The Firestore schema (`lib/customer.ts`) defines:
 *   'requested' | 'accepted' | 'on-the-way' | 'arrived' | 'service' | 'completed' | 'cancelled'
 *
 * Marketing and timeline copy uses a slightly richer vocabulary; the UI
 * maps those onto the canonical states here so we never invent
 * incompatible values. Sections 26 & 38 of the brief call this out
 * explicitly: "Do not invent incompatible state values."
 */
import type { ReactNode } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock4,
  MapPin,
  PauseCircle,
  PlayCircle,
  Search,
  Truck,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

export type CanonicalStatus =
  | 'requested'
  | 'accepted'
  | 'on-the-way'
  | 'arrived'
  | 'service'
  | 'completed'
  | 'cancelled';

export interface StatusMeta {
  /** canonical Firestore value */
  value: CanonicalStatus;
  /** short marketing label */
  label: string;
  /** one-line, sentence-case explanation */
  blurb: string;
  /** icon shown in pills, timelines, and the live status strip */
  icon: LucideIcon;
  /** semantic tone for the design system */
  tone: 'azure' | 'aqua' | 'iris' | 'gold' | 'success' | 'warning' | 'danger' | 'neutral';
  /** index for the customer-side progress timeline (0..5). null = not on the timeline. */
  step: number | null;
  /** Tailwind classes used by StatusPill for the colored dot. */
  dotClass: string;
  /** Tailwind classes used by the animated ring (radar ping) around the dot. */
  ringClass: string;
}

export const STATUS_ORDER: CanonicalStatus[] = [
  'requested',
  'accepted',
  'on-the-way',
  'arrived',
  'service',
  'completed',
];

export const STATUS_META: Record<CanonicalStatus, StatusMeta> = {
  requested: {
    value: 'requested',
    label: 'Awaiting mechanic',
    blurb: 'We have notified nearby mechanics about your request.',
    icon: Search,
    tone: 'azure',
    step: 0,
    dotClass: 'bg-azure-500',
    ringClass: 'bg-azure-500/40',
  },
  accepted: {
    value: 'accepted',
    label: 'Mechanic assigned',
    blurb: 'A mechanic has accepted and is preparing to depart.',
    icon: CheckCircle2,
    tone: 'aqua',
    step: 1,
    dotClass: 'bg-aqua-500',
    ringClass: 'bg-aqua-500/40',
  },
  'on-the-way': {
    value: 'on-the-way',
    label: 'En route',
    blurb: 'Your mechanic is on the way to your location.',
    icon: Truck,
    tone: 'aqua',
    step: 2,
    dotClass: 'bg-aqua-500',
    ringClass: 'bg-aqua-500/40',
  },
  arrived: {
    value: 'arrived',
    label: 'Mechanic arrived',
    blurb: 'Your mechanic has reached the location.',
    icon: MapPin,
    tone: 'iris',
    step: 3,
    dotClass: 'bg-iris-500',
    ringClass: 'bg-iris-500/40',
  },
  service: {
    value: 'service',
    label: 'Service in progress',
    blurb: 'Your mechanic is working on the vehicle.',
    icon: Wrench,
    tone: 'iris',
    step: 4,
    dotClass: 'bg-iris-500',
    ringClass: 'bg-iris-500/40',
  },
  completed: {
    value: 'completed',
    label: 'Completed',
    blurb: 'Service complete. You can rate the experience.',
    icon: CheckCircle2,
    tone: 'success',
    step: 5,
    dotClass: 'bg-success-500',
    ringClass: 'bg-success-500/40',
  },
  cancelled: {
    value: 'cancelled',
    label: 'Cancelled',
    blurb: 'This request has been cancelled.',
    icon: XCircle,
    tone: 'danger',
    step: null,
    dotClass: 'bg-danger-500',
    ringClass: 'bg-danger-500/40',
  },
};

/** Human label for the offer-expiry clock. */
export interface OfferExpiryMeta {
  icon: LucideIcon;
  label: string;
  tone: 'warning' | 'danger' | 'neutral';
}
export function offerExpiryMeta(msLeft: number): OfferExpiryMeta {
  if (msLeft <= 0) return { icon: AlertCircle, label: 'Offer expired', tone: 'danger' };
  if (msLeft < 30_000) return { icon: Clock4, label: `${Math.ceil(msLeft / 1000)}s to accept`, tone: 'danger' };
  if (msLeft < 60_000) return { icon: Clock4, label: 'Less than a minute', tone: 'warning' };
  return { icon: Clock4, label: `${Math.ceil(msLeft / 60_000)} min to accept`, tone: 'neutral' };
}

/** Helper for the "Why this mechanic?" pill cluster. */
export type ReasonKey = 'available' | 'close' | 'specialty' | 'rating' | 'approved' | 'experience';
export interface ReasonMeta {
  key: ReasonKey;
  label: string;
  icon: LucideIcon;
}
export const REASONS: ReasonMeta[] = [
  { key: 'available',  label: 'Available now',           icon: PlayCircle },
  { key: 'close',      label: 'Close to you',            icon: MapPin },
  { key: 'specialty',  label: 'Relevant specialization', icon: Wrench },
  { key: 'rating',     label: 'Strong rating',           icon: CheckCircle2 },
  { key: 'approved',   label: 'Verified by RoadAssisst',     icon: CheckCircle2 },
  { key: 'experience', label: 'Years of experience',     icon: PauseCircle },
];

/** Compact "eligibility" stack — distinguishes who CAN serve vs who is RECOMMENDED. */
export interface EligibilityChipsProps {
  /** mechanic is approved by an admin */
  approved?: boolean;
  /** mechanic currently flagged available */
  available?: boolean;
  /** mechanic is in the request's service area */
  inServiceArea?: boolean;
  /** mechanic's specialty matches the problem category */
  specialtyMatches?: boolean;
  /** vehicle is in the supported vehicleTypes list */
  vehicleSupported?: boolean;
}
export type EligibilityChip = { key: string; label: string; ok: boolean };

export function eligibilityChips(e: EligibilityChipsProps): EligibilityChip[] {
  return [
    { key: 'approved',   label: 'Approved',            ok: !!e.approved },
    { key: 'available',  label: 'Available',           ok: !!e.available },
    { key: 'area',       label: 'In service area',     ok: !!e.inServiceArea },
    { key: 'specialty',  label: 'Specialty matches',   ok: !!e.specialtyMatches },
    { key: 'vehicle',    label: 'Vehicle supported',   ok: !!e.vehicleSupported },
  ];
}

/** Small helper so page code can pass children to a wrapper without crashing on undefined. */
export function childrenOrNull(c: ReactNode): ReactNode {
  return c ?? null;
}