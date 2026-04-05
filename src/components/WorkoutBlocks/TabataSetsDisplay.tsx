import { BlockVariantProps } from "./types";
import { TypeBadge } from "./TypeBadge";

export function TabataSetsDisplay({ block, index }: BlockVariantProps) {
  const rounds = Number(block.parameters?.rounds ?? block.parameters?.total_sets ?? 0) || 0;
  const sets = Array.isArray(block.parameters?.tabata_sets)
    ? block.parameters.tabata_sets
    : [];

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <TypeBadge blockType="tabata" />
        <span className="text-xs text-muted-foreground">#{index + 1}</span>
      </div>
      <div className="text-sm">{rounds} rounds</div>
      <div className="text-xs text-muted-foreground">{sets.length} sets configured</div>
    </div>
  );
}
