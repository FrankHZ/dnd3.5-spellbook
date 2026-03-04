import { useMemo, useState } from "react";
import { Pencil, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PreparedEntry } from "~/storage/collections.type";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { cn } from "~/lib/utils";

type MetamagicTag = NonNullable<PreparedEntry["metamagic"]>[number];

const COMMON_METAMAGIC: MetamagicTag[] = [
  { key: "empower", levelAdj: 2 },
  { key: "enlarge", levelAdj: 1 },
  { key: "extend", levelAdj: 1 },
  { key: "maximize", levelAdj: 3 },
  { key: "quicken", levelAdj: 4 },
  { key: "silent", levelAdj: 1 },
  { key: "still", levelAdj: 1 },
  { key: "widen", levelAdj: 3 },
];

function normalizeOptionalText(input: string): string | undefined {
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseNonNegativeInt(input: string): number | undefined {
  if (input.trim() === "") return undefined;
  const value = Number(input);
  if (!Number.isInteger(value)) return undefined;
  if (value < 0) return 0;
  return value;
}

function buildCustomMetamagicKey(
  name: string,
  existing: MetamagicTag[],
): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const normalizedBase = base.length > 0 ? `custom:${base}` : "custom:meta";
  const keys = new Set(existing.map((x) => x.key));
  if (!keys.has(normalizedBase)) return normalizedBase;
  let i = 2;
  while (keys.has(`${normalizedBase}-${i}`)) i += 1;
  return `${normalizedBase}-${i}`;
}

export function PreparedEntryEditDialog({
  spellName,
  entry,
  onSave,
}: {
  spellName: string;
  entry: PreparedEntry;
  onSave: (patch: Partial<Omit<PreparedEntry, "entryId" | "spellId">>) => void;
}) {
  const { t } = useTranslation("collections");
  const { t: tMeta } = useTranslation("metamagic");
  const [open, setOpen] = useState(false);
  const [draftDisplayName, setDraftDisplayName] = useState(
    entry.displayNameOverride ?? "",
  );
  const [draftNotes, setDraftNotes] = useState(entry.notes ?? "");
  const [draftMetamagic, setDraftMetamagic] = useState<MetamagicTag[]>(
    entry.metamagic ?? [],
  );
  const [draftLevelOverride, setDraftLevelOverride] = useState(
    entry.levelOverride == null ? "" : String(entry.levelOverride),
  );
  const [customMetaName, setCustomMetaName] = useState("");
  const [customMetaLevelAdj, setCustomMetaLevelAdj] = useState("");

  const openDialog = () => {
    setDraftDisplayName(entry.displayNameOverride ?? "");
    setDraftNotes(entry.notes ?? "");
    setDraftMetamagic(entry.metamagic ?? []);
    setDraftLevelOverride(
      entry.levelOverride == null ? "" : String(entry.levelOverride),
    );
    setCustomMetaName("");
    setCustomMetaLevelAdj("");
    setOpen(true);
  };

  const totalMetamagicLevelAdj = useMemo(
    () =>
      draftMetamagic.reduce(
        (sum, tag) =>
          sum + (typeof tag.levelAdj === "number" ? tag.levelAdj : 0),
        0,
      ),
    [draftMetamagic],
  );

  const metamagicSummary = useMemo(() => {
    if (draftMetamagic.length === 0) return t("None");
    return draftMetamagic
      .map((m) => {
        const name = m.name?.trim() || tMeta(m.key, { defaultValue: m.key });
        if (typeof m.levelAdj === "number") return `${name} (+${m.levelAdj})`;
        return name;
      })
      .join(", ");
  }, [draftMetamagic, t, tMeta]);

  const toggleMetamagic = (tag: MetamagicTag) => {
    setDraftMetamagic((prev) => {
      const exists = prev.some((x) => x.key === tag.key);
      if (exists) return prev.filter((x) => x.key !== tag.key);
      return [...prev, tag];
    });
  };

  const addCustomMetamagic = () => {
    const name = customMetaName.trim();
    if (!name) return;
    const levelAdj = parseNonNegativeInt(customMetaLevelAdj);
    const key = buildCustomMetamagicKey(name, draftMetamagic);
    setDraftMetamagic((prev) => [
      ...prev,
      {
        key,
        name,
        levelAdj,
      },
    ]);
    setCustomMetaName("");
    setCustomMetaLevelAdj("");
  };

  const removeMetamagicByKey = (key: string) => {
    setDraftMetamagic((prev) => prev.filter((x) => x.key !== key));
  };

  const save = () => {
    const parsedLevelOverride = parseNonNegativeInt(draftLevelOverride);
    onSave({
      displayNameOverride: normalizeOptionalText(draftDisplayName),
      notes: normalizeOptionalText(draftNotes),
      metamagic: draftMetamagic.length > 0 ? draftMetamagic : undefined,
      levelOverride: parsedLevelOverride,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            openDialog();
          }}
          title={t("Edit entry")}
          aria-label={t("Edit entry")}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] overflow-y-auto sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>{spellName}</DialogTitle>
          <DialogDescription>
            {t(
              "Edit display override, metamagic tags, level override, and notes.",
            )}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="prepared-display-name">
              {t("Display Name Override")}
            </FieldLabel>
            <Input
              id="prepared-display-name"
              placeholder={t("Optional per-entry display name")}
              value={draftDisplayName}
              onChange={(e) => setDraftDisplayName(e.target.value)}
            />
            <FieldDescription>
              {t("Leave empty to use the base spell name.")}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="prepared-level-override">
              {t("Level Override")}
            </FieldLabel>
            <Input
              id="prepared-level-override"
              type="number"
              min={0}
              step={1}
              placeholder={t("0")}
              value={draftLevelOverride}
              onChange={(e) => setDraftLevelOverride(e.target.value)}
            />
            <FieldDescription>
              {t(
                "Optional final level for this entry. Leave empty to derive from base level + metamagic ({{adj}}).",
                {
                  adj: `${totalMetamagicLevelAdj >= 0 ? "+" : ""}${totalMetamagicLevelAdj}`,
                },
              )}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel>{t("Metamagic")}</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {COMMON_METAMAGIC.map((tag) => {
                const active = draftMetamagic.some((x) => x.key === tag.key);
                return (
                  <Button
                    key={tag.key}
                    type="button"
                    size="xs"
                    variant={active ? "secondary" : "outline"}
                    className={cn(active ? "border-primary text-primary" : "")}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMetamagic(tag);
                    }}
                  >
                    {tMeta(tag.key, { defaultValue: tag.key })} (+
                    {tag.levelAdj ?? 0})
                  </Button>
                );
              })}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
              <Input
                className="sm:col-span-7"
                placeholder={t("Custom metamagic name")}
                value={customMetaName}
                onChange={(e) => setCustomMetaName(e.target.value)}
              />
              <Input
                className="sm:col-span-3"
                type="number"
                min={0}
                step={1}
                placeholder={t("Adj")}
                value={customMetaLevelAdj}
                onChange={(e) => setCustomMetaLevelAdj(e.target.value)}
              />
              <Button
                type="button"
                className="sm:col-span-2"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  addCustomMetamagic();
                }}
              >
                {t("Add")}
              </Button>
            </div>
            {draftMetamagic.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {draftMetamagic.map((tag) => {
                  const label =
                    tag.name?.trim() ||
                    tMeta(tag.key, { defaultValue: tag.key });
                  return (
                    <Button
                      key={tag.key}
                      type="button"
                      size="xs"
                      variant="outline"
                      className="inline-flex bg-muted hover:bg-muted/80"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMetamagicByKey(tag.key);
                      }}
                      title={t("Remove metamagic")}
                    >
                      <span>
                        {label}
                        {typeof tag.levelAdj === "number"
                          ? ` (+${tag.levelAdj})`
                          : ""}
                      </span>
                      <X className="h-3 w-3" />
                    </Button>
                  );
                })}
              </div>
            )}
            <FieldDescription>
              {t("{{summary}}. Total level adj: +{{adj}}.", {
                summary: metamagicSummary,
                adj: totalMetamagicLevelAdj,
              })}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="prepared-notes">{t("Notes")}</FieldLabel>
            <Textarea
              id="prepared-notes"
              rows={6}
              placeholder={t("Add notes (metamagic, reminders, etc.)")}
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
            />
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("Cancel")}
          </Button>
          <Button onClick={save}>{t("Save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
