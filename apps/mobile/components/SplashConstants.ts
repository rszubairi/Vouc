// Shared design tokens for the premium Vouch splash experience.
// Kept in one place so GoldParticles / ShimmerText / SplashScreen stay in sync.

export const COLORS = {
  black: "#050505",
  gold: "#F2650C",
  champagne: "#F7941E",
} as const;

// All durations in ms. Values mirror the animation spec:
// bg fade 700ms -> text anim 900ms -> shimmer sweep 1200ms -> exit 600ms.
export const TIMING = {
  bgFade: 700,
  // delay (from mount) before the wordmark starts fading/sliding/scaling in
  textStart: 400,
  textAnim: 900,
  shimmer: 1200,
  // how long the wordmark is held fully visible before the exit begins.
  // textStart + textAnim + hold = 2500ms, matching the "after 2.5 seconds,
  // fade out smoothly" spec for total time-to-exit-start.
  hold: 1200,
  exit: 600,
} as const;
