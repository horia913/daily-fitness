export function coachTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

export function coachHomeDateLine(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function statValueColor(
  key: "needsAttention" | "monitor" | "onTrack" | "trained" | "checkedIn",
  value: number,
): string | undefined {
  if (value <= 0) {
    if (key === "needsAttention" || key === "monitor") {
      return "var(--fc-text-subtle)";
    }
    return undefined;
  }
  if (key === "needsAttention") return "var(--fc-status-error)";
  if (key === "monitor") return "var(--fc-status-warning)";
  if (key === "onTrack") return "var(--fc-status-success)";
  return undefined;
}
