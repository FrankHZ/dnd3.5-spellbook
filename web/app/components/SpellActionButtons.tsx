import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useCollections } from "~/state/collections-state";

export function SpellActionButtons({
  spellId,
  orientation = "horizontal",
  className,
}: {
  spellId: number;
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  const { spellbook, prepared } = useCollections();
  const { t } = useTranslation(["collections"]);
  const inFav = spellbook.isInDefault(spellId);
  const favoriteActionLabel = inFav
    ? t("Remove from favorites")
    : t("Add to favorites");

  function onToggleFavorite() {
    spellbook.toggleDefault(spellId);
    toast.success(favoriteActionLabel);
  }

  function onPrepare() {
    prepared.add(spellId);
    toast.success(t("Added to Prepared!"));
  }

  return (
    <div
      className={cn(
        "shrink-0 flex",
        orientation === "horizontal"
          ? "items-center gap-1"
          : "flex-col items-end gap-2",
        className,
      )}
    >
      <Button
        size="icon"
        variant="ghost"
        onClick={onToggleFavorite}
        aria-label={favoriteActionLabel}
      >
        <Heart
          className={cn(
            "h-4 w-4",
            inFav ? "fill-red-500 stroke-red-500" : "stroke-muted-foreground",
          )}
        />
      </Button>

      <Button variant="outline" size="sm" onClick={onPrepare}>
        {t("Prepare", { ns: "collections" })}
      </Button>
    </div>
  );
}
