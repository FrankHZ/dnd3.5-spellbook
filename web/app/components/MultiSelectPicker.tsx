import { X } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { Button } from "~/components/ui/button";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "~/components/ui/combobox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

export type PickerItem = {
  id: number;
  name: string;
  group?: string; // e.g. "Base Classes", "Prestige Classes"
};

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export function MultiSelectPicker(props: {
  title: string;
  placeholder?: string;
  items: PickerItem[];
  selectedIds: number[];
  onChange: (nextIds: number[]) => void;
  // optional: control how badges look
  badgeVariant?: "secondary" | "outline" | "default";
}) {
  const {
    title,
    placeholder,
    items,
    selectedIds,
    onChange,
    badgeVariant = "secondary",
  } = props;

  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState("");

  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedItems = React.useMemo(() => {
    const map = new Map(items.map((i) => [i.id, i]));
    return selectedIds.map((id) => map.get(id)).filter(Boolean) as PickerItem[];
  }, [items, selectedIds]);
  const maxInlineChips = 2;

  const filteredItems = React.useMemo(() => {
    const q = normalize(filter);
    if (!q) return items;
    return items.filter((i) => normalize(i.name).includes(q));
  }, [items, filter]);

  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t("picker.filter-placeholder");

  // group in dialog
  const groups = React.useMemo(() => {
    const m = new Map<string, PickerItem[]>();
    for (const it of filteredItems) {
      const g = it.group ?? t("picker.all");
      const arr = m.get(g) ?? [];
      arr.push(it);
      m.set(g, arr);
    }
    return Array.from(m.entries());
  }, [filteredItems, t]);

  function toggle(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  }

  function remove(id: number) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  function clearAll() {
    onChange([]);
  }

  const anchor = useComboboxAnchor();
  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium">{title}</div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              {t("actions.clear")}
            </Button>
          )}

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                {t("picker.view-all")}
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
              </DialogHeader>
              <Command>
                <CommandInput
                  placeholder={resolvedPlaceholder}
                  value={filter}
                  onValueChange={setFilter}
                />
                <CommandList className="max-h-[60vh]">
                  <CommandEmpty>{t("picker.no-matches")}</CommandEmpty>

                  {groups.map(([groupName, groupItems]) => (
                    <CommandGroup key={groupName} heading={groupName}>
                      {groupItems.map((it) => {
                        const checked = selectedSet.has(it.id);
                        return (
                          <CommandItem
                            key={it.id}
                            onSelect={() => toggle(it.id)}
                            className="flex items-center justify-between"
                          >
                            <span className="truncate">{it.name}</span>
                            {checked && (
                              <span className="text-xs text-muted-foreground">
                                {t("picker.selected")}
                              </span>
                            )}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>

              <div className="pt-2 flex justify-end">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  {t("actions.done")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Combobox multiple autoHighlight items={items} value={selectedItems}>
        <ComboboxChips ref={anchor} className="w-full max-w-xs">
          <ComboboxValue>
            {(values) => (
              <React.Fragment>
                {(values as PickerItem[])
                  .slice(0, maxInlineChips)
                  .map((value: PickerItem) => (
                    <ComboboxChip
                      key={value.id}
                      showRemove={false}
                      className="max-w-full"
                    >
                      <span className="max-w-32 truncate sm:max-w-40">
                        {value.name}
                      </span>
                      <Button
                        className="ml-1"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => remove(value.id)}
                        aria-label={t("actions.remove-name", {
                          name: value.name,
                        })}
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </ComboboxChip>
                  ))}
                {values.length > maxInlineChips && (
                  <ComboboxChip showRemove={false}>
                    {t("picker.more-selected", {
                      count: values.length - maxInlineChips,
                    })}
                    <Button
                      className="ml-1"
                      variant="ghost"
                      size="icon-xs"
                      onClick={clearAll}
                      aria-label={t("actions.clear")}
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </ComboboxChip>
                )}
                <ComboboxChipsInput placeholder={resolvedPlaceholder} />
              </React.Fragment>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>{t("picker.no-items")}</ComboboxEmpty>
          <ComboboxList>
            {(item: PickerItem) => (
              <ComboboxItem
                key={item.id}
                value={item}
                onClick={() => toggle(item.id)}
              >
                {item.name}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
