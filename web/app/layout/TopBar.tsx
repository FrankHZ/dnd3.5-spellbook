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
  const { t } = useTranslation("topbar");
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
          {t("Search")}
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
        中
      </Button>
    </div>
  );
}

export default function TopBar() {
  const { t } = useTranslation("topbar");
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3">
        <NavLink to="/browse" className="font-bold whitespace-nowrap">
          {t("D&D 3.5 Spellbook")}
        </NavLink>

        <TopBarSeacrch />
        <nav className="flex gap-3 text-sm">
          <NavLink className="hover:underline" to="/browse">
            {t("Browse")}
          </NavLink>
          <NavLink className="hover:underline" to="/spellbooks/default">
            {t("Favorites")}
          </NavLink>
          <NavLink className="hover:underline" to="/spellbooks/prepared">
            {t("Prepared")}
          </NavLink>
          <NavLink className="hover:underline" to="/spellbooks">
            {t("Spellbooks")}
          </NavLink>
          <NavLink className="hover:underline" to="/settings">
            {t("Settings")}
          </NavLink>
        </nav>
        <LangToggle />
      </div>
    </header>
  );
}
