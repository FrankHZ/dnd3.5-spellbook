import { Checkbox } from "~/components/ui/checkbox";
import { usePersistedState } from "~/state/persisted-state";

export default function PrestigeToggle() {
  const { state, setState } = usePersistedState();

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="font-medium">Classes</div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={state.includePrestige}
          onCheckedChange={(v) =>
            setState((s) => ({ ...s, includePrestige: Boolean(v) }))
          }
        />
        <span>Include prestige classes (affects Browse class list)</span>
      </label>
    </div>
  );
}
