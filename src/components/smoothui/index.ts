/**
 * MECHIST — SmoothUI-style building blocks.
 *
 * Hand-rolled components inspired by the SmoothUI registry (siri-orb,
 * magnetic-button, animated-input, animated-tabs, infinite-slider,
 * dynamic-island, glow-hover-card, reveal-text, scroll-reveal,
 * smooth-button, shine-text). Each honors prefers-reduced-motion and
 * uses MECHIST design tokens (azure/aqua/iris palette).
 *
 * These coexist with magicui/, unlumen-ui/, and the in-house ui/
 * primitives — they are *different* primitives, not duplicates.
 */
export { SiriOrb, type SiriOrbProps } from './siri-orb';
export { MagneticButton, type MagneticButtonProps } from './magnetic-button';
export { AnimatedInput, type AnimatedInputProps } from './animated-input';
export { AnimatedTabs, type AnimatedTabsProps, type AnimatedTab } from './animated-tabs';
export { InfiniteSlider, type InfiniteSliderProps } from './infinite-slider';
export { DynamicIsland, type DynamicIslandProps, type DynamicIslandActivity } from './dynamic-island';
export { GlowHoverCard, type GlowHoverCardProps } from './glow-hover-card';
export { RevealText, type RevealTextProps } from './reveal-text';
export { ScrollReveal, type ScrollRevealProps } from './scroll-reveal';
export { SmoothButton, type SmoothButtonProps } from './smooth-button';
export { ShineText, type ShineTextProps } from './shine-text';