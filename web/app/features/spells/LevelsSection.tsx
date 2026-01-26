import type { SpellDetail } from "@dnd/contracts";

export default function LevelsSection({ spell }: { spell: SpellDetail }) {
  return (
    <div className="space-y-3">
      <div className="font-medium">Levels</div>

      {/* Class levels */}
      {(spell.classLevels?.length ?? 0) > 0 ? (
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">Classes</div>
          <div className="text-sm">
            {spell.classLevels
              .map(
                (mcl: any) =>
                  `${mcl.className} ${mcl.level}` +
                  (mcl.extra ? ` (${mcl.extra})` : "") +
                  (mcl.prestige ? ` (P)` : ""),
              )
              .join(", ")}
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          No class levels listed.
        </div>
      )}

      {/* Domain levels */}
      {(spell.domainLevels?.length ?? 0) > 0 && (
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">Domains</div>
          <div className="text-sm">
            {spell.domainLevels
              .map((dl: any) => `${dl.domainName} ${dl.level}`)
              .join(", ")}
          </div>
        </div>
      )}
    </div>
  );
}
