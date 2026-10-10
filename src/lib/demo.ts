/**
 * Demo preview — BACKUP-style sample data so every portal/page is visible
 * WITHOUT a live Firestore database.
 *
 * Honesty rules (mirrors RoadAssistBACKUP's own demo contract):
 * - Active ONLY when `localStorage['mechist.demo.v1']` is set (via ?demo=1
 *   or the "Preview demo" buttons on /login). Production path untouched.
 * - NEVER written to Firestore; NEVER presented as real data. Every demo
 *   surface is badged "DEMO PREVIEW" with an Exit button.
 * - Writes (create/accept/approve/...) stay on the real path and fail
 *   gracefully with toasts until the live backend exists.
 *
 * Adapted from RoadAssistBACKUP seed.js (services/mechanics/vehicles/
 * history/notifications) and re-typed to MECHIST shapes.
 */
import type { User } from 'firebase/auth';
import type { Vehicle, ServiceRequest } from './customer';
import type { MechanicProfile } from './mechanic';
import type { AppNotification } from './notifications';
import type { UserSummary } from './admin';

const KEY = 'mechist.demo.v1';
export type DemoRole = 'customer' | 'mechanic' | 'admin';

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch { return null; }
}

export function isDemo(): boolean {
  try {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search);
      if (q.get('demo') === '1') return true;
    }
    return storage()?.getItem(KEY) != null;
  } catch { return false; }
}

export function demoRole(): DemoRole {
  try {
    const raw = storage()?.getItem(KEY);
    if (raw === 'mechanic' || raw === 'admin' || raw === 'customer') return raw;
    const q = new URLSearchParams(window.location.search);
    const r = q.get('role');
    if (r === 'mechanic' || r === 'admin') return r;
  } catch { /* ignore */ }
  return 'customer';
}

export function enterDemo(role: DemoRole): void {
  try {
    storage()?.setItem(KEY, role);
    const url = new URL(window.location.href);
    url.searchParams.delete('demo');
    url.searchParams.delete('norole');
    window.location.href = url.pathname === '/login' || url.pathname === '/'
      ? (role === 'admin' ? '/admin' : role === 'mechanic' ? '/mechanic' : '/dashboard')
      : url.pathname + url.search;
    if (window.location.pathname === url.pathname) window.location.reload();
  } catch { /* ignore */ }
}

export function exitDemo(): void {
  try { storage()?.removeItem(KEY); } catch { /* ignore */ }
}

/** Minimal demo user — pages only read uid/email. Never sent to Firebase. */
export function demoUser(role: DemoRole): User {
  const email = role === 'admin' ? 'ops@demo.mechist' : role === 'mechanic' ? 'alex@demo.mechist' : 'zaid@demo.mechist';
  return { uid: `demo-${role}`, email } as unknown as User;
}

export const DEMO_CUSTOMER_ID = 'demo-customer';
export const DEMO_MECHANIC_ID = 'demo-mechanic';
const NOW = Date.now();
const H = 3600_000;

export const DEMO_MECHANICS: MechanicProfile[] = [
  { id: 'demo-mech-1', name: 'Arjun Reddy', phone: '+91 98450 11111', email: 'arjun@demo.mechist', approved: true, verificationStatus: 'approved', specialties: ['towing', 'engine'], vehicleTypes: ['car', 'van'], experienceYears: 9, serviceRadiusKm: 25, isAvailable: true, rating: 4.9, reviewCount: 212, garageName: 'Apex Auto Works', garageAddress: 'Indiranagar, Bengaluru', baseLat: 12.9716, baseLng: 77.5946 },
  { id: 'demo-mech-2', name: 'Sara Khan', phone: '+91 98450 22222', email: 'sara@demo.mechist', approved: true, verificationStatus: 'approved', specialties: ['battery', 'flat-tyre'], vehicleTypes: ['car', 'bike'], experienceYears: 6, serviceRadiusKm: 20, isAvailable: true, rating: 4.8, reviewCount: 167, garageName: 'Volt & Torque', garageAddress: 'HSR Layout, Bengaluru', baseLat: 12.9116, baseLng: 77.6474 },
  { id: 'demo-mech-3', name: 'Vikram Rao', phone: '+91 98450 33333', email: 'vikram@demo.mechist', approved: true, verificationStatus: 'approved', specialties: ['fuel', 'lockout'], vehicleTypes: ['car', 'bike', 'van'], experienceYears: 7, serviceRadiusKm: 30, isAvailable: true, rating: 4.7, reviewCount: 140, garageName: 'Rapid Rescue', garageAddress: 'Koramangala, Bengaluru', baseLat: 12.9352, baseLng: 77.6245 },
  { id: 'demo-mech-4', name: 'Meera Nair', phone: '+91 98450 44444', email: 'meera@demo.mechist', approved: true, verificationStatus: 'approved', specialties: ['flat-tyre', 'battery'], vehicleTypes: ['car'], experienceYears: 5, serviceRadiusKm: 15, isAvailable: false, rating: 4.9, reviewCount: 98, garageName: 'Pitstop Mobile', garageAddress: 'Whitefield, Bengaluru', baseLat: 12.9698, baseLng: 77.7500 },
  { id: 'demo-mech-5', name: 'Kabir Shah', phone: '+91 98450 55555', email: 'kabir@demo.mechist', approved: false, verificationStatus: 'pending', specialties: ['towing', 'winch'], vehicleTypes: ['truck', 'van'], experienceYears: 4, serviceRadiusKm: 40, isAvailable: true, rating: 4.5, reviewCount: 31, garageName: 'Heavy Haul', garageAddress: 'Peenya, Bengaluru', baseLat: 13.0285, baseLng: 77.5186 },
  { id: DEMO_MECHANIC_ID, name: 'Alex (You)', phone: '+91 98450 00000', email: 'alex@demo.mechist', approved: true, verificationStatus: 'approved', specialties: ['towing', 'battery', 'flat-tyre'], vehicleTypes: ['car', 'bike', 'van'], experienceYears: 8, serviceRadiusKm: 25, isAvailable: true, rating: 4.8, reviewCount: 154, garageName: 'Apex Towing', garageAddress: 'Indiranagar, Bengaluru', baseLat: 12.9750, baseLng: 77.6000 },
];

export const DEMO_VEHICLES: Vehicle[] = [
  { id: 'demo-veh-1', make: 'Tata', model: 'Nexon EV', year: 2023, plate: 'KA 05 MJ 4821', type: 'car', isDefault: true },
  { id: 'demo-veh-2', make: 'Honda', model: 'Activa 6G', year: 2022, plate: 'KA 03 KV 1107', type: 'bike' },
];

export const DEMO_REQUESTS: ServiceRequest[] = [
  { id: 'demo-req-1003', customerId: DEMO_CUSTOMER_ID, vehicleId: 'demo-veh-1', problemText: 'Flat tyre on Outer Ring Road, stepney available.', problemCategory: 'flat-tyre', status: 'requested', customerLat: 12.9716, customerLng: 77.5946, offerExpiresAt: NOW + 90_000, declinedBy: [], createdAt: NOW - 4 * 60_000, updatedAt: NOW - 4 * 60_000 },
  { id: 'demo-req-1002', customerId: DEMO_CUSTOMER_ID, vehicleId: 'demo-veh-1', problemText: 'Battery dead near MG Road metro.', problemCategory: 'battery', status: 'accepted', customerLat: 12.9757, customerLng: 77.6013, mechanicId: DEMO_MECHANIC_ID, mechanicName: 'Alex (You)', etaMin: 12, offerExpiresAt: NOW - H, declinedBy: ['demo-mech-4'], createdAt: NOW - 26 * 60_000, updatedAt: NOW - 9 * 60_000 },
  { id: 'demo-req-1001', customerId: DEMO_CUSTOMER_ID, vehicleId: 'demo-veh-2', problemText: 'Towing needed after chain snap.', problemCategory: 'towing', status: 'completed', customerLat: 12.9352, customerLng: 77.6245, mechanicId: 'demo-mech-1', mechanicName: 'Arjun Reddy', etaMin: 18, rating: 5, comment: 'Fast and careful.', amountCents: 149900, durationMin: 42, createdAt: NOW - 26 * H, updatedAt: NOW - 25 * H },
  { id: 'demo-req-1000', customerId: DEMO_CUSTOMER_ID, vehicleId: 'demo-veh-1', problemText: 'Fuel ran out on NICE Road.', problemCategory: 'fuel', status: 'cancelled', customerLat: 12.9116, customerLng: 77.6474, cancellationReason: 'Friend brought fuel.', createdAt: NOW - 50 * H, updatedAt: NOW - 49 * H },
];

export const DEMO_NOTIFICATIONS: AppNotification[] = [
  { id: 'demo-notif-3', type: 'offer', title: 'Finding you a mechanic', body: 'Flat tyre request is live in the queue.', createdAt: NOW - 4 * 60_000, read: false },
  { id: 'demo-notif-2', type: 'assigned', title: 'Alex accepted your battery request', body: 'ETA ~12 min.', requestId: 'demo-req-1002', createdAt: NOW - 9 * 60_000, read: false },
  { id: 'demo-notif-1', type: 'completed', title: 'Towing service completed', body: 'Rate Arjun to help the network.', requestId: 'demo-req-1001', createdAt: NOW - 25 * H, read: true },
];

export const DEMO_USERS: UserSummary[] = [
  { id: DEMO_CUSTOMER_ID, email: 'zaid@demo.mechist', displayName: 'Zaid (demo)', role: 'customer', createdAt: NOW - 90 * 24 * H },
  { id: DEMO_MECHANIC_ID, email: 'alex@demo.mechist', displayName: 'Alex (demo)', role: 'mechanic', createdAt: NOW - 80 * 24 * H },
  { id: 'demo-admin', email: 'ops@demo.mechist', displayName: 'Control Room (demo)', role: 'admin', createdAt: NOW - 200 * 24 * H },
];
