import { useEffect, useState } from 'react';

export type GeoStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable' | 'error';

export interface GeoCoords {
  lat: number;
  lng: number;
  accuracy: number;
  /** Time the browser reported the fix, in epoch ms. */
  timestamp: number;
}

export interface GeoState {
  status: GeoStatus;
  coords: GeoCoords | null;
  error: string | null;
}

const REQUEST_OPTS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 60_000,
};

/**
 * One-shot geolocation request. No auto-request — caller must invoke `request()`.
 * Continuous listeners should use useWatchPosition() with explicit opt-in.
 */
export function useGeolocation(): [GeoState, () => void] {
  const [state, setState] = useState<GeoState>({ status: 'idle', coords: null, error: null });

  const request = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({ status: 'unavailable', coords: null, error: 'Geolocation is not available in this browser.' });
      return;
    }
    setState((s) => ({ ...s, status: 'requesting', error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => setState({
        status: 'granted',
        coords: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, timestamp: pos.timestamp },
        error: null,
      }),
      (err) => setState({
        status: err.code === err.PERMISSION_DENIED ? 'denied' : err.code === err.TIMEOUT ? 'error' : 'error',
        coords: null,
        error: err.message,
      }),
      REQUEST_OPTS,
    );
  };

  useEffect(() => { /* no auto-request */ }, []);
  return [state, request];
}

export interface WatchOptions {
  /** Re-emit only when position has moved at least this many metres. */
  minDistanceM?: number;
  /** Re-emit at most once every `minIntervalMs` milliseconds. */
  minIntervalMs?: number;
  /** When false, the watcher is not started. Defaults to true for backward compat. */
  enabled?: boolean;
}

/**
 * Continuous geolocation subscription. Only starts when `enabled !== false`.
 * This keeps privacy: no background tracking unless the user explicitly
 * enables "Track My Location". Cleanup calls clearWatch on unmount or
 * when enabled flips to false.
 */
export function useWatchPosition(options: WatchOptions = {}): [GeoState, () => void] {
  const { minDistanceM = 25, minIntervalMs = 5000, enabled = true } = options;
  const [state, setState] = useState<GeoState>({ status: 'idle', coords: null, error: null });

  useEffect(() => {
    if (!enabled) {
      setState((s) => (s.status === 'requesting' ? { ...s, status: 'idle' } : s));
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({ status: 'unavailable', coords: null, error: 'Geolocation is not available in this browser.' });
      return;
    }

    let lastCoords: GeoCoords | null = null;
    let lastEmittedAt = 0;
    let watchId: number | null = null;

    setState((s) => ({ ...s, status: 'requesting', error: null }));

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const next: GeoCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        const now = Date.now();
        if (lastCoords) {
          const moved = haversineMeters(lastCoords, next);
          if (moved < minDistanceM && now - lastEmittedAt < minIntervalMs) {
            return;
          }
        }
        lastCoords = next;
        lastEmittedAt = now;
        setState({ status: 'granted', coords: next, error: null });
      },
      (err) => {
        setState({
          status: err.code === err.PERMISSION_DENIED ? 'denied' : 'error',
          coords: lastCoords,
          error: err.message,
        });
      },
      REQUEST_OPTS,
    );

    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, [minDistanceM, minIntervalMs, enabled]);

  const request = () => setState((s) => ({ ...s, status: 'requesting', error: null }));
  return [state, request];
}

const EARTH_RADIUS_M = 6_371_000;
function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
