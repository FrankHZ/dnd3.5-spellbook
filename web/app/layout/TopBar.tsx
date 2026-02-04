import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useNavigate, useSearchParams } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { usePersistedState } from "~/state/persisted-state";

function TopBarSeacrch() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [text, setText] = useState(q);
  const [error, setError] = useState(null as string | null);
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 2) {
      setError("Type at least 2 characters.");
      return;
    }
    setError(null);
    navigate(`/search?q=${encodeURIComponent(text.trim())}`);
  };

  useMemo(() => setText(q), [q]);
  return (
    <div className="flex-1">
      <form className="flex gap-2" onSubmit={onSubmit}>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search spells by name..."
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>
      {error && <div className="mt-1 text-xs text-destructive">{error}</div>}
    </div>
  );
}

function LangToggle() {
  const { state, setState } = usePersistedState();
  const lang = state.uiPrefs.lang ?? "en";

  return (
    <div className="flex items-center gap-1 rounded-md border p-1">
      <Button
        type="button"
        size="sm"
        variant={lang === "en" ? "default" : "ghost"}
        onClick={() =>
          setState((s) => ({ ...s, uiPrefs: { ...s.uiPrefs, lang: "en" } }))
        }
      >
        EN
      </Button>
      <Button
        type="button"
        size="sm"
        variant={lang === "zh" ? "default" : "ghost"}
        onClick={() =>
          setState((s) => ({ ...s, uiPrefs: { ...s.uiPrefs, lang: "zh" } }))
        }
      >
        ZH
      </Button>
    </div>
  );
}

export default function TopBar() {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="font-bold whitespace-nowrap">{t("topbar.title")}</div>
        <TopBarSeacrch />
        <nav className="flex gap-3 text-sm">
          <NavLink className="hover:underline" to="/browse">
            Browse
          </NavLink>
          <NavLink className="hover:underline" to="/spellbooks/default">
            Favorites
          </NavLink>
          <NavLink className="hover:underline" to="/spellbooks/prepared">
            Prepared
          </NavLink>
          <NavLink className="hover:underline" to="/spellbooks">
            Spellbooks
          </NavLink>
          <NavLink className="hover:underline" to="/settings">
            Settings
          </NavLink>
        </nav>
        <LangToggle />
      </div>
    </header>
  );
}
