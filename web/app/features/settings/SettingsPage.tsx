import { usePersistedState } from "~/state/persisted-state";
import PrestigeToggle from "~/features/settings/PrestigeToggle";
import RulebookSelector from "~/features/settings/RulebookSelector";

export default function SettingsPage() {
  const { state } = usePersistedState();

  return (
    <div className="p-4 space-y-4 max-w-2xl">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Settings</h2>
        <div className="text-sm text-muted-foreground">
          Settings are stored locally (MVP).
        </div>
      </div>

      <PrestigeToggle />
      <RulebookSelector />

      <div className="text-xs text-muted-foreground">
        storageVersion: {state.storageVersion}
      </div>
    </div>
  );
}
