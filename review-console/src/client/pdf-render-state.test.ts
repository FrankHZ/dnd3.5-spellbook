import { describe, expect, it } from "vitest";

import {
  INITIAL_PDF_RENDER_STATE,
  isPdfPageReady,
  pdfPageKey,
  pdfRenderStateReducer,
} from "./pdf-render-state";

describe("PDF evidence render state", () => {
  it("hides evidence between a page request and its completed render", () => {
    const firstKey = pdfPageKey("phb35-core", 181)!;
    const secondKey = pdfPageKey("phb35-core", 182)!;
    const firstRequested = pdfRenderStateReducer(INITIAL_PDF_RENDER_STATE, {
      type: "request",
      requestId: 1,
      pageKey: firstKey,
    });
    const firstReady = pdfRenderStateReducer(firstRequested, {
      type: "complete",
      requestId: 1,
      pageKey: firstKey,
    });
    const secondRequested = pdfRenderStateReducer(firstReady, {
      type: "request",
      requestId: 2,
      pageKey: secondKey,
    });

    expect(isPdfPageReady(firstReady)).toBe(true);
    expect(isPdfPageReady(firstReady, secondKey)).toBe(false);
    expect(isPdfPageReady(secondRequested)).toBe(false);
    expect(secondRequested.renderedPageKey).toBeNull();
  });

  it("ignores a stale completion from the previous page request", () => {
    const firstKey = pdfPageKey("phb35-core", 181)!;
    const secondKey = pdfPageKey("phb35-core", 182)!;
    const secondRequested = pdfRenderStateReducer(
      pdfRenderStateReducer(INITIAL_PDF_RENDER_STATE, {
        type: "request",
        requestId: 1,
        pageKey: firstKey,
      }),
      {
        type: "request",
        requestId: 2,
        pageKey: secondKey,
      },
    );
    const staleCompletion = pdfRenderStateReducer(secondRequested, {
      type: "complete",
      requestId: 1,
      pageKey: firstKey,
    });
    const currentCompletion = pdfRenderStateReducer(staleCompletion, {
      type: "complete",
      requestId: 2,
      pageKey: secondKey,
    });

    expect(staleCompletion).toBe(secondRequested);
    expect(isPdfPageReady(staleCompletion)).toBe(false);
    expect(isPdfPageReady(currentCompletion)).toBe(true);
  });
});
