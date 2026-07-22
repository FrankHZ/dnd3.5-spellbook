import { useEffect, useMemo, useRef, useState } from "react";
import type {
  MineruLayoutReviewDetail,
  PhbReviewItemDetail,
} from "data-tools/phb-review";
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { AlertTriangle, Layers3 } from "lucide-react";

import type { ReviewApi } from "./api";
import type { ReviewDraft } from "./review-state";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type OverlayState = {
  mineru: boolean;
  pdfItems: boolean;
  targets: boolean;
};

const DEFAULT_OVERLAYS: OverlayState = {
  mineru: false,
  pdfItems: false,
  targets: true,
};

export function PdfEvidenceViewer({
  api,
  detail,
  draft,
}: {
  api: ReviewApi;
  detail: PhbReviewItemDetail;
  draft: ReviewDraft;
}) {
  const sourcePageIndex = detail.item.sourcePageIndex;
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [containerWidth, setContainerWidth] = useState(720);
  const [overlays, setOverlays] = useState(DEFAULT_OVERLAYS);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setContainerWidth(Math.max(entry.contentRect.width - 32, 280));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDocument(null);
    setLoadError(null);
    if (sourcePageIndex === null) return;
    const task = getDocument({
      url: api.pdfUrl(detail.item.sourceId),
      httpHeaders: { "x-phb-review-token": api.token },
      withCredentials: false,
    });
    void task.promise
      .then((loaded) => {
        if (!cancelled) setDocument(loaded);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(messageOf(error));
      });
    return () => {
      cancelled = true;
      void task.destroy();
    };
  }, [api, detail.item.sourceId, sourcePageIndex]);

  useEffect(() => {
    if (!document || sourcePageIndex === null || !canvasRef.current) return;
    let cancelled = false;
    let renderTask: { cancel(): void; promise: Promise<unknown> } | null = null;
    setRenderError(null);
    void document
      .getPage(sourcePageIndex + 1)
      .then((page) => {
        if (cancelled || !canvasRef.current) return;
        const base = page.getViewport({ scale: 1 });
        const cssScale = Math.min(containerWidth / base.width, 1.7);
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: cssScale * ratio });
        const cssWidth = viewport.width / ratio;
        const cssHeight = viewport.height / ratio;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Canvas rendering is unavailable.");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;
        setPageSize({ width: cssWidth, height: cssHeight });
        renderTask = page.render({ canvas, canvasContext: context, viewport });
        return renderTask.promise;
      })
      .catch((error: unknown) => {
        if (!cancelled && (error as { name?: string }).name !== "RenderingCancelledException") {
          setRenderError(messageOf(error));
        }
      });
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [containerWidth, document, sourcePageIndex]);

  const pageEvidence =
    detail.queueId === "mineru-layout" ? detail.page : null;
  const targetIndexes = useMemo(
    () => selectedTargetIndexes(detail, draft),
    [detail, draft],
  );

  return (
    <section className="pdf-workspace" aria-label="PDF evidence">
      <div className="panel-heading pdf-heading">
        <div>
          <span className="eyebrow">Source evidence</span>
          <strong>
            {sourcePageIndex === null
              ? "No source page"
              : `PDF ${sourcePageIndex + 1} / printed ${detail.item.printedPageNumber ?? "-"}`}
          </strong>
        </div>
        {pageEvidence ? (
          <div className="overlay-controls" aria-label="Overlay visibility">
            <OverlayToggle
              label="MinerU"
              active={overlays.mineru}
              onChange={() =>
                setOverlays((current) => ({
                  ...current,
                  mineru: !current.mineru,
                }))
              }
            />
            <OverlayToggle
              label="PDF.js"
              active={overlays.pdfItems}
              onChange={() =>
                setOverlays((current) => ({
                  ...current,
                  pdfItems: !current.pdfItems,
                }))
              }
            />
            <OverlayToggle
              label="Targets"
              active={overlays.targets}
              onChange={() =>
                setOverlays((current) => ({
                  ...current,
                  targets: !current.targets,
                }))
              }
            />
          </div>
        ) : null}
      </div>

      <div className="pdf-stage" ref={containerRef}>
        {sourcePageIndex === null ? (
          <div className="empty-state compact">
            <Layers3 aria-hidden="true" />
            <span>This DB-only row has no PHB page.</span>
          </div>
        ) : loadError || renderError ? (
          <div className="empty-state compact error">
            <AlertTriangle aria-hidden="true" />
            <span>{loadError ?? renderError}</span>
          </div>
        ) : (
          <div
            className="pdf-page"
            style={{ width: pageSize.width || undefined, height: pageSize.height || undefined }}
            aria-busy={!document || pageSize.width === 0}
          >
            <canvas ref={canvasRef} aria-label="Rendered PHB source page" />
            {pageEvidence && pageSize.width > 0 ? (
              <div className="page-overlays" aria-hidden="true">
                {overlays.mineru
                  ? pageEvidence.mineruBlocks.map((block) =>
                      block.bbox ? (
                        <BoxOverlay
                          key={`mineru-${block.blockIndex}`}
                          bbox={block.bbox}
                          className="mineru-box"
                          label={`M${block.blockIndex}`}
                        />
                      ) : null,
                    )
                  : null}
                {overlays.pdfItems
                  ? pageEvidence.pdfItems.map((item, index) => (
                      <PdfItemOverlay
                        key={`pdf-${index}`}
                        item={item}
                        index={index}
                        width={pageEvidence.width}
                        height={pageEvidence.height}
                      />
                    ))
                  : null}
                {overlays.targets
                  ? targetIndexes.map(({ index, role }) => {
                      const block = pageEvidence.mineruBlocks.find(
                        (candidate) => candidate.blockIndex === index,
                      );
                      return block?.bbox ? (
                        <BoxOverlay
                          key={`${role}-${index}`}
                          bbox={block.bbox}
                          className={`target-box ${role}`}
                          label={`${role === "selected" ? "Selected" : "Eligible"} M${index}`}
                        />
                      ) : null;
                    })
                  : null}
                {overlays.targets ? (
                  <CandidateMarker detail={detail} />
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function OverlayToggle({
  label,
  active,
  onChange,
}: {
  label: string;
  active: boolean;
  onChange(): void;
}) {
  return (
    <button
      type="button"
      className="overlay-toggle"
      aria-pressed={active}
      onClick={onChange}
    >
      <span className="overlay-swatch" />
      {label}
    </button>
  );
}

function BoxOverlay({
  bbox,
  className,
  label,
}: {
  bbox: [number, number, number, number];
  className: string;
  label: string;
}) {
  return (
    <span
      className={`page-box ${className}`}
      style={{
        left: `${bbox[0] / 10}%`,
        top: `${bbox[1] / 10}%`,
        width: `${(bbox[2] - bbox[0]) / 10}%`,
        height: `${(bbox[3] - bbox[1]) / 10}%`,
      }}
    >
      <span>{label}</span>
    </span>
  );
}

function PdfItemOverlay({
  item,
  index,
  width,
  height,
}: {
  item: MineruLayoutReviewDetail["page"]["pdfItems"][number];
  index: number;
  width: number;
  height: number;
}) {
  return (
    <span
      className="page-box pdf-item-box"
      style={{
        left: `${(item.x / width) * 100}%`,
        top: `${((height - item.y - item.height) / height) * 100}%`,
        width: `${Math.max((item.width / width) * 100, 0.3)}%`,
        height: `${Math.max((item.height / height) * 100, 0.3)}%`,
      }}
    >
      <span>P{index}</span>
    </span>
  );
}

function CandidateMarker({ detail }: { detail: PhbReviewItemDetail }) {
  if (
    detail.queueId !== "mineru-layout" ||
    detail.candidate.kind === "content-order-conflict"
  ) {
    return null;
  }
  const point = detail.candidate.pdfItem.normalizedCenter;
  return (
    <span
      className="candidate-marker"
      style={{ left: `${point.x / 10}%`, top: `${point.y / 10}%` }}
    >
      <span>Candidate</span>
    </span>
  );
}

function selectedTargetIndexes(
  detail: PhbReviewItemDetail,
  draft: ReviewDraft,
) {
  if (detail.queueId !== "mineru-layout") return [];
  if (detail.candidate.kind === "outside-bbox-projection") {
    return detail.candidate.eligibleBlocks.map((block) => ({
      index: block.blockIndex,
      role:
        draft.targetBlockIndex === block.blockIndex
          ? ("selected" as const)
          : ("eligible" as const),
    }));
  }
  if (detail.candidate.kind === "image-adjacent-exclusion") {
    return detail.candidate.eligibleImageBlocks.map((block) => ({
      index: block.blockIndex,
      role: "eligible" as const,
    }));
  }
  return [
    { index: detail.candidate.blockIndex, role: "moving" as const },
    {
      index: draft.anchorBlockIndex ?? detail.candidate.anchorBlockIndex,
      role: "selected" as const,
    },
  ];
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "PDF evidence failed to load.";
}
