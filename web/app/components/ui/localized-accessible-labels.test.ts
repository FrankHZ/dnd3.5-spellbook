import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: (namespace: string) => ({
    t: (key: string) => {
      if (namespace === "translation" && key === "actions.close") return "关闭";
      if (namespace === "pager" && key === "navigation.label") return "分页";
      return key;
    },
  }),
}));

import { DialogContent, DialogFooter } from "./dialog";
import { Pagination } from "./pagination";
import { SheetContent } from "./sheet";

function findBySlot(node: ReactNode, slot: string): ReactElement | null {
  if (!isValidElement(node)) return null;
  const props = node.props as { children?: ReactNode; "data-slot"?: string };
  if (props["data-slot"] === slot) return node;

  for (const child of Children.toArray(props.children)) {
    const match = findBySlot(child, slot);
    if (match) return match;
  }

  return null;
}

function collectText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (!isValidElement(node)) return "";
  const props = node.props as { children?: ReactNode };
  return Children.toArray(props.children).map(collectText).join("");
}

describe("localized reusable accessible labels", () => {
  it("uses the Chinese close label for dialog and sheet close controls", () => {
    const dialog = DialogContent({ children: null });
    const sheet = SheetContent({ children: null });
    const footer = DialogFooter({ children: null, showCloseButton: true });

    expect(collectText(findBySlot(dialog, "dialog-close"))).toBe("关闭");
    expect(collectText(findBySlot(sheet, "sheet-close"))).toBe("关闭");
    expect(collectText(footer)).toBe("关闭");
  });

  it("uses the Chinese pagination navigation label", () => {
    const pagination = Pagination({ children: null });

    expect(pagination.props).toMatchObject({ "aria-label": "分页" });
  });
});
