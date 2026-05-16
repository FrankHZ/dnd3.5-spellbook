import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function LevelSelector({
  value,
  onChange,
  allowAnyLevel = false,
}: {
  value: number | "all" | null;
  onChange: (next: number | "all" | null) => void;
  allowAnyLevel?: boolean;
}) {
  const { t } = useTranslation("spell-browse");
  const level = value;

  return (
    <div className="space-y-3">
      <div className="font-medium">{t("Level")}</div>
      {allowAnyLevel && (
        <Button
          type="button"
          variant={level === null ? "default" : "outline"}
          size="sm"
          className="w-full justify-center"
          onClick={() => onChange(null)}
        >
          {t("Any Level")}
        </Button>
      )}
      <Button
        type="button"
        variant={level === "all" ? "default" : "outline"}
        size="sm"
        className="w-full justify-center"
        onClick={() => onChange("all")}
      >
        {t("All Levels")}
      </Button>
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

      {!allowAnyLevel && level === null && (
        <div className="text-sm text-destructive">
          {t("Select a spell level (0-9).")}
        </div>
      )}
    </div>
  );
}
