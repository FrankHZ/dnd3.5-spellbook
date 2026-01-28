import * as React from "react";
import { X, ChevronDown } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "~/components/ui/combobox";

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
    placeholder = "Filter...",
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

  const filteredItems = React.useMemo(() => {
    const q = normalize(filter);
    if (!q) return items;
    return items.filter((i) => normalize(i.name).includes(q));
  }, [items, filter]);

  // group in dialog
  const groups = React.useMemo(() => {
    const m = new Map<string, PickerItem[]>();
    for (const it of filteredItems) {
      const g = it.group ?? "All";
      const arr = m.get(g) ?? [];
      arr.push(it);
      m.set(g, arr);
    }
    return Array.from(m.entries());
  }, [filteredItems]);

  function toggle(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    console.log(id);
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
              Clear
            </Button>
          )}

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                View All...
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
              </DialogHeader>
              <Command>
                <CommandInput
                  placeholder={placeholder}
                  value={filter}
                  onValueChange={setFilter}
                />
                <CommandList className="max-h-[60vh]">
                  <CommandEmpty>No matches.</CommandEmpty>

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
                                Selected
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
                  Done
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
                {values.map((value: PickerItem) => (
                  <ComboboxChip key={value.id} showRemove={false}>
                    {value.name}
                    <button
                      className="ml-1 rounded hover:bg-muted/50"
                      onClick={() => remove(value.id)}
                      aria-label={`Remove ${value.name}`}
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput placeholder={placeholder} />
              </React.Fragment>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
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
