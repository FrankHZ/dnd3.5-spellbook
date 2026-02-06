import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function LevelSelector({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
}) {
  const { t } = useTranslation("spell-browse");
  const level = value;

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="font-medium">{t("Level")}</div>

      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }, (_, i) => (
          <Button
            key={i}
            type="button"
            variant={level === i ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(i)}
            className={cn("justify-center")}
          >
            {i}
          </Button>
        ))}
      </div>

      {level === null && (
        <div className="text-sm text-destructive">
          {t("Select a spell level (0-9).")}
        </div>
      )}
    </div>
  );
}
