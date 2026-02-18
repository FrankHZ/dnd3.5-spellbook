import { Link } from "react-router";
import { ExternalLink, Pencil, StickyNote, Trash2 } from "lucide-react";
import type { SpellItemView } from "@dnd/contracts";
import type { PreparedEntry } from "~/storage/collections.type";
import { useCollections } from "~/state/collections-state";
import { useAppI18n } from "~/i18n/useAppI18n";
import { cn } from "~/lib/utils";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/components/ui/hover-card";

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
  const hasNote = !!entry.notes?.trim();

  const [noteOpen, setNoteOpen] = useState(false);
  const [draftNote, setDraftNote] = useState(entry.notes ?? "");

  const openNote = () => {
    setDraftNote(entry.notes ?? "");
    setNoteOpen(true);
  };

  const saveNote = () => {
    preparedBook.setEntry(bookId, entry.entryId, { notes: draftNote });
    setNoteOpen(false);
  };

  const bg =
    entry.state === "used"
      ? "bg-red-200/80 hover:bg-red-200"
      : entry.state === "reserved"
        ? "bg-amber-100 hover:bg-amber-200"
        : "bg-emerald-50 hover:bg-emerald-100";

  const onToggle = () => {
    if (mode == "normal")
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
      title={spellName}
    >
      {/* Bigger used indicator */}
      {mode === "normal" && (
        <div
          className={cn(
            "h-4 w-4 shrink-0 rounded border",
            entry.state === "used"
              ? "bg-red-600 border-red-700"
              : "bg-white border-slate-300",
          )}
        />
      )}

      {/* Spell name text (NOT a link) */}
      <div className="min-w-0 flex-1 truncate font-medium">{spellName}</div>

      {/* Note icon */}
      {hasNote && (
        <HoverCard openDelay={150} closeDelay={100}>
          <HoverCardTrigger asChild>
            <span
              className="shrink-0 text-slate-600"
              onClick={(e) => e.stopPropagation()}
            >
              <StickyNote className="h-4 w-4" />
            </span>
          </HoverCardTrigger>

          <HoverCardContent
            className="w-80 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-medium mb-1">{spellName}</div>
            <div className="whitespace-pre-wrap wrap-break-word text-muted-foreground">
              {entry.notes}
            </div>
          </HoverCardContent>
        </HoverCard>
      )}

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
          {/* Note editor */}
          <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
            <DialogTrigger asChild>
              <button
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-slate-900 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  openNote();
                }}
                title="Edit note"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </DialogTrigger>

            <DialogContent
              // stop propagation so it doesn't affect parent handlers
              onClick={(e) => e.stopPropagation()}
              className="sm:max-w-lg"
            >
              <DialogHeader>
                <DialogTitle>Notes</DialogTitle>
              </DialogHeader>

              <div className="space-y-2">
                <div className="text-sm font-medium">{spellName}</div>
                <textarea
                  className="w-full rounded-md border p-2 text-sm"
                  rows={6}
                  placeholder="Add notes (metamagic, reminders, etc.)"
                  value={draftNote}
                  onChange={(e) => setDraftNote(e.target.value)}
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNoteOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={saveNote}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Edit-only remove icon */}
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
