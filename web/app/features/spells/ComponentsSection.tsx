import type { SpellComponents } from "@dnd/contracts";
import { Badge } from "~/components/ui/badge";

export default function ComponentsSection({
  components,
}: {
  components: SpellComponents;
}) {
  const chips = [
    components.V && "V",
    components.S && "S",
    components.M && "M",
    components.AF && "AF",
    components.DF && "DF",
    components.XP && "XP",
    components.metabreath && "Metabreath",
    components.truename && "Truename",
    components.corrupt && "Corrupt",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-2">
      <div className="font-medium">Components</div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {chips.map((c) => (
            <Badge key={c} variant="outline" className="text-xs">
              {c}
            </Badge>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">—</div>
      )}

      {components.extra && components.extra.trim().length > 0 && (
        <div className="text-sm text-muted-foreground">{components.extra}</div>
      )}
    </div>
  );
}
