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
import type { PreparedBook } from "~/storage/collections.type";

import {
  downloadPreparedCollectionExport,
  parsePreparedCollectionImport,
} from "./prepared-json-export";

export function PreparedBookJsonActions({ book }: { book: PreparedBook }) {
  const { t } = useTranslation("collections");
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<{
    importedEntries: number;
    invalidEntries: number;
    missingSpellIds: number[];
  } | null>(null);
  const { preparedBook } = useCollections();

  const openImportPicker = () => {
    if (isImporting) return;
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

      const parsed = parsePreparedCollectionImport(parsedRaw, book.id);
      const uniqueSpellIds = Array.from(new Set(parsed.entries.map((e) => e.spellId)));
      const batch = await getSpellsBatch(uniqueSpellIds);
      const missingSpellIdSet = new Set(batch.missingIds);
      const importedEntries = parsed.entries.filter(
        (entry) => !missingSpellIdSet.has(entry.spellId),
      );

      preparedBook.replace(book.id, {
        entries: importedEntries,
        selectedClassIds: parsed.selectedClassIds,
        selectedDomainIds: parsed.selectedDomainIds,
      });

      setImportSummary({
        importedEntries: importedEntries.length,
        invalidEntries: parsed.invalidEntriesCount,
        missingSpellIds: [...batch.missingIds].sort((a, b) => a - b),
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
    downloadPreparedCollectionExport(book);
  };

  const onClear = () => {
    setImportError(null);
    setImportSummary(null);
    preparedBook.clear(book.id);
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
            variant="destructive"
            onClick={openImportPicker}
            disabled={isImporting}
          >
            {isImporting ? t("Importing...") : t("Import JSON")}
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
        disabled={isImporting || book.entries.length === 0}
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
                {t("Imported entries:")} <b>{importSummary.importedEntries}</b>
              </div>
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
