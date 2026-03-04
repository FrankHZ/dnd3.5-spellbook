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
import type { PreparedBook } from "~/storage/collections.type";

import {
  downloadPreparedCollectionExport,
  parsePreparedCollectionImport,
} from "./prepared-json-export";

export function PreparedBookJsonActions({ book }: { book: PreparedBook }) {
  const { t } = useTranslation("collections");
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const { preparedBook } = useCollections();

  const openImportPicker = () => {
    if (isImporting) return;
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
      const missingSpellIds = [...batch.missingIds].sort((a, b) => a - b);

      toast.success(t("Import complete"), {
        description: [
          `${t("Imported entries:")} ${importedEntries.length}`,
          `${t("Invalid entries skipped:")} ${parsed.invalidEntriesCount}`,
          `${t("Missing spellIds:")} ${
            missingSpellIds.length > 0 ? missingSpellIds.join(", ") : t("none")
          }`,
        ].join(" | "),
      });
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
    downloadPreparedCollectionExport(book);
    toast.success(t("Export JSON"), {
      description: t("Export current collection as JSON."),
    });
  };

  const onClear = () => {
    preparedBook.clear(book.id);
    toast.success(t("Clear"), {
      description: t("Collection cleared."),
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
    </>
  );
}
