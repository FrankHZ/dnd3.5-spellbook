import { useRef, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const [importError, setImportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<{
    mode: SpellIdImportMode;
    importedSpellIds: number;
    alreadyExisted: number;
    invalidEntries: number;
    missingSpellIds: number[];
  } | null>(null);
  const { spellIdBook } = useCollections();

  const openImportPicker = (mode: SpellIdImportMode) => {
    if (isImporting) return;
    setImportMode(mode);
    setImportError(null);
    setImportSummary(null);
    importInputRef.current?.click();
  };

  const onImportFile = async (file: File) => {
    setImportError(null);
    setImportSummary(null);
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

      setImportSummary({
        mode: importMode,
        importedSpellIds: importMode === "merge" ? addedSpellIds : validSpellIds.length,
        alreadyExisted: importMode === "merge" ? alreadyExisted : 0,
        invalidEntries: parsed.invalidEntriesCount,
        missingSpellIds: [...(batch?.missingIds ?? [])].sort((a, b) => a - b),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("Import failed.");
      setImportError(msg);
    } finally {
      setIsImporting(false);
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  };

  const onExport = () => {
    downloadSpellIdBookExport(book);
  };

  const onClear = () => {
    setImportError(null);
    setImportSummary(null);
    spellIdBook.setSpellIds(book.id, []);
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

      {importError && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-medium">{t("Import failed")}</div>
              <div className="mt-1 text-muted-foreground">{importError}</div>
            </div>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label={t("Close import error")}
              onClick={() => setImportError(null)}
            >
              <X />
            </Button>
          </div>
        </div>
      )}
      {importSummary && (
        <div className="rounded-md border p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-medium">{t("Import complete")}</div>
              <div className="mt-1 text-muted-foreground">
                {importSummary.mode === "merge"
                  ? t("Added spellIds:")
                  : t("Imported spellIds:")}{" "}
                <b>{importSummary.importedSpellIds}</b>
              </div>
              {importSummary.mode === "merge" && (
                <div className="text-muted-foreground">
                  {t("Already existed:")} <b>{importSummary.alreadyExisted}</b>
                </div>
              )}
              <div className="text-muted-foreground">
                {t("Invalid entries skipped:")} <b>{importSummary.invalidEntries}</b>
              </div>
              <div className="text-muted-foreground">
                {t("Missing spellIds:")}{" "}
                <b>
                  {importSummary.missingSpellIds.length > 0
                    ? importSummary.missingSpellIds.join(", ")
                    : t("none")}
                </b>
              </div>
            </div>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label={t("Close import summary")}
              onClick={() => setImportSummary(null)}
            >
              <X />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
