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
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  ) : (
    <pre className="whitespace-pre-wrap text-sm">{description.text ?? "—"}</pre>
  );

  return (
    <>
      {description.sourceKey && (
        <div className="text-sm text-muted-foreground">
          {description.sourceKey}
        </div>
      )}
      {content}
    </>
  );
}
