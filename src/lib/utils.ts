// MECHIST v0.1 — typed helpers used across the app.
import { clsx, type ClassValue as ClsxClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassValue[]
  | { [key: string]: boolean | null | undefined };

export function cx(...inputs: ClassValue[]): string {
  const out: string[] = [];

  const walk = (v: ClassValue): void => {
    if (!v && v !== 0) return;

    if (typeof v === "string" || typeof v === "number") {
      out.push(String(v));
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (typeof v === "object") {
      for (const k of Object.keys(v)) {
        if (v[k]) out.push(k);
      }
    }
  };

  inputs.forEach(walk);
  return out.join(" ");
}

export function cn(...inputs: ClsxClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function cssVar(name: string, el: Element | null = null): string {
  const target = el ?? document.documentElement;
  return getComputedStyle(target).getPropertyValue(name).trim();
}

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1440,
} as const;

export type Breakpoint = keyof typeof breakpoints;