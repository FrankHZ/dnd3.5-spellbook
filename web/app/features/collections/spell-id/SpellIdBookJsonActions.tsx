import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { getSpellsBatch } from "~/api/spells";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useCollections } from "~/state/collections-state";
import type { SpellIdBook } from "~/storage/collections.type";

import {
  downloadSpellIdBookExport,
  parseSpellIdBookImport,
} from "./spell-id-json";

type SpellIdImportMode = "merge" | "replace";

export function SpellIdBookJsonActions({ book }: { book: SpellIdBook }) {
  const { t } = useTranslation("collections");
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<SpellIdImportMode>("replace");
  const { spellIdBook } = useCollections();

  const openImportPicker = (mode: SpellIdImportMode) => {
    if (isImporting) return;
    setImportMode(mode);
    importInputRef.current?.click();
  };

  const onImportFile = async (file: File) => {
    setIsImporting(true);
    try {
      const text = await file.text();
      let parsedRaw: unknown;
      try {
        parsedRaw = JSON.parse(text);
      } catch {
        throw new Error(t("import.invalid-json"));
      }

      const parsed = parseSpellIdBookImport(parsedRaw);
      const importIds = parsed.spellIds;
      const batch = importIds.length > 0 ? await getSpellsBatch(importIds) : null;
      const missingSpellIdSet = new Set(batch?.missingIds ?? []);
      const validSpellIds = importIds.filter(
        (spellId) => !missingSpellIdSet.has(spellId),
      );
      const existingSpellIdSet = new Set(book.spellIds);
      const alreadyExisted = validSpellIds.filter((spellId) =>
        existingSpellIdSet.has(spellId),
      ).length;
      const addedSpellIds = validSpellIds.length - alreadyExisted;

      const nextSpellIds =
        importMode === "merge" ? [...book.spellIds, ...validSpellIds] : validSpellIds;

      spellIdBook.setSpellIds(book.id, nextSpellIds);
      const missingSpellIds = [...(batch?.missingIds ?? [])].sort((a, b) => a - b);
      const description = [
        importMode === "merge"
          ? `${t("import.added-spell-ids")} ${addedSpellIds}`
          : `${t("import.imported-spell-ids")} ${validSpellIds.length}`,
        importMode === "merge"
          ? `${t("import.already-existed")} ${alreadyExisted}`
          : null,
        `${t("import.invalid-entries-skipped")} ${parsed.invalidEntriesCount}`,
        `${t("import.missing-spell-ids")} ${
          missingSpellIds.length > 0 ? missingSpellIds.join(", ") : t("common.none")
        }`,
      ]
        .filter(Boolean)
        .join(" | ");

      toast.success(t("import.complete-title"), { description });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("import.failed-description");
      toast.error(t("import.failed-title"), { description: msg });
    } finally {
      setIsImporting(false);
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  };

  const onExport = () => {
    downloadSpellIdBookExport(book);
    toast.success(t("export.json"), {
      description: t("export.current-json-description"),
    });
  };

  const onClear = () => {
    spellIdBook.setSpellIds(book.id, []);
    toast.success(t("actions.clear"), {
      description: t("collection.cleared"),
    });
  };

  return (
    <>
      <Input
        ref={importInputRef}
        className="hidden"
        type="file"
        accept=".json,application/json"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          if (!file) return;
          void onImportFile(file);
        }}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="xs"
            variant="outline"
            onClick={onExport}
            disabled={isImporting}
          >
            {t("export.json")}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {t("export.current-json-description")}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="xs"
            variant="outline"
            onClick={() => openImportPicker("merge")}
            disabled={isImporting}
          >
            {isImporting && importMode === "merge"
              ? t("import.in-progress")
              : t("import.merge")}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {t("import.merge-description")}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="xs"
            variant="destructive"
            onClick={() => openImportPicker("replace")}
            disabled={isImporting}
          >
            {isImporting && importMode === "replace"
              ? t("import.in-progress")
              : t("import.replace")}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {t("import.replace-description")}
        </TooltipContent>
      </Tooltip>
      <Button
        size="xs"
        variant="destructive"
        onClick={onClear}
        disabled={isImporting || book.spellIds.length === 0}
      >
        {t("actions.clear")}
      </Button>
    </>
  );
}
