import { useMemo } from "react";
import DOMPurify from "dompurify";

export default function DescriptionSection({
  description,
}: {
  description: { html?: string; text?: string };
}) {
  const safeHtml = useMemo(
    () => (description.html ? DOMPurify.sanitize(description.html) : ""),
    [description.html],
  );

  return description.html ? (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  ) : (
    <pre className="whitespace-pre-wrap text-sm">{description.text ?? "—"}</pre>
  );
}
