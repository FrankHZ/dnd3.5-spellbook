export function buildBrowsePageUrl(params: URLSearchParams, nextPage: number) {
  const page =
    Number.isFinite(nextPage) && nextPage >= 1 ? Math.floor(nextPage) : 1;
  const next = new URLSearchParams(params);
  next.set("page", String(page));
  return `/browse?${next.toString()}`;
}
