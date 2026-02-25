import { useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getSpellsBatch } from "~/api/spells";
import { Button } from "~/components/ui/button";
import { useCollections } from "~/state/collections-state";

import { getBook } from "~/storage/collections";
import type { PreparedBook } from "~/storage/collections.type";
import { SpellIdBookDetail } from "./SpellIdBookDetail";
import { PreparedBookDetail } from "./prepared/PreparedBookDetail";
import { getCollectionDisplayName } from "./collection-display-name";
import {
  downloadPreparedCollectionExport,
  parsePreparedCollectionImport,
} from "./prepared/prepared-json-export";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

export default function SpellbookDetailPage() {
  const { t } = useTranslation("collections");
  const { t: tDefault } = useTranslation("collections-default");
  const { id } = useParams();
  const bookId = id ?? "";
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<{
    importedEntries: number;
    invalidEntries: number;
    missingSpellIds: number[];
  } | null>(null);

  const { collections, preparedBook } = useCollections();
  const book = getBook(collections, bookId) ?? null;

  if (!book) {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <div className="rounded-md border p-3">
          <div className="font-medium">{t("Spellbook not found")}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {t("Unknown book id: {{bookId}}", { bookId })}
          </div>
        </div>
      </div>
    );
  }

  const isPreparedBook = book.kind === "prepared";

  const openImportPicker = () => {
    if (isImporting || !isPreparedBook) return;
    setImportError(null);
    setImportSummary(null);
    importInputRef.current?.click();
  };

  const onImportFile = async (file: File) => {
    if (!isPreparedBook) return;
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
      const uniqueSpellIds = Array.from(
        new Set(parsed.entries.map((e) => e.spellId)),
      );
      const batch = await getSpellsBatch(uniqueSpellIds);
      const missingSpellIdSet = new Set(batch.missingIds);
      const importedEntries = parsed.entries.filter(
        (e) => !missingSpellIdSet.has(e.spellId),
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
    if (!isPreparedBook) return;
    downloadPreparedCollectionExport(book as PreparedBook);
  };

  return (
    <div className="p-4 space-y-4 max-w-8xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">
            {getCollectionDisplayName(book, tDefault)}
          </h1>
        </div>

        <div className="flex items-center gap-2">
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
                disabled={isImporting || !isPreparedBook}
              >
                {t("Export JSON")}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isPreparedBook
                ? t("Export current collection as JSON.")
                : t("JSON import/export is not implemented for this book type yet.")}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="xs"
                variant="destructive"
                onClick={openImportPicker}
                disabled={isImporting || !isPreparedBook}
              >
                {isImporting ? t("Importing...") : t("Import JSON")}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isPreparedBook
                ? t("Import replaces the current collection.")
                : t("JSON import/export is not implemented for this book type yet.")}
            </TooltipContent>
          </Tooltip>

          <Link to="/spellbooks" className="text-sm underline">
            {t("Back")}
          </Link>
        </div>
      </div>

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
                {t("Invalid entries skipped:")}{" "}
                <b>{importSummary.invalidEntries}</b>
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

      {book.kind === "spellbook" && <SpellIdBookDetail book={book} />}
      {book.kind === "prepared" && <PreparedBookDetail book={book} />}
    </div>
  );
}
