/**
 * MECHIST — Footer.
 *
 * Premium footer with three zones:
 *   - Brand identity + tagline + system status
 *   - Product / Platform / Company navigation columns
 *   - Compliance row (copyright, build signature, dispatch hours)
 *
 * Uses the bespoke LogoMark illustration and the design-system
 * semantic-tone badges for status indicators.
 */
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui';
import { LogoMark } from '@/components/illustrations/Illustrations';

export function Footer() {
  return (
    <footer className="relative mt-section overflow-hidden border-t border-line-soft bg-surface-1">
      <span aria-hidden className="mesh-layer opacity-40" />

      <div className="container relative grid gap-12 py-section-sm md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-lg ring-1 ring-inset ring-line-soft">
              <LogoMark className="h-full w-full" />
            </span>
            <span className="display text-h2 font-bold tracking-[-0.03em] text-fg-app">MECHIST</span>
          </div>
          <p className="mt-5 max-w-sm text-body-lg leading-relaxed text-fg-muted text-pretty">
            Roadside help, the moment it matters — vetted mechanics,
            live dispatch, and transparent timing from request to resolution.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-2">
            <Badge tone="success" live>
              All systems operational
            </Badge>
            <Badge tone="neutral" outline>24/7 dispatch</Badge>
            <Badge tone="azure" outline>v0.1 — early access</Badge>
          </div>
        </div>

        <div className="grid gap-10 sm:grid-cols-3 md:col-span-7">
          <FooterCol title="Product" hue="bg-azure-500">
            <FooterLink to="/request">Request assistance</FooterLink>
            <FooterLink to="/dashboard">Customer portal</FooterLink>
            <FooterLink to="/signup/mechanic">Become a mechanic</FooterLink>
            <FooterLink to="/admin/login">Staff sign-in</FooterLink>
          </FooterCol>
          <FooterCol title="Platform" hue="bg-aqua-500">
            <FooterLink to="/how-it-works">How it works</FooterLink>
            <FooterLink to="/map">Live map</FooterLink>
            <FooterLink to="/mechanics">Mechanic network</FooterLink>
            <FooterLink to="/#trust">Trust &amp; safety</FooterLink>
          </FooterCol>
          <FooterCol title="Company" hue="bg-iris-500">
            <FooterLink to="/#trust">About</FooterLink>
            <FooterLink to="/#trust">Trust</FooterLink>
            <FooterLink to="/#trust">Privacy</FooterLink>
            <FooterLink to="/#trust">Terms</FooterLink>
          </FooterCol>
        </div>
      </div>

      <div className="container relative flex flex-col gap-3 border-t border-line-soft py-7 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-xs text-fg-subtle">
          © {new Date().getFullYear()} MECHIST — roadside assistance, reimagined.
        </p>
        <p className="font-mono text-xs text-fg-subtle">
          Built for the moment everything goes sideways.
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, hue, children }: { title: string; hue: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${hue}`} />
        <div className="eyebrow">{title}</div>
      </div>
      <ul className="mt-4 flex flex-col gap-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        className="group inline-flex items-center gap-1 text-small text-fg-muted transition-colors hover:text-fg-app"
      >
        {children}
        <ArrowUpRight
          size={13}
          className="opacity-0 -translate-x-1 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
        />
      </Link>
    </li>
  );
}