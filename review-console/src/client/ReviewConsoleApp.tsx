import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  EnglishResidualReviewDetail,
  MineruLayoutReviewDetail,
  PhbReviewItemDetail,
  PhbReviewListItem,
  PhbReviewQueue,
  PhbReviewQueueId,
  PhbReviewQueueSummary,
} from "data-tools/phb-review";
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Filter,
  RefreshCw,
  RotateCcw,
  Save,
  X,
} from "lucide-react";

import {
  createReviewApi,
  readReviewToken,
  ReviewApiError,
  type ReviewApi,
} from "./api";
import { PdfEvidenceViewer } from "./PdfEvidenceViewer";
import {
  adjacentItemId,
  createReviewDraft,
  decisionRequest,
  EMPTY_FILTERS,
  facetValues,
  filterQueueItems,
  missingDraftFields,
  reconcileStaleDecision,
  stableSelection,
  type QueueFilters,
  type ReviewDraft,
} from "./review-state";

const QUEUE_LABELS: Record<PhbReviewQueueId, string> = {
  "mineru-layout": "MinerU layout",
  "english-residual": "English residuals",
};

export function ReviewConsoleApp() {
  const api = useMemo(() => createReviewApi(readReviewToken()), []);
  const [summaries, setSummaries] = useState<PhbReviewQueueSummary[] | null>(
    null,
  );
  const [queueId, setQueueId] =
    useState<PhbReviewQueueId>("mineru-layout");
  const [queue, setQueue] = useState<PhbReviewQueue | null>(null);
  const [filters, setFilters] = useState<QueueFilters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PhbReviewItemDetail | null>(null);
  const [draft, setDraft] = useState<ReviewDraft | null>(null);
  const [queueLoading, setQueueLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState(() =>
    sessionStorage.getItem("phb-reviewer") ?? "",
  );

  const loadSummaries = useCallback(async () => {
    try {
      const next = await api.listQueues();
      setSummaries(next);
      setError(null);
      return next;
    } catch (caught) {
      setError(messageOf(caught));
      return null;
    }
  }, [api]);

  useEffect(() => {
    void loadSummaries();
  }, [loadSummaries]);

  const currentSummary = summaries?.find(
    (summary) => summary.queueId === queueId,
  );

  useEffect(() => {
    if (!currentSummary) return;
    if (!currentSummary.availability.available) {
      setQueue(null);
      setSelectedId(null);
      setDetail(null);
      setDraft(null);
      setQueueLoading(false);
      return;
    }
    let active = true;
    setQueueLoading(true);
    setError(null);
    void api
      .getQueue(queueId)
      .then((next) => {
        if (active) setQueue(next);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setQueue(null);
        setError(messageOf(caught));
        if (caught instanceof ReviewApiError && caught.code === "stale-queue") {
          void loadSummaries();
        }
      })
      .finally(() => {
        if (active) setQueueLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, currentSummary, loadSummaries, queueId]);

  const filteredItems = useMemo(
    () => filterQueueItems(queue?.items ?? [], filters),
    [filters, queue],
  );

  useEffect(() => {
    setSelectedId((current) => stableSelection(filteredItems, current));
  }, [filteredItems]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setDraft(null);
      return;
    }
    let active = true;
    setDetailLoading(true);
    setError(null);
    void api
      .getItem(queueId, selectedId)
      .then((next) => {
        if (!active) return;
        setDetail(next);
        setDraft(createReviewDraft(next, reviewer));
        setNotice(null);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setDetail(null);
        setDraft(null);
        setError(messageOf(caught));
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, queueId, reviewer, selectedId]);

  const selectQueue = (next: PhbReviewQueueId) => {
    if (next === queueId) return;
    setQueueId(next);
    setQueue(null);
    setFilters(EMPTY_FILTERS);
    setSelectedId(null);
    setDetail(null);
    setDraft(null);
    setNotice(null);
  };

  const selectAdjacent = (offset: -1 | 1) => {
    setSelectedId(adjacentItemId(filteredItems, selectedId, offset));
  };

  const saveDecision = async () => {
    if (!detail || !draft) return;
    const request = decisionRequest(detail, draft);
    if (!request) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      sessionStorage.setItem("phb-reviewer", request.reviewer);
      setReviewer(request.reviewer);
      const result = await api.submitDecision(request);
      const current = await api.getItem(queueId, request.itemId);
      setQueue((value) =>
        value
          ? {
              ...value,
              items: value.items.map((item) =>
                item.itemId === result.item.itemId ? result.item : item,
              ),
            }
          : value,
      );
      setDetail(current);
      setDraft(createReviewDraft(current, request.reviewer));
      setNotice(
        result.canonicalRerunRequired
          ? `Decision saved. Canonical acceptance pending: ${result.canonicalRerunRequired.from}.`
          : result.changed
            ? "Decision saved."
            : "Decision already matched the current record.",
      );
      await loadSummaries();
    } catch (caught) {
      if (caught instanceof ReviewApiError && caught.code === "stale-decision") {
        const current = currentDetailFrom(caught.details);
        if (current) {
          const reconciled = reconcileStaleDecision(
            queue?.items ?? [],
            current,
            draft,
          );
          setDetail(reconciled.detail);
          setDraft(reconciled.draft);
          setQueue((value) =>
            value ? { ...value, items: reconciled.items } : value,
          );
        }
        setNotice(
          "Evidence changed. Current evidence is loaded; your draft fields were preserved.",
        );
        await loadSummaries();
      } else if (
        caught instanceof ReviewApiError &&
        caught.code === "stale-queue"
      ) {
        setQueue(null);
        setDetail(null);
        setDraft(null);
        setNotice(null);
        setError(caught.message);
        await loadSummaries();
      } else {
        setError(messageOf(caught));
      }
    } finally {
      setSaving(false);
    }
  };

  const refresh = async () => {
    setNotice(null);
    setQueueLoading(true);
    await loadSummaries();
    setQueueLoading(false);
  };

  return (
    <div className="review-app">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true">
          <BookOpen />
        </div>
        <div className="brand-copy">
          <span>PHB 3.5</span>
          <h1>Evidence Review</h1>
        </div>
        <span className="gate-badge">Gate 2</span>
        <div className="header-spacer" />
        <button
          type="button"
          className="icon-button"
          onClick={() => void refresh()}
          aria-label="Refresh queues"
          title="Refresh queues"
        >
          <RefreshCw aria-hidden="true" />
        </button>
      </header>

      <main className="workspace">
        <QueueSidebar
          summaries={summaries}
          queueId={queueId}
          queue={queue}
          filters={filters}
          items={filteredItems}
          selectedId={selectedId}
          loading={queueLoading}
          onQueueChange={selectQueue}
          onFiltersChange={setFilters}
          onSelect={setSelectedId}
        />

        <div className="review-main">
          {currentSummary?.canonicalRerunRequired ? (
            <StateBanner tone="warning">
              <CircleAlert aria-hidden="true" />
              Canonical rerun pending from {currentSummary.canonicalRerunRequired.from}.
            </StateBanner>
          ) : null}
          {notice ? (
            <StateBanner tone="success">
              <Check aria-hidden="true" />
              {notice}
            </StateBanner>
          ) : null}
          {error ? (
            <StateBanner tone="danger">
              <AlertTriangle aria-hidden="true" />
              {error}
            </StateBanner>
          ) : null}

          {!currentSummary ? (
            <WorkspaceState loading label="Loading review queues" />
          ) : !currentSummary.availability.available ? (
            <UnavailableQueue summary={currentSummary} onRefresh={refresh} />
          ) : detailLoading || (selectedId && !detail) ? (
            <WorkspaceState loading label="Loading evidence" />
          ) : !detail || !draft ? (
            <WorkspaceState
              label={
                filteredItems.length === 0
                  ? "No rows match the active filters."
                  : "Select a review row."
              }
            />
          ) : (
            <>
              <ReviewToolbar
                item={detail.item}
                items={filteredItems}
                selectedId={selectedId}
                onPrevious={() => selectAdjacent(-1)}
                onNext={() => selectAdjacent(1)}
              />
              <div className="evidence-grid">
                <PdfEvidenceViewer api={api} detail={detail} draft={draft} />
                <EvidencePanel
                  detail={detail}
                  draft={draft}
                  saving={saving}
                  onDraftChange={setDraft}
                  onSave={() => void saveDecision()}
                />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function QueueSidebar({
  summaries,
  queueId,
  queue,
  filters,
  items,
  selectedId,
  loading,
  onQueueChange,
  onFiltersChange,
  onSelect,
}: {
  summaries: PhbReviewQueueSummary[] | null;
  queueId: PhbReviewQueueId;
  queue: PhbReviewQueue | null;
  filters: QueueFilters;
  items: PhbReviewListItem[];
  selectedId: string | null;
  loading: boolean;
  onQueueChange(queueId: PhbReviewQueueId): void;
  onFiltersChange(filters: QueueFilters): void;
  onSelect(itemId: string): void;
}) {
  const kinds = facetValues(queue?.items ?? [], "kind");
  const categories = facetValues(queue?.items ?? [], "category");
  return (
    <aside className="queue-sidebar">
      <div className="queue-tabs" role="tablist" aria-label="Review queues">
        {(summaries ?? []).map((summary) => (
          <button
            key={summary.queueId}
            type="button"
            role="tab"
            aria-selected={summary.queueId === queueId}
            disabled={!summary.availability.available}
            onClick={() => onQueueChange(summary.queueId)}
          >
            <span>{QUEUE_LABELS[summary.queueId]}</span>
            <strong>{summary.total}</strong>
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <div className="filter-title">
          <Filter aria-hidden="true" />
          <span>Queue filters</span>
          <span className="result-count">{items.length}</span>
          <button
            type="button"
            className="mini-icon-button"
            aria-label="Reset queue filters"
            title="Reset filters"
            disabled={filters === EMPTY_FILTERS || Object.values(filters).every((value) => value === "all")}
            onClick={() => onFiltersChange(EMPTY_FILTERS)}
          >
            <RotateCcw aria-hidden="true" />
          </button>
        </div>
        <div className="filter-grid">
          <FilterSelect
            label="Status"
            value={filters.status}
            values={["proposed", "accepted", "rejected"]}
            onChange={(status) => onFiltersChange({ ...filters, status })}
          />
          <FilterSelect
            label="Kind"
            value={filters.kind}
            values={kinds}
            onChange={(kind) => onFiltersChange({ ...filters, kind })}
          />
          {categories.length > 0 ? (
            <FilterSelect
              label="Category"
              value={filters.category}
              values={categories}
              onChange={(category) =>
                onFiltersChange({ ...filters, category })
              }
            />
          ) : null}
        </div>
      </div>

      <div className="queue-list" aria-busy={loading}>
        {loading ? (
          <WorkspaceState loading label="Loading rows" />
        ) : (
          items.map((item) => (
            <button
              key={item.itemId}
              type="button"
              className="queue-row"
              aria-current={item.itemId === selectedId ? "true" : undefined}
              onClick={() => onSelect(item.itemId)}
            >
              <StatusDot status={item.status} />
              <span className="queue-row-copy">
                <strong>{item.label || item.itemId}</strong>
                <small>
                  {humanize(item.kind)}
                  {item.printedPageNumber === null
                    ? ""
                    : ` · p. ${item.printedPageNumber}`}
                </small>
              </span>
              <span className="row-status">{item.status}</span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}

function FilterSelect({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange(value: string): void;
}) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">All</option>
        {values.map((option) => (
          <option key={option} value={option}>
            {humanize(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReviewToolbar({
  item,
  items,
  selectedId,
  onPrevious,
  onNext,
}: {
  item: PhbReviewListItem;
  items: PhbReviewListItem[];
  selectedId: string | null;
  onPrevious(): void;
  onNext(): void;
}) {
  const position = items.findIndex((candidate) => candidate.itemId === selectedId);
  return (
    <div className="review-toolbar">
      <div className="review-title">
        <span className={`status-label ${item.status}`}>{item.status}</span>
        <div>
          <h2>{item.label || item.itemId}</h2>
          <span>{humanize(item.kind)}</span>
        </div>
      </div>
      <div className="pager">
        <span>
          {position < 0 ? 0 : position + 1} / {items.length}
        </span>
        <button
          type="button"
          className="icon-button light"
          aria-label="Previous review row"
          title="Previous"
          disabled={position <= 0}
          onClick={onPrevious}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-button light"
          aria-label="Next review row"
          title="Next"
          disabled={position < 0 || position >= items.length - 1}
          onClick={onNext}
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function EvidencePanel({
  detail,
  draft,
  saving,
  onDraftChange,
  onSave,
}: {
  detail: PhbReviewItemDetail;
  draft: ReviewDraft;
  saving: boolean;
  onDraftChange(draft: ReviewDraft): void;
  onSave(): void;
}) {
  return (
    <section className="evidence-panel" aria-label="Review evidence and decision">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Evidence record</span>
          <strong>{detail.item.itemId}</strong>
        </div>
        <Fingerprint value={detail.item.reviewFingerprintSha256} />
      </div>
      <div className="evidence-scroll">
        {detail.queueId === "mineru-layout" ? (
          <LayoutEvidence detail={detail} />
        ) : (
          <EnglishEvidence detail={detail} />
        )}
        <DecisionForm
          detail={detail}
          draft={draft}
          saving={saving}
          onChange={onDraftChange}
          onSave={onSave}
        />
      </div>
    </section>
  );
}

function LayoutEvidence({ detail }: { detail: MineruLayoutReviewDetail }) {
  const candidate = detail.candidate;
  return (
    <>
      <EvidenceSection title="Candidate">
        <FieldGrid>
          <DataField label="Kind" value={humanize(candidate.kind)} />
          <DataField label="Source page" value={String(candidate.sourcePageIndex + 1)} />
          <DataField label="Printed page" value={String(candidate.printedPageNumber ?? "-")} />
          <DataField label="Algorithm" value={candidate.candidateAlgorithmVersion} mono />
        </FieldGrid>
        {candidate.kind !== "content-order-conflict" ? (
          <TextEvidence label="PDF.js item" value={candidate.pdfItem.text} />
        ) : (
          <div className="comparison-pair">
            <TextEvidence label={`Moving block M${candidate.blockIndex}`} value={candidate.blockText} />
            <TextEvidence label={`Current anchor M${candidate.anchorBlockIndex}`} value={candidate.anchorText} />
          </div>
        )}
      </EvidenceSection>

      {candidate.kind === "outside-bbox-projection" ? (
        <EvidenceSection title="Eligible blocks" count={candidate.eligibleBlocks.length}>
          <div className="evidence-list">
            {candidate.eligibleBlocks.map((block) => (
              <div className="evidence-list-row" key={block.blockIndex}>
                <strong>M{block.blockIndex}</strong>
                <span>{block.blockType}</span>
                <p>{block.mineruText || "No text"}</p>
                <small>Δx {block.distance.horizontal} · Δy {block.distance.vertical}</small>
              </div>
            ))}
          </div>
        </EvidenceSection>
      ) : null}

      {candidate.kind === "image-adjacent-exclusion" ? (
        <EvidenceSection title="Adjacent image blocks" count={candidate.eligibleImageBlocks.length}>
          <div className="evidence-list">
            {candidate.eligibleImageBlocks.map((block) => (
              <div className="evidence-list-row" key={block.blockIndex}>
                <strong>M{block.blockIndex}</strong>
                <span>image</span>
                <p>{block.captions.join(" · ") || "No caption"}</p>
                <small>Δx {block.distance.horizontal} · Δy {block.distance.vertical}</small>
              </div>
            ))}
          </div>
        </EvidenceSection>
      ) : null}

      <EvidenceSection title="Page inventory">
        <FieldGrid>
          <DataField label="MinerU blocks" value={String(detail.page.mineruBlocks.length)} />
          <DataField label="PDF.js items" value={String(detail.page.pdfItems.length)} />
          <DataField label="Page size" value={`${detail.page.width} × ${detail.page.height}`} />
        </FieldGrid>
      </EvidenceSection>
    </>
  );
}

function EnglishEvidence({ detail }: { detail: EnglishResidualReviewDetail }) {
  const { comparison, adjudication, rowReview, evidence } = detail;
  const srdByComponent = new Map(
    adjudication.componentEvidence.map((row) => [row.component, row]),
  );
  return (
    <>
      <EvidenceSection title="Disposition">
        <FieldGrid>
          <DataField label="Category" value={humanize(comparison.category)} />
          <DataField label="Membership" value={humanize(comparison.setMembership)} />
          <DataField label="SRD rule" value={humanize(adjudication.rule)} />
          <DataField label="SRD spell" value={adjudication.srdPrintedName ?? "Not present"} />
        </FieldGrid>
        {adjudication.unresolvedReasons.length > 0 ? (
          <TagList values={adjudication.unresolvedReasons} tone="warning" />
        ) : null}
        {rowReview.reviewFlags.length > 0 ? <TagList values={rowReview.reviewFlags} /> : null}
      </EvidenceSection>

      <EvidenceSection title="PHB / DB / SRD components" count={comparison.components.length}>
        {comparison.components.length > 0 ? (
          <div className="diff-table">
            {comparison.components.map((component) => {
              const srd = srdByComponent.get(component.component);
              return (
                <div className="diff-row" key={component.component}>
                  <div className="diff-label">
                    <strong>{humanize(component.component)}</strong>
                    <span className={`comparison-status ${component.category}`}>
                      {humanize(component.category)}
                    </span>
                  </div>
                  <TextEvidence label="PHB" value={component.sourceValue || "Empty"} />
                  <TextEvidence label="DB" value={component.dbValue || "Empty"} />
                  <TextEvidence
                    label={`SRD${srd ? ` · ${humanize(srd.disposition)}` : ""}`}
                    value={srd?.srdValues.join("\n") || "No SRD component evidence"}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted-copy">No component-level comparison rows.</p>
        )}
      </EvidenceSection>

      <EvidenceSection title="PHB spell evidence" count={evidence.spellEntities.length}>
        {evidence.spellEntities.map((spell) => (
          <div className="spell-evidence" key={spell.rowId}>
            <strong>{spell.printedName}</strong>
            <span>{spell.school}</span>
            <dl>
              {Object.entries(spell.fields).map(([label, value]) => (
                <div key={label}>
                  <dt>{humanize(label)}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <pre>{spell.bodyText}</pre>
          </div>
        ))}
      </EvidenceSection>

      <EvidenceSection title="Short descriptions" count={evidence.listOccurrences.length}>
        <div className="summary-list">
          {evidence.listOccurrences.map((occurrence) => (
            <div key={occurrence.occurrenceId}>
              <strong>{occurrence.owner} {occurrence.level}</strong>
              <p>{occurrence.summaryText}</p>
            </div>
          ))}
        </div>
        <TextEvidence label="Current DB summary" value={comparison.shortDescriptions.dbSummaryText ?? "Not present"} />
      </EvidenceSection>

      <details className="raw-evidence">
        <summary>Errata, table, and evidence references</summary>
        <pre>
          {JSON.stringify(
            {
              sourceEvidence: comparison.sourceEvidence,
              evidenceRowIds: rowReview.evidenceRowIds,
              errataOverlays: evidence.errataOverlays,
              detachedTables: evidence.detachedTables,
              mineruTables: evidence.mineruTables,
            },
            null,
            2,
          )}
        </pre>
      </details>
    </>
  );
}

function DecisionForm({
  detail,
  draft,
  saving,
  onChange,
  onSave,
}: {
  detail: PhbReviewItemDetail;
  draft: ReviewDraft;
  saving: boolean;
  onChange(draft: ReviewDraft): void;
  onSave(): void;
}) {
  const missing = missingDraftFields(detail, draft);
  return (
    <section className="decision-form">
      <div className="section-heading">
        <h3>Decision</h3>
        <span>Explicit save</span>
      </div>
      <div className="decision-options" role="group" aria-label="Decision status">
        {detail.item.allowedActions.includes("accepted") ? (
          <button
            type="button"
            className="decision-option accept"
            aria-pressed={draft.status === "accepted"}
            onClick={() => onChange({ ...draft, status: "accepted" })}
          >
            <Check aria-hidden="true" /> Accept
          </button>
        ) : null}
        {detail.item.allowedActions.includes("rejected") ? (
          <button
            type="button"
            className="decision-option reject"
            aria-pressed={draft.status === "rejected"}
            onClick={() => onChange({ ...draft, status: "rejected" })}
          >
            <X aria-hidden="true" /> Reject
          </button>
        ) : null}
      </div>

      {detail.queueId === "mineru-layout" &&
      detail.candidate.kind === "outside-bbox-projection" ? (
        <label className="form-field">
          <span>Target MinerU block</span>
          <select
            value={draft.targetBlockIndex ?? ""}
            onChange={(event) =>
              onChange({
                ...draft,
                targetBlockIndex: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
          >
            <option value="">Select a block</option>
            {detail.candidate.eligibleBlocks.map((block) => (
              <option key={block.blockIndex} value={block.blockIndex}>
                M{block.blockIndex} · {block.blockType} · Δy {block.distance.vertical}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {detail.queueId === "mineru-layout" &&
      detail.candidate.kind === "content-order-conflict" ? (
        <AnchorBlockField
          candidate={detail.candidate}
          blocks={detail.page.mineruBlocks}
          draft={draft}
          onChange={onChange}
        />
      ) : null}

      <label className="form-field">
        <span>Reviewer</span>
        <input
          value={draft.reviewer}
          autoComplete="off"
          onChange={(event) => onChange({ ...draft, reviewer: event.target.value })}
        />
      </label>
      <label className="form-field">
        <span>Decision note</span>
        <textarea
          rows={4}
          value={draft.decisionNote}
          onChange={(event) =>
            onChange({ ...draft, decisionNote: event.target.value })
          }
        />
      </label>
      <div className="decision-footer">
        <span className="validation-copy">
          {missing.length > 0 ? `Required: ${missing.join(", ")}` : "Ready to save"}
        </span>
        <button
          type="button"
          className="save-button"
          disabled={saving || missing.length > 0}
          onClick={onSave}
        >
          <Save aria-hidden="true" />
          {saving ? "Saving…" : "Save decision"}
        </button>
      </div>
    </section>
  );
}

function AnchorBlockField({
  candidate,
  blocks,
  draft,
  onChange,
}: {
  candidate: Extract<
    MineruLayoutReviewDetail["candidate"],
    { kind: "content-order-conflict" }
  >;
  blocks: MineruLayoutReviewDetail["page"]["mineruBlocks"];
  draft: ReviewDraft;
  onChange(draft: ReviewDraft): void;
}) {
  const movingBlockIndex = candidate.blockIndex;
  return (
    <label className="form-field">
      <span>Insert before block</span>
      <select
        value={draft.anchorBlockIndex ?? ""}
        onChange={(event) =>
          onChange({
            ...draft,
            anchorBlockIndex: event.target.value
              ? Number(event.target.value)
              : null,
          })
        }
      >
        <option value="">Select an anchor</option>
        {blocks
          .filter((block) => block.blockIndex !== movingBlockIndex)
          .map((block) => (
            <option key={block.blockIndex} value={block.blockIndex}>
              M{block.blockIndex} · {block.type}
            </option>
          ))}
      </select>
    </label>
  );
}

function EvidenceSection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="evidence-section">
      <div className="section-heading">
        <h3>{title}</h3>
        {count !== undefined ? <span>{count}</span> : null}
      </div>
      {children}
    </section>
  );
}

function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="field-grid">{children}</div>;
}

function DataField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="data-field">
      <span>{label}</span>
      <strong className={mono ? "mono" : undefined}>{value}</strong>
    </div>
  );
}

function TextEvidence({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-evidence">
      <span>{label}</span>
      <pre>{value}</pre>
    </div>
  );
}

function TagList({ values, tone = "neutral" }: { values: string[]; tone?: "neutral" | "warning" }) {
  return (
    <div className={`tag-list ${tone}`}>
      {values.map((value) => (
        <span key={value}>{value}</span>
      ))}
    </div>
  );
}

function Fingerprint({ value }: { value: string }) {
  return (
    <code className="fingerprint" title={value}>
      {value.slice(0, 8)}…{value.slice(-6)}
    </code>
  );
}

function StatusDot({ status }: { status: PhbReviewListItem["status"] }) {
  return <span className={`status-dot ${status}`} aria-hidden="true" />;
}

function StateBanner({
  tone,
  children,
}: {
  tone: "warning" | "success" | "danger";
  children: ReactNode;
}) {
  return <div className={`state-banner ${tone}`}>{children}</div>;
}

function WorkspaceState({
  label,
  loading = false,
}: {
  label: string;
  loading?: boolean;
}) {
  return (
    <div className="workspace-state">
      {loading ? <RefreshCw className="spin" aria-hidden="true" /> : <Filter aria-hidden="true" />}
      <span>{label}</span>
    </div>
  );
}

function UnavailableQueue({
  summary,
  onRefresh,
}: {
  summary: PhbReviewQueueSummary;
  onRefresh(): Promise<void>;
}) {
  const availability = summary.availability;
  if (availability.available) return null;
  return (
    <div className="unavailable-state">
      <CircleAlert aria-hidden="true" />
      <h2>Queue unavailable</h2>
      <p>{availability.message}</p>
      {availability.requiredRerunFrom ? (
        <code>{availability.requiredRerunFrom}</code>
      ) : null}
      <button type="button" onClick={() => void onRefresh()}>
        <RefreshCw aria-hidden="true" /> Refresh
      </button>
    </div>
  );
}

function currentDetailFrom(details: unknown) {
  const current = (details as { current?: unknown } | null)?.current;
  if (!current || typeof current !== "object") return null;
  const candidate = current as Partial<PhbReviewItemDetail>;
  return candidate.queueId && candidate.item
    ? (current as PhbReviewItemDetail)
    : null;
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Review console request failed.";
}

function humanize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/gu, "$1 $2")
    .replace(/[-_]/gu, " ")
    .replace(/^./u, (first) => first.toUpperCase());
}
