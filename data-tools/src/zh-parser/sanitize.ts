import sanitizeHtml from "sanitize-html";

export function sanitizeDescription(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "div",
      "span",
      "b",
      "strong",
      "i",
      "em",
      "u",
      "ul",
      "ol",
      "li",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
      "blockquote",
      "hr",
      "a",
      "h2",
      "h3",
      "h4",
    ],
    allowedAttributes: {
      a: ["href", "title"],
      // Word HTML can carry tons of junk; for v1, drop style entirely.
      // If you want to preserve some styling later, we can revisit.
    },
    allowedSchemes: ["http", "https", "mailto"],
    disallowedTagsMode: "discard",
  })
    .replace(/\s+\n/g, "\n")
    .trim();
}
