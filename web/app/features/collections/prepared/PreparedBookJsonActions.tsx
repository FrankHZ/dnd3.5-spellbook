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

import { getCollectionImportErrorMessage } from "../collection-import";
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
        toast.error(t("import.failed-title"), {
          description: t("import.invalid-json"),
        });
        return;
      }

      const parseResult = parsePreparedCollectionImport(parsedRaw, book.id);
      if (!parseResult.ok) {
        toast.error(t("import.failed-title"), {
          description: getCollectionImportErrorMessage(parseResult.error, t),
        });
        return;
      }

      const parsed = parseResult.value;
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

      toast.success(t("import.complete-title"), {
        description: [
          `${t("import.imported-entries")} ${importedEntries.length}`,
          `${t("import.invalid-entries-skipped")} ${parsed.invalidEntriesCount}`,
          `${t("import.missing-spell-ids")} ${
            missingSpellIds.length > 0 ? missingSpellIds.join(", ") : t("common.none")
          }`,
        ].join(" | "),
      });
    } catch {
      toast.error(t("import.failed-title"), {
        description: t("import.failed-description"),
      });
    } finally {
      setIsImporting(false);
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  };

  const onExport = () => {
    downloadPreparedCollectionExport(book);
    toast.success(t("export.json"), {
      description: t("export.current-json-description"),
    });
  };

  const onClear = () => {
    preparedBook.clear(book.id);
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
            size="sm"
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
            size="sm"
            variant="destructive"
            onClick={openImportPicker}
            disabled={isImporting}
          >
            {isImporting ? t("import.in-progress") : t("import.json")}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {t("import.replace-description")}
        </TooltipContent>
      </Tooltip>
      <Button
        size="sm"
        variant="destructive"
        onClick={onClear}
        disabled={isImporting || book.entries.length === 0}
      >
        {t("actions.clear")}
      </Button>
    </>
  );
}
