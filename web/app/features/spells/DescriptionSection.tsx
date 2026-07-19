import { useMemo } from "react";
import DOMPurify from "dompurify";
import type { SpellDesc } from "~/i18n/display/spell-description";

export default function DescriptionSection({
  description,
}: {
  description: SpellDesc;
}) {
  const safeHtml = useMemo(
    () => (description.html ? DOMPurify.sanitize(description.html) : ""),
    [description.html],
  );

  const content = description.html ? (
    <div
      className="prose prose-sm max-w-none leading-6 prose-p:my-3 prose-ul:my-3 prose-li:my-1"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  ) : (
    <pre className="whitespace-pre-wrap text-sm leading-6">
      {description.text ?? "—"}
    </pre>
  );

  return (
    <section className="app-reading-surface rounded-md border bg-card px-4 py-5 shadow-xs sm:px-5">
      {description.sourceKey && (
        <div className="mb-4 border-b pb-2 font-mono text-xs text-muted-foreground">
          {description.sourceKey}
        </div>
      )}
      {content}
    </section>
  );
}
