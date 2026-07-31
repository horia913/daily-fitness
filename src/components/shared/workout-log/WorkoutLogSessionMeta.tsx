import { displayCoachStrengthTestNotes, isCoachStrengthTestNotes } from "@/lib/coachStrengthTest";

type Props = {
  notes: string | null;
  overallDifficultyRating: number | null;
  perceivedEffort: number | null;
  energyLevel: number | null;
  muscleFatigueLevel: number | null;
};

function Dots({ value }: { value: number | null }) {
  if (value == null || value <= 0) return null;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${
            i < value ? "bg-[color:var(--fc-accent)]" : "bg-[color:var(--fc-glass-border)]"
          }`}
        />
      ))}
      <span className="text-xs fc-text-dim">{value}/5</span>
    </div>
  );
}

export function WorkoutLogSessionMeta(props: Props) {
  const { notes, overallDifficultyRating, perceivedEffort, energyLevel, muscleFatigueLevel } = props;
  const displayNotes = isCoachStrengthTestNotes(notes)
    ? displayCoachStrengthTestNotes(notes)
    : notes;
  if (
    [displayNotes, overallDifficultyRating, perceivedEffort, energyLevel, muscleFatigueLevel].every(
      (v) => v == null,
    )
  ) {
    return null;
  }

  return (
    <div className="fc-card-shell p-3 space-y-2">
      {overallDifficultyRating != null ? <div><span className="text-xs fc-text-dim mr-2">Difficulty</span><Dots value={overallDifficultyRating} /></div> : null}
      {perceivedEffort != null ? <div><span className="text-xs fc-text-dim mr-2">Effort</span><Dots value={perceivedEffort} /></div> : null}
      {energyLevel != null ? <div><span className="text-xs fc-text-dim mr-2">Energy</span><Dots value={energyLevel} /></div> : null}
      {muscleFatigueLevel != null ? <div><span className="text-xs fc-text-dim mr-2">Fatigue</span><Dots value={muscleFatigueLevel} /></div> : null}
      {displayNotes ? (
        <div className="p-3 rounded-lg bg-[color:var(--fc-surface-sunken)] border border-[color:var(--fc-glass-border)]">
          <p className="text-xs fc-text-primary italic leading-relaxed">&ldquo;{displayNotes}&rdquo;</p>
        </div>
      ) : null}
    </div>
  );
}
