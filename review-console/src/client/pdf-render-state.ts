export type PdfRenderState = {
  requestId: number;
  requestedPageKey: string | null;
  renderedPageKey: string | null;
};

export type PdfRenderAction =
  | {
      type: "request";
      requestId: number;
      pageKey: string | null;
    }
  | {
      type: "complete";
      requestId: number;
      pageKey: string;
    };

export const INITIAL_PDF_RENDER_STATE: PdfRenderState = {
  requestId: 0,
  requestedPageKey: null,
  renderedPageKey: null,
};

export function pdfPageKey(sourceId: string, sourcePageIndex: number | null) {
  return sourcePageIndex === null ? null : `${sourceId}:${sourcePageIndex}`;
}

export function pdfRenderStateReducer(
  state: PdfRenderState,
  action: PdfRenderAction,
): PdfRenderState {
  if (action.type === "request") {
    return {
      requestId: action.requestId,
      requestedPageKey: action.pageKey,
      renderedPageKey: null,
    };
  }
  if (
    action.requestId !== state.requestId ||
    action.pageKey !== state.requestedPageKey
  ) {
    return state;
  }
  return {
    ...state,
    renderedPageKey: action.pageKey,
  };
}

export function isPdfPageReady(
  state: PdfRenderState,
  requestedPageKey = state.requestedPageKey,
) {
  return (
    requestedPageKey === state.requestedPageKey &&
    (requestedPageKey === null || requestedPageKey === state.renderedPageKey)
  );
}
