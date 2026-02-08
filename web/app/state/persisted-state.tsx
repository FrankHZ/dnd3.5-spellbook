import React, { createContext, useContext, useMemo, useState } from "react";
import type { PersistedState } from "~/storage/schema";
import { loadState, saveState } from "~/storage/localStore";

type PersistedStateContextValue = {
  state: PersistedState;
  setState: React.Dispatch<React.SetStateAction<PersistedState>>;
};

const PersistedStateContext = createContext<PersistedStateContextValue | null>(
  null,
);

export function PersistedStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // CSR: safe to read localStorage synchronously
  const [state, _setState] = useState<PersistedState>(() => loadState());

  const setState: React.Dispatch<React.SetStateAction<PersistedState>> = (
    action,
  ) => {
    _setState((prev) => {
      const next =
        typeof action === "function" ? (action as any)(prev) : action;
      saveState(next); // ✅ sync write so api/http.ts reads the newest values
      return next;
    });
  };

  const value = useMemo(() => ({ state, setState }), [state]);

  return (
    <PersistedStateContext.Provider value={value}>
      {children}
    </PersistedStateContext.Provider>
  );
}

export function usePersistedState() {
  const ctx = useContext(PersistedStateContext);
  if (!ctx) {
    throw new Error(
      "usePersistedState must be used within PersistedStateProvider",
    );
  }
  return ctx;
}
