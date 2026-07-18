export function getCurrentQueryResult<T>(query: {
  data: T | undefined;
  isPending: boolean;
  isPlaceholderData: boolean;
}) {
  const isPending = query.isPending || query.isPlaceholderData;
  return {
    data: query.isPlaceholderData ? undefined : query.data,
    isPending,
  };
}
