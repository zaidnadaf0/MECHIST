/**
 * @vitest-environment node
 *
 * Batch 6 — deterministic ML fallback contract.
 *
 * The production ranking pipeline is ML API -> baseline -> distance, and
 * the baseline must be a pure function of its inputs: same candidates in,
 * same order out, no NaN, no throws. These tests pin that contract plus
 * the deterministic feature derivations (urgency, vehicle match).
 */
import { describe, it, expect } from 'vitest';
import {
  rankMechanicsSync,
  urgencyForCategory,
  vehicleMatchFor,
  type RankCandidate,
} from './mlRank';
import type { MechanicProfile } from './mechanic';

function mech(over: Partial<MechanicProfile> & { id: string }): MechanicProfile {
  return {
    name: 'Test Mechanic',
    approved: true,
    specialties: [],
    isAvailable: true,
    ...over,
  };
}

function cand(id: string, distanceKm: number, rating?: number): RankCandidate {
  return {
    mechanic: mech({ id, rating }),
    distanceKm,
    etaMin: Math.max(1, Math.round(distanceKm)),
    specialtyMatch: 1,
    vehicleMatch: 1,
    withinRadius: 1,
  };
}

describe('rankMechanicsSync (deterministic baseline)', () => {
  it('prefers closer, higher-rated mechanics', () => {
    const out = rankMechanicsSync([
      cand('far', 20, 5.0),
      cand('near', 2, 4.0),
    ]);
    expect(out[0].mechanic.id).toBe('near');
  });

  it('is deterministic across runs', () => {
    const input = [cand('a', 5, 4.5), cand('b', 3, 4.0), cand('c', 12, 4.9)];
    const first = rankMechanicsSync(input).map((c) => c.mechanic.id);
    const second = rankMechanicsSync(input).map((c) => c.mechanic.id);
    expect(first).toEqual(second);
  });

  it('never returns NaN scores and never throws on sparse profiles', () => {
    const sparse: RankCandidate = {
      mechanic: mech({ id: 'sparse', rating: undefined, reviewCount: undefined }),
      distanceKm: 0,
      etaMin: 0,
      specialtyMatch: 0,
      vehicleMatch: 0,
      withinRadius: 0,
    };
    expect(() => rankMechanicsSync([sparse, cand('x', 1, 4.0)])).not.toThrow();
  });

  it('returns short lists untouched', () => {
    expect(rankMechanicsSync([])).toEqual([]);
    const one = [cand('solo', 4, 4.4)];
    expect(rankMechanicsSync(one)).toEqual(one);
  });
});

describe('urgencyForCategory', () => {
  it('marks stranding categories high, everything else medium', () => {
    expect(urgencyForCategory('tow')).toBe('high');
    expect(urgencyForCategory('engine')).toBe('high');
    expect(urgencyForCategory('battery')).toBe('medium');
    expect(urgencyForCategory('flat-tyre')).toBe('medium');
    expect(urgencyForCategory('other')).toBe('medium');
    expect(urgencyForCategory(undefined)).toBe('medium');
  });
});

describe('vehicleMatchFor', () => {
  it('treats mechanics with no listed types as generalists', () => {
    expect(vehicleMatchFor('car', undefined)).toBe(1);
    expect(vehicleMatchFor('car', [])).toBe(1);
  });

  it('matches on token overlap (incl. bike/motorcycle alias)', () => {
    expect(vehicleMatchFor('bike', ['motorcycle'])).toBe(1);
    expect(vehicleMatchFor('car', ['Car', 'SUV'])).toBe(1);
    expect(vehicleMatchFor('truck', ['car'])).toBe(0);
  });
});
