/**
 * Canonical case-insensitive alias expected by:
 *   `src/components/unlumen-ui/blob-card.tsx`
 *   import { GlowEffect } from "@/components/ui/glow-effect";
 *
 * The real implementation lives at `./GlowEffect.tsx` (PascalCase export).
 * Vite's import-analysis is case-sensitive on Windows, so the import
 * path must literally match `glow-effect` — this file is the bridge.
 */
export { GlowEffect } from './GlowEffect';
export type { GlowEffectProps } from './GlowEffect';
