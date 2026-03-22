export const PR_TIERS = [
  { name: "Iron", color: "#9CA3AF", icon: "🪨", minMultiplier: 0 },
  { name: "Bronze", color: "#CD7F32", icon: "🥉", minMultiplier: 0.25 },
  { name: "Silver", color: "#C0C0C0", icon: "🥈", minMultiplier: 0.5 },
  { name: "Gold", color: "#FFD700", icon: "🥇", minMultiplier: 0.75 },
  { name: "Platinum", color: "#E5E4E2", icon: "💎", minMultiplier: 1.0 },
  { name: "Diamond", color: "#B9F2FF", icon: "💠", minMultiplier: 1.25 },
  { name: "Champion", color: "#9333EA", icon: "🏆", minMultiplier: 1.5 },
  { name: "Titan", color: "#DC2626", icon: "⚡", minMultiplier: 2.0 },
  { name: "Olympian", color: "#06b6d4", icon: "👑", minMultiplier: 2.5 },
] as const;

export type PRTier = (typeof PR_TIERS)[number];

export function getPRTier(weight: number, bodyWeight: number | null): PRTier {
  if (!bodyWeight || bodyWeight <= 0) {
    const absIndex = Math.min(
      Math.floor(weight / 20),
      PR_TIERS.length - 1,
    );
    return PR_TIERS[absIndex];
  }
  const multiplier = weight / bodyWeight;
  let tier: PRTier = PR_TIERS[0];
  for (const t of PR_TIERS) {
    if (multiplier >= t.minMultiplier) tier = t;
  }
  return tier;
}
