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
      <div className="font-medium">{t("level.title")}</div>
      {allowAnyLevel && (
        <Button
          type="button"
          variant={level === null ? "default" : "outline"}
          size="sm"
          className="w-full justify-center"
          onClick={() => onChange(null)}
        >
          {t("level.any-level")}
        </Button>
      )}
      <Button
        type="button"
        variant={level === "all" ? "default" : "outline"}
        size="sm"
        className="w-full justify-center"
        onClick={() => onChange("all")}
      >
        {t("level.all-levels")}
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
          {t("validation.select-level")}
        </div>
      )}
    </div>
  );
}
