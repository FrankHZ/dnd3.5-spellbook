import { Link } from "react-router";
import {
  ExternalLink,
  Lock,
  LockOpen,
  Sparkles,
  StickyNote,
  Trash2,
} from "lucide-react";
import type { SpellItemView } from "@dnd/contracts";
import type { PreparedEntry } from "~/storage/collections.type";
import { useCollections } from "~/state/collections-state";
import { useAppI18n } from "~/i18n/useAppI18n";
import { cn } from "~/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/components/ui/hover-card";
import { PreparedEntryEditDialog } from "./PreparedEntryEditDialog";
import { summarizePreparedEntry } from "./prepared-entry-summary";

export function PreparedTableCell({
  bookId,
  entry,
  spell,
  mode,
}: {
  bookId: string;
  entry: PreparedEntry;
  spell: SpellItemView;
  mode: "normal" | "edit";
}) {
  const { preparedBook } = useCollections();
  const { name } = useAppI18n();

  const spellName = name(spell);
  const summary = summarizePreparedEntry(entry, spellName);
  const hasNote = summary.hasNotes;
  const hasMetamagic = summary.hasMetamagic;
  const hasLevelOverride = summary.hasLevelOverride;
  const hasDisplayNameOverride = summary.hasDisplayNameOverride;
  const hasExtraInfo =
    hasDisplayNameOverride || hasMetamagic || hasLevelOverride || hasNote;

  const bg =
    entry.state === "used"
      ? "bg-red-200/80 hover:bg-red-200"
      : entry.state === "reserved"
        ? "bg-amber-100 hover:bg-amber-200"
        : "bg-emerald-50 hover:bg-emerald-100";

  const onToggle = () => {
    if (mode == "normal" && entry.state !== "reserved")
      preparedBook.setEntry(bookId, entry.entryId, {
        state: entry.state === "used" ? "ok" : "used",
      });
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2 px-3",
        "h-10 text-sm",
        "select-none",
        mode == "normal" ? "cursor-pointer" : "",
        bg,
      )}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onToggle();
      }}
      title={summary.effectiveDisplayName}
    >
      {/* Bigger used indicator */}
      {mode === "normal" && entry.state != "reserved" && (
        <div
          className={cn(
            "h-4 w-4 shrink-0 rounded border",
            entry.state === "used"
              ? "bg-red-600 border-red-700"
              : "bg-white border-slate-300",
          )}
        />
      )}

      {/* Effective display name text */}
      <div className="min-w-0 flex-1 truncate font-medium">
        {summary.effectiveDisplayName}
      </div>

      {/* Open detail (small, does not toggle) */}
      {mode === "normal" && (
        <Link
          to={`/spells/${spell.id}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-900"
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      )}

      {mode === "edit" && (
        <>
          <PreparedEntryEditDialog
            spellName={spellName}
            entry={entry}
            onSave={(patch) =>
              preparedBook.setEntry(bookId, entry.entryId, patch)
            }
          />
        </>
      )}

      {mode === "edit" && (
        <button
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-slate-900 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            preparedBook.setEntry(bookId, entry.entryId, {
              state: entry.state === "reserved" ? "ok" : "reserved",
            });
          }}
          title={
            entry.state === "reserved" ? "Unlock reserved" : "Lock as reserved"
          }
        >
          {entry.state === "reserved" ? (
            <Lock className="h-4 w-4" />
          ) : (
            <LockOpen className="h-4 w-4" />
          )}
        </button>
      )}

      {/* Extra info hover */}
      {hasExtraInfo && (
        <HoverCard openDelay={150} closeDelay={100}>
          <HoverCardTrigger asChild>
            <span
              className="shrink-0 text-slate-600 inline-flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {hasMetamagic && <Sparkles className="h-4 w-4" />}
              {hasNote && <StickyNote className="h-4 w-4" />}
            </span>
          </HoverCardTrigger>

          <HoverCardContent
            className="w-80 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-medium mb-2">{summary.effectiveDisplayName}</div>

            {hasDisplayNameOverride && (
              <div className="mb-2">
                <div className="text-xs text-muted-foreground">Base Name</div>
                <div>{summary.baseName}</div>
              </div>
            )}

            {hasLevelOverride && (
              <div className="mb-2">
                <div className="text-xs text-muted-foreground">
                  Level Override
                </div>
                <div>{entry.levelOverride}</div>
              </div>
            )}

            {hasMetamagic && (
              <div className="mb-2">
                <div className="text-xs text-muted-foreground">Metamagic</div>
                <div>{summary.metamagicSummary}</div>
                <div className="text-xs text-muted-foreground">
                  Total level adj: +{summary.metamagicTotalAdj}
                </div>
              </div>
            )}

            {hasNote && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Notes</div>
                <div className="whitespace-pre-wrap wrap-break-word text-muted-foreground">
                  {entry.notes}
                </div>
              </div>
            )}
          </HoverCardContent>
        </HoverCard>
      )}

      {mode === "edit" && (
        <button
          className="shrink-0 text-slate-600 hover:text-red-700 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            preparedBook.removeEntry(bookId, entry.entryId);
          }}
          title="Remove"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
