import { useMemo, useState } from "react";
import { NavLink, useNavigate, useSearchParams } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

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

export default function TopBar() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="font-bold whitespace-nowrap">D&amp;D 3.5 Spellbook</div>
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
      </div>
    </header>
  );
}
