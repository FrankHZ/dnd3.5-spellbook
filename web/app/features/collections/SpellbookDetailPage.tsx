import { useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { X } from "lucide-react";

import { getSpellsBatch } from "~/api/spells";
import { Button } from "~/components/ui/button";
import { useCollections } from "~/state/collections-state";

import { getBook } from "~/storage/collections";
import type { PreparedBook } from "~/storage/collections.type";
import { SpellIdBookDetail } from "./SpellIdBookDetail";
import { PreparedBookDetail } from "./prepared/PreparedBookDetail";
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
          <div className="font-medium">Spellbook not found</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Unknown book id: {bookId}
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
        throw new Error("Invalid JSON file.");
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
      const msg = err instanceof Error ? err.message : "Import failed.";
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
          <h1 className="text-lg font-semibold">{book.name}</h1>
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
                Export JSON
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isPreparedBook
                ? "Export current collection as JSON."
                : "JSON import/export is not implemented for this book type yet."}
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
                {isImporting ? "Importing..." : "Import JSON"}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isPreparedBook
                ? "Import replaces the current collection."
                : "JSON import/export is not implemented for this book type yet."}
            </TooltipContent>
          </Tooltip>

          <Link to="/spellbooks" className="text-sm underline">
            Back
          </Link>
        </div>
      </div>

      {importError && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-medium">Import failed</div>
              <div className="mt-1 text-muted-foreground">{importError}</div>
            </div>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label="Close import error"
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
              <div className="font-medium">Import complete</div>
              <div className="mt-1 text-muted-foreground">
                Imported entries: <b>{importSummary.importedEntries}</b>
              </div>
              <div className="text-muted-foreground">
                Invalid entries skipped: <b>{importSummary.invalidEntries}</b>
              </div>
              <div className="text-muted-foreground">
                Missing spellIds:{" "}
                <b>
                  {importSummary.missingSpellIds.length > 0
                    ? importSummary.missingSpellIds.join(", ")
                    : "none"}
                </b>
              </div>
            </div>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label="Close import summary"
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
