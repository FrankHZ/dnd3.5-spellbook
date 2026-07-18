import { describe, expect, it } from "vitest";

import { getPublicationQueryState } from "./publication-query-state";

describe("publication query state", () => {
  it("stays ready when rulebooks loaded and an unrelated bootstrap query failed", () => {
    const boot = {
      error: new Error("classes failed"),
      isLoading: false,
      rulebooks: {
        data: { items: [{ id: 1 }] },
        isPending: false,
        error: null,
      },
    };

    expect(getPublicationQueryState(boot)).toEqual({
      isLoading: false,
      isError: false,
    });
  });

  it("reports loading and error states from the rulebook query itself", () => {
    expect(
      getPublicationQueryState({
        rulebooks: { data: undefined, isPending: true, error: null },
      }),
    ).toEqual({ isLoading: true, isError: false });

    expect(
      getPublicationQueryState({
        rulebooks: {
          data: undefined,
          isPending: false,
          error: new Error("rulebooks failed"),
        },
      }),
    ).toEqual({ isLoading: false, isError: true });
  });
});
