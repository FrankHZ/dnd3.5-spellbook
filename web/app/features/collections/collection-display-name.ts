import type { SpellBook } from "~/storage/collections.type";
import { DEFAULT_BOOK_ID, PREPARED_BOOK_ID } from "~/storage/keys";

export function getCollectionDisplayName(
  book: SpellBook,
  tDefault: (key: string) => string,
): string {
  if (book.id === DEFAULT_BOOK_ID) return tDefault("default");
  if (book.id === PREPARED_BOOK_ID) return tDefault("prepared");
  return book.name;
}
