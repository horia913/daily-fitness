import confetti from "canvas-confetti";

export const PR_CELEBRATION_CONFETTI_COLORS = [
  "#FFD700",
  "#FFFFFF",
  "#22D3EE",
  "#EC4899",
  "#10B981",
];

type BurstOptions = {
  /** Use when overlay z-index is very high (e.g. achievement modal at 99999). */
  zIndex?: number;
};

/**
 * canvas-confetti: multi-burst (center, sides, follow-ups, upward pop, sparkle ring).
 * Fires synchronously for the first burst; call from useLayoutEffect for instant feedback.
 * Returns timeout ids for cleanup on unmount.
 */
export function fireCelebrationConfettiBurst(
  colors: string[],
  options?: BurstOptions,
): number[] {
  const z = options?.zIndex;
  const withZ = <T extends Record<string, unknown>>(o: T) =>
    z != null ? { ...o, zIndex: z } : o;

  const timeouts: number[] = [];
  const base = {
    colors,
    ticks: 240,
    gravity: 0.82,
    decay: 0.9,
    scalar: 1.05,
  } as const;

  confetti(
    withZ({
      ...base,
      particleCount: 95,
      spread: 82,
      startVelocity: 42,
      origin: { x: 0.5, y: 0.28 },
    }),
  );

  requestAnimationFrame(() => {
    confetti(
      withZ({
        ...base,
        particleCount: 55,
        angle: 58,
        spread: 58,
        startVelocity: 36,
        origin: { x: 0.12, y: 0.48 },
      }),
    );
    confetti(
      withZ({
        ...base,
        particleCount: 55,
        angle: 122,
        spread: 58,
        startVelocity: 36,
        origin: { x: 0.88, y: 0.48 },
      }),
    );
  });

  timeouts.push(
    window.setTimeout(() => {
      confetti(
        withZ({
          ...base,
          particleCount: 70,
          spread: 105,
          startVelocity: 38,
          origin: { x: 0.5, y: 0.22 },
          scalar: 1.12,
        }),
      );
    }, 140),
  );

  timeouts.push(
    window.setTimeout(() => {
      confetti(
        withZ({
          ...base,
          particleCount: 45,
          angle: 90,
          spread: 70,
          startVelocity: -22,
          origin: { x: 0.5, y: 0.92 },
          gravity: 1.05,
        }),
      );
    }, 400),
  );

  timeouts.push(
    window.setTimeout(() => {
      confetti(
        withZ({
          ...base,
          particleCount: 35,
          spread: 360,
          startVelocity: 28,
          origin: { x: 0.5, y: 0.35 },
          scalar: 0.9,
        }),
      );
    }, 650),
  );

  return timeouts;
}
