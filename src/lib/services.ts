/**
 * Service catalogue — static definitions only (not records).
 * Adapted from RoadAssistBACKUP seed SERVICES; prices/ETAs are
 * starting estimates displayed honestly as "from ₹X".
 * Real assignment/pricing comes from Firestore requests.
 */
export interface ServiceDef {
  id: string;
  name: string;
  basePriceInr: number;
  etaMin: number;
  blurb: string;
}

export const SERVICES: ServiceDef[] = [
  { id: 'towing', name: 'Towing', basePriceInr: 1499, etaMin: 30, blurb: 'Flatbed & wheel-lift towing to your garage of choice.' },
  { id: 'battery', name: 'Battery jumpstart', basePriceInr: 599, etaMin: 20, blurb: 'Jumpstart or on-spot battery replacement.' },
  { id: 'tire', name: 'Flat tire', basePriceInr: 499, etaMin: 20, blurb: 'Puncture repair, stepney change, air refill.' },
  { id: 'fuel', name: 'Fuel delivery', basePriceInr: 399, etaMin: 25, blurb: 'Emergency petrol/diesel delivered to you.' },
  { id: 'lockout', name: 'Lockout', basePriceInr: 549, etaMin: 20, blurb: 'Damage-free door unlock and key help.' },
  { id: 'winch', name: 'Winch-out', basePriceInr: 1899, etaMin: 40, blurb: 'Mud, ditch or basement recovery with winch.' },
];

export function serviceById(id: string | null | undefined): ServiceDef | null {
  if (!id) return null;
  return SERVICES.find((s) => s.id === id) ?? null;
}

/**
 * Catalogue service → request problem-category. Mirrors the deep-link map
 * in RequestFlow (`/request?service=`) and the categories in `nearby.ts`,
 * so per-service availability counts use the same compatibility logic as
 * dispatch matching (`problemCompatibility`).
 */
export function serviceCategoryFor(serviceId: string): string {
  const map: Record<string, string> = {
    towing: 'tow',
    winch: 'tow',
    battery: 'battery',
    tire: 'flat-tyre',
    fuel: 'other',
    lockout: 'other',
  };
  return map[serviceId] ?? 'other';
}
