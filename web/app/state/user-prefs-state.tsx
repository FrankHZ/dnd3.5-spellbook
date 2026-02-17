import React, { createContext, useContext, useMemo, useState } from "react";
import type { UserPrefsState } from "~/storage/userPrefs.type";
import { loadState, saveState } from "~/storage/userPrefs";

type UserPrefsStateContextValue = {
  state: UserPrefsState;
  setState: React.Dispatch<React.SetStateAction<UserPrefsState>>;
};

const UserPrefsStateContext = createContext<UserPrefsStateContextValue | null>(
  null,
);

export function UserPrefsProvider({ children }: { children: React.ReactNode }) {
  // CSR: safe to read localStorage synchronously
  const [state, _setState] = useState<UserPrefsState>(() => loadState());

  const setState: React.Dispatch<React.SetStateAction<UserPrefsState>> = (
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
    <UserPrefsStateContext.Provider value={value}>
      {children}
    </UserPrefsStateContext.Provider>
  );
}

export function useUserPrefs() {
  const ctx = useContext(UserPrefsStateContext);
  if (!ctx) {
    throw new Error("useUserPrefs must be used within PersistedStateProvider");
  }
  return ctx;
}
