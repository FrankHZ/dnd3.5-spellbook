import { Link } from "react-router";
import {
  ExternalLink,
  Lock,
  LockOpen,
  Sparkles,
  StickyNote,
  Trash2,
} from "lucide-react";
import { useMemo, type ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import type { SpellItemView } from "@dnd/contracts";
import type { PreparedEntry } from "~/storage/collections.type";
import { useCollections } from "~/state/collections-state";
import { useAppI18n } from "~/i18n/hooks/useAppI18n";
import { cn } from "~/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/components/ui/hover-card";
import { Button } from "~/components/ui/button";
import { PreparedEntryEditDialog } from "./PreparedEntryEditDialog";
import { DEFAULT_PREPARED_ROW_MIN_HEIGHT } from "./prepared-layout";
import { summarizePreparedEntry } from "./prepared-entry-summary";

const TRAILING_ACTION_BUTTON_CLASS =
  "shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:text-foreground";
const TRAILING_ICON_CLASS = "h-3 w-3";
const INFO_ICON_SLOT_CLASS =
  "inline-flex shrink-0 items-center gap-0.5 text-muted-foreground";
const TRAILING_ACTIONS_CLASS =
  "ml-auto inline-flex shrink-0 items-center gap-0.5";

function PreparedTableRowShell({
  className,
  children,
  rowMinHeight = DEFAULT_PREPARED_ROW_MIN_HEIGHT,
  ...props
}: ComponentProps<"div"> & { rowMinHeight?: string }) {
  return (
    <div
      style={{ minHeight: rowMinHeight }}
      className={cn(
        "group relative flex w-full items-center gap-1.5 px-1.5 text-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function PreparedTableEmptyCell({
  label,
  rowMinHeight,
}: {
  label: string;
  rowMinHeight?: string;
}) {
  return (
    <PreparedTableRowShell
      rowMinHeight={rowMinHeight}
      className="justify-center text-muted-foreground"
    >
      {label}
    </PreparedTableRowShell>
  );
}

export function PreparedTableCell({
  bookId,
  entry,
  spell,
  mode,
  rowMinHeight,
}: {
  bookId: string;
  entry: PreparedEntry;
  spell: SpellItemView;
  mode: "normal" | "edit";
  rowMinHeight?: string;
}) {
  const { preparedBook } = useCollections();
  const { name } = useAppI18n();
  const { t } = useTranslation("collections");
  const { t: tMeta } = useTranslation("metamagic");

  const spellName = name(spell);
  const summary = summarizePreparedEntry(entry, spellName);
  const hasNote = summary.hasNotes;
  const hasMetamagic = summary.hasMetamagic;
  const hasLevelOverride = summary.hasLevelOverride;
  const hasDisplayNameOverride = summary.hasDisplayNameOverride;
  const hasExtraInfo =
    hasDisplayNameOverride || hasMetamagic || hasLevelOverride || hasNote;
  const localizedMetamagicSummary = useMemo(() => {
    const metamagic = entry.metamagic ?? [];
    if (metamagic.length === 0) return t("None");
    return metamagic
      .map((tag) => {
        const tagName =
          tag.name?.trim() || tMeta(tag.key, { defaultValue: tag.key });
        return typeof tag.levelAdj === "number"
          ? `${tagName} (+${tag.levelAdj})`
          : tagName;
      })
      .join(", ");
  }, [entry.metamagic, t, tMeta]);

  const bg =
    entry.state === "used"
      ? "bg-red-200/80 hover:bg-red-200"
      : entry.state === "reserved"
        ? "bg-amber-100 hover:bg-amber-200"
        : "bg-emerald-50 hover:bg-emerald-100";
  const isToggleInteractive = mode === "normal" && entry.state !== "reserved";

  const onToggle = () => {
    if (!isToggleInteractive) return;
    preparedBook.setEntry(bookId, entry.entryId, {
      state: entry.state === "used" ? "ok" : "used",
    });
  };

  return (
    <PreparedTableRowShell
      rowMinHeight={rowMinHeight}
      className={cn(
        "select-none",
        isToggleInteractive ? "cursor-pointer" : "",
        bg,
      )}
      onClick={isToggleInteractive ? onToggle : undefined}
      role={isToggleInteractive ? "button" : undefined}
      tabIndex={isToggleInteractive ? 0 : undefined}
      onKeyDown={
        isToggleInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onToggle();
            }
          : undefined
      }
      title={summary.effectiveDisplayName}
    >
      {mode === "normal" && entry.state != "reserved" && (
        <div
          className={cn(
            "h-3 w-3 shrink-0 rounded border",
            entry.state === "used"
              ? "bg-red-600 border-red-700"
              : "bg-white border-slate-300",
          )}
        />
      )}

      <div className="min-w-0 flex max-w-[70%] items-center gap-1.5">
        <div className="min-w-0 truncate font-medium">
          {summary.effectiveDisplayName}
        </div>

        {hasExtraInfo && (
          <HoverCard openDelay={150} closeDelay={100}>
            <HoverCardTrigger asChild>
              <span
                className={INFO_ICON_SLOT_CLASS}
                onClick={(e) => e.stopPropagation()}
              >
                {hasMetamagic && <Sparkles className={TRAILING_ICON_CLASS} />}
                {hasNote && <StickyNote className={TRAILING_ICON_CLASS} />}
              </span>
            </HoverCardTrigger>

            <HoverCardContent
              className="w-80 space-y-3 text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b pb-2 font-medium">
                {summary.effectiveDisplayName}
              </div>

              {hasDisplayNameOverride && (
                <div className="space-y-1">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("Base Name")}
                  </div>
                  <div>{summary.baseName}</div>
                </div>
              )}

              {hasLevelOverride && (
                <div className="space-y-1">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("Level Override")}
                  </div>
                  <div>{entry.levelOverride}</div>
                </div>
              )}

              {hasMetamagic && (
                <div className="space-y-1">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("Metamagic")}
                  </div>
                  <div>{localizedMetamagicSummary}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("Total level adj: +{{adj}}", {
                      adj: summary.metamagicTotalAdj,
                    })}
                  </div>
                </div>
              )}

              {hasNote && (
                <div className="space-y-1">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("Notes")}
                  </div>
                  <div className="whitespace-pre-wrap wrap-break-word text-muted-foreground">
                    {entry.notes}
                  </div>
                </div>
              )}
            </HoverCardContent>
          </HoverCard>
        )}
      </div>

      {/* Open detail (small, does not toggle) */}
      <div className={TRAILING_ACTIONS_CLASS}>
        {mode === "normal" && (
          <Button
            asChild
            type="button"
            size="icon-xs"
            variant="ghost"
            className={TRAILING_ACTION_BUTTON_CLASS}
            aria-label={t("Open spell detail")}
          >
            <Link
              to={`/spells/${spell.id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className={TRAILING_ICON_CLASS} />
            </Link>
          </Button>
        )}

        {mode === "edit" && (
          <PreparedEntryEditDialog
            spellName={spellName}
            entry={entry}
            onSave={(patch) =>
              preparedBook.setEntry(bookId, entry.entryId, patch)
            }
          />
        )}

        {mode === "edit" && (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className={TRAILING_ACTION_BUTTON_CLASS}
            onClick={(e) => {
              e.stopPropagation();
              preparedBook.setEntry(bookId, entry.entryId, {
                state: entry.state === "reserved" ? "ok" : "reserved",
              });
            }}
            title={
              entry.state === "reserved"
                ? t("Unlock reserved")
                : t("Lock as reserved")
            }
            aria-label={
              entry.state === "reserved"
                ? t("Unlock reserved")
                : t("Lock as reserved")
            }
          >
            {entry.state === "reserved" ? (
              <Lock className={TRAILING_ICON_CLASS} />
            ) : (
              <LockOpen className={TRAILING_ICON_CLASS} />
            )}
          </Button>
        )}

        {mode === "edit" && (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              preparedBook.removeEntry(bookId, entry.entryId);
            }}
            title={t("Remove")}
            aria-label={t("Remove")}
          >
            <Trash2 className={TRAILING_ICON_CLASS} />
          </Button>
        )}
      </div>
    </PreparedTableRowShell>
  );
}
