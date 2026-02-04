import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";

type PagerProps = {
  page: number; // 1-based
  pageSize: number;
  total: number;

  onPageChange: (nextPage: number) => void;

  isBusy?: boolean; // disable buttons while fetching
  className?: string;

  showRangeText?: boolean;
};

function rangeText(
  t: TFunction<"pager", undefined>,
  page: number,
  pageSize: number,
  total: number,
) {
  if (total <= 0) return t("Showing 0 of 0");
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return t("Showing {{start}}-{{end}} of {{total}}", { start, end, total });
}

export default function Pager({
  page,
  pageSize,
  total,
  onPageChange,
  isBusy = false,
  className = "",
  showRangeText = true,
}: PagerProps) {
  const hasPrev = page > 1;
  const hasNext = page * pageSize < total;
  const { t } = useTranslation("pager");

  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      {showRangeText ? (
        <div className="text-sm text-muted-foreground">
          {rangeText(t, page, pageSize, total)}
        </div>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrev || isBusy}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext || isBusy}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
