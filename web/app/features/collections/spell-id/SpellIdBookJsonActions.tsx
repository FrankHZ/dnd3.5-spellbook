import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { getSpellsBatch } from "~/api/spells";
import { Button } from "~/components/ui/button";
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
        throw new Error(t("Invalid JSON file."));
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
          ? `${t("Added spellIds:")} ${addedSpellIds}`
          : `${t("Imported spellIds:")} ${validSpellIds.length}`,
        importMode === "merge"
          ? `${t("Already existed:")} ${alreadyExisted}`
          : null,
        `${t("Invalid entries skipped:")} ${parsed.invalidEntriesCount}`,
        `${t("Missing spellIds:")} ${
          missingSpellIds.length > 0 ? missingSpellIds.join(", ") : t("none")
        }`,
      ]
        .filter(Boolean)
        .join(" | ");

      toast.success(t("Import complete"), { description });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("Import failed.");
      toast.error(t("Import failed"), { description: msg });
    } finally {
      setIsImporting(false);
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  };

  const onExport = () => {
    downloadSpellIdBookExport(book);
    toast.success(t("Export JSON"), {
      description: t("Export current collection as JSON."),
    });
  };

  const onClear = () => {
    spellIdBook.setSpellIds(book.id, []);
    toast.success(t("Clear"), {
      description: t("Collection cleared."),
    });
  };

  return (
    <>
      <input
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
            {t("Export JSON")}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {t("Export current collection as JSON.")}
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
              ? t("Importing...")
              : t("Import Merge")}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {t("Import adds new spellIds and ignores duplicates.")}
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
              ? t("Importing...")
              : t("Import Replace")}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {t("Import replaces the current collection.")}
        </TooltipContent>
      </Tooltip>
      <Button
        size="xs"
        variant="destructive"
        onClick={onClear}
        disabled={isImporting || book.spellIds.length === 0}
      >
        {t("Clear")}
      </Button>
    </>
  );
}
