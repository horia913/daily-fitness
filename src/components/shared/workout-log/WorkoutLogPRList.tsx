import { Trophy } from "lucide-react";
import { formatPersonalRecordCaption, formatPersonalRecordImprovementSuffix } from "@/lib/personalRecordDisplay";
import type { WorkoutLogPersonalRecord } from "@/types/workoutLog";

type Props = { records: WorkoutLogPersonalRecord[] };

export function WorkoutLogPRList({ records }: Props) {
  if (!records.length) return null;
  return (
    <div className="fc-card-shell fc-card-shell--warning p-3">
      <h3 className="text-sm uppercase tracking-wider mb-2 flex items-center gap-1.5 font-bold fc-text-primary">
        <Trophy className="w-4 h-4 text-[color:var(--fc-status-warning)] shrink-0" />
        PRs this session
      </h3>
      <div className="space-y-2">
        {records.map((pr) => {
          const caption = formatPersonalRecordCaption(pr.recordType, pr.recordValue, pr.recordUnit);
          const suffix = pr.previousRecordValue != null
            ? formatPersonalRecordImprovementSuffix(pr.recordType, pr.recordValue - pr.previousRecordValue, pr.recordUnit)
            : "";
          return (
            <div key={pr.id} className="flex items-center justify-between gap-2 py-2 px-2 rounded-lg bg-[color:var(--fc-surface-sunken)] border border-[color:var(--fc-glass-border)]">
              <div>
                <p className="text-xs font-semibold fc-text-primary">{pr.exerciseName}</p>
                <p className="text-[10px] fc-text-dim capitalize">{pr.recordType.replace(/_/g, " ")}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold font-mono fc-text-primary tabular-nums">{caption}</p>
                {suffix ? <p className="text-[10px] font-medium text-[color:var(--fc-status-success)]">{suffix}</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
