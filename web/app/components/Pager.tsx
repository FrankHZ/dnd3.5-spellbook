import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "~/components/ui/pagination";
import { cn } from "~/lib/utils";

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
  if (total <= 0) return t("range.empty");
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return t("range.page", { start, end, total });
}

function buildPageTokens(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);
  const visiblePages = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const tokens: Array<number | "ellipsis"> = [];
  for (const page of visiblePages) {
    const prev = tokens.at(-1);
    if (typeof prev === "number" && page - prev > 1) {
      tokens.push("ellipsis");
    }
    tokens.push(page);
  }

  return tokens;
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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageTokens = buildPageTokens(page, totalPages);
  const { t } = useTranslation("pager");

  const goToPage = (nextPage: number) => {
    if (isBusy) return;
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    onPageChange(nextPage);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3",
        className,
      )}
    >
      {showRangeText ? (
        <div className="min-w-0 text-sm text-muted-foreground">
          {rangeText(t, page, pageSize, total)}
        </div>
      ) : null}

      <Pagination className="mx-0 w-full justify-start sm:w-auto sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationLink
              href={`?page=${Math.max(1, page - 1)}`}
              aria-label={t("actions.prev")}
              aria-disabled={!hasPrev || isBusy}
              tabIndex={!hasPrev || isBusy ? -1 : undefined}
              className={cn(
                "gap-1 px-2.5",
                (!hasPrev || isBusy) && "pointer-events-none opacity-50",
              )}
              onClick={(event) => {
                event.preventDefault();
                goToPage(page - 1);
              }}
            >
              <ChevronLeft className="size-4" />
            </PaginationLink>
          </PaginationItem>

          {pageTokens.map((token, index) => (
            <PaginationItem key={`${token}-${index}`}>
              {token === "ellipsis" ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  href={`?page=${token}`}
                  isActive={token === page}
                  aria-label={`Page ${token}`}
                  onClick={(event) => {
                    event.preventDefault();
                    goToPage(token);
                  }}
                >
                  {token}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationLink
              href={`?page=${Math.min(totalPages, page + 1)}`}
              aria-label={t("actions.next")}
              aria-disabled={!hasNext || isBusy}
              tabIndex={!hasNext || isBusy ? -1 : undefined}
              className={cn(
                "gap-1 px-2.5",
                (!hasNext || isBusy) && "pointer-events-none opacity-50",
              )}
              onClick={(event) => {
                event.preventDefault();
                goToPage(page + 1);
              }}
            >
              <ChevronRight className="size-4" />
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
