import { describe, expect, it } from "vitest";

import { getCurrentQueryResult } from "./query-result-state";

describe("query result state", () => {
  it("hides previous-query placeholder data while the replacement is pending", () => {
    expect(
      getCurrentQueryResult({
        data: { items: ["previous result"] },
        isPending: false,
        isPlaceholderData: true,
      }),
    ).toEqual({ data: undefined, isPending: true });
  });

  it("classifies absent initial data as pending", () => {
    expect(
      getCurrentQueryResult({
        data: undefined,
        isPending: true,
        isPlaceholderData: false,
      }),
    ).toEqual({ data: undefined, isPending: true });
  });

  it("keeps current-scope data visible during a background refresh", () => {
    const data = { items: ["current result"] };

    expect(
      getCurrentQueryResult({
        data,
        isPending: false,
        isPlaceholderData: false,
      }),
    ).toEqual({ data, isPending: false });
  });
});
