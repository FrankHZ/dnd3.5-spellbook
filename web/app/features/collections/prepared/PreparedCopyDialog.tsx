import { useMemo, useState } from "react";
import type { SpellItemView } from "@dnd/contracts";
import { useTranslation } from "react-i18next";
import type { PreparedEntry } from "~/storage/collections.type";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  buildDetailedPreparedTsv,
  buildSimplePreparedTsv,
} from "./prepared-copy";

type CopyFormat = "simple" | "detailed";

async function copyText(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard API unavailable");
  }
  await navigator.clipboard.writeText(text);
}

export function PreparedCopyDialog({
  entries,
  columns,
  byId,
  selectedClassIds,
  selectedDomainIds,
  getVisibleName,
  className,
}: {
  entries: PreparedEntry[];
  columns: PreparedEntry[][];
  byId: Map<number, SpellItemView>;
  selectedClassIds: number[];
  selectedDomainIds: number[];
  getVisibleName: (spell: SpellItemView) => string;
  className?: string;
}) {
  const { t } = useTranslation("collections");
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<CopyFormat>("detailed");
  const [aggregateRows, setAggregateRows] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  const tsv = useMemo(() => {
    if (format === "simple") {
      return buildSimplePreparedTsv({ columns, byId, getVisibleName });
    }
    return buildDetailedPreparedTsv({
      entries,
      byId,
      selectedClassIds,
      selectedDomainIds,
      aggregateRows,
      getVisibleName,
    });
  }, [
    format,
    aggregateRows,
    entries,
    columns,
    byId,
    selectedClassIds,
    selectedDomainIds,
    getVisibleName,
  ]);

  const lineCount = useMemo(
    () => (tsv.length === 0 ? 0 : tsv.split("\n").length),
    [tsv],
  );

  const onCopy = async () => {
    try {
      await copyText(tsv);
      setStatus(t("Copied {{count}} row(s) as TSV.", { count: lineCount }));
    } catch {
      setStatus(
        t("Copy failed. Browser clipboard permission may be blocked."),
      );
    }
  };

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setStatus(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className={className} size="sm" variant="outline">
          {t("Advanced Copy")}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Advanced Copy")}</DialogTitle>
          <DialogDescription>
            {t("Copy as TSV with optional detailed columns and row aggregation.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">{t("Format")}</div>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as CopyFormat)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">
                  {t("Simple table (as displayed)")}
                </SelectItem>
                <SelectItem value="detailed">
                  {t("Detailed TSV columns")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={aggregateRows}
              onCheckedChange={(checked) => setAggregateRows(checked === true)}
              disabled={format !== "detailed"}
            />
            {t("Aggregate detailed rows")}
          </label>

          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {t("Output rows: {{count}}", { count: lineCount })}
          </div>

          {status && (
            <div className="rounded-md border px-3 py-2 text-sm">{status}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Close")}
          </Button>
          <Button onClick={onCopy}>{t("Copy TSV")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
