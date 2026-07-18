export function getPublicationQueryState<T>(boot: {
  rulebooks: {
    data: T | undefined;
    isPending: boolean;
    error: unknown;
  };
}) {
  return {
    isLoading: boot.rulebooks.isPending && boot.rulebooks.data === undefined,
    isError: boot.rulebooks.error != null,
  };
}
