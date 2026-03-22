/**
 * Tailwind class bundles for workout template cards (left border + icon well + icon color).
 * `category` is the template's `workout_templates.category` text (or display name).
 */
export function getCategoryAccent(category: string): {
  border: string;
  iconBg: string;
  text: string;
} {
  const cat = (category || "").toLowerCase();
  if (
    cat.includes("strength") ||
    cat.includes("hypertrophy") ||
    cat.includes("lower") ||
    cat.includes("upper")
  )
    return {
      border: "border-l-purple-500",
      iconBg: "bg-purple-500/20",
      text: "text-purple-400",
    };
  if (
    cat.includes("conditioning") ||
    cat.includes("hiit") ||
    cat.includes("circuit")
  )
    return {
      border: "border-l-amber-500",
      iconBg: "bg-amber-500/20",
      text: "text-amber-400",
    };
  if (
    cat.includes("mobility") ||
    cat.includes("stretch") ||
    cat.includes("flexibility")
  )
    return {
      border: "border-l-emerald-500",
      iconBg: "bg-emerald-500/20",
      text: "text-emerald-400",
    };
  if (
    cat.includes("recovery") ||
    cat.includes("rehab") ||
    cat.includes("deload")
  )
    return {
      border: "border-l-slate-400",
      iconBg: "bg-slate-400/20",
      text: "text-slate-400",
    };
  if (
    cat.includes("sprint") ||
    cat.includes("speed") ||
    cat.includes("acceleration")
  )
    return {
      border: "border-l-cyan-500",
      iconBg: "bg-cyan-500/20",
      text: "text-cyan-400",
    };
  return {
    border: "border-l-cyan-500/50",
    iconBg: "bg-cyan-500/10",
    text: "text-cyan-400",
  };
}
