export type NavigationGuard = {
  request(dirty: boolean, navigate: () => void): boolean;
  cancel(): void;
  confirm(): void;
  hasPending(): boolean;
};

export function createNavigationGuard(): NavigationGuard {
  let pending: (() => void) | null = null;
  return {
    request(dirty, navigate) {
      if (!dirty) {
        navigate();
        return false;
      }
      pending = navigate;
      return true;
    },
    cancel() {
      pending = null;
    },
    confirm() {
      const navigate = pending;
      pending = null;
      navigate?.();
    },
    hasPending() {
      return pending !== null;
    },
  };
}
