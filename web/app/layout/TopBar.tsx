import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "~/components/ui/navigation-menu";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "~/components/ui/popover";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  buildSearchUrl,
  buildSearchUrlWithPreservedScope,
} from "~/features/search/search-url";
import { isSearchQueryValid } from "~/features/search/validation";
import { useAppI18n } from "~/i18n/hooks/useAppI18n";
import { useUserPrefs } from "~/state/user-prefs-state";

function TopBarSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [text, setText] = useState(q);
  const [error, setError] = useState(null as string | null);
  const { t } = useTranslation("spell-search");

  const { lang } = useAppI18n();
  const isValid = isSearchQueryValid(text, lang);

  useEffect(() => {
    setError(null);
  }, [lang]);

  useEffect(() => {
    setText(q);
  }, [q]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValid.ok) {
      if (lang == "zh") {
        setError(
          t("Enter at least 2 characters, or type a Chinese character."),
        );
      } else {
        setError(t("Enter at least 2 characters to run a search."));
      }
      return;
    }
    setError(null);
    const query = text.trim();
    const shouldPreserveScope =
      location.pathname === "/search" || location.pathname === "/browse";
    navigate(
      shouldPreserveScope
        ? buildSearchUrlWithPreservedScope(params, query)
        : buildSearchUrl({ q: query }),
    );
  };

  return (
    <Popover open={Boolean(error)}>
      <div className="flex-1">
        <PopoverAnchor asChild>
          <form className="flex gap-2" onSubmit={onSubmit}>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("Search spells by name...")}
              aria-invalid={Boolean(error)}
            />
            <Button type="submit" variant="outline">
              {t("Search")}
            </Button>
          </form>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={8}
          className="w-auto max-w-sm px-3 py-2 text-xs text-destructive"
        >
          {error}
        </PopoverContent>
      </div>
    </Popover>
  );
}

function useTopBarItems() {
  const { t } = useTranslation("topbar");
  const { pathname } = useLocation();

  return [
    { to: "/browse", label: t("Browse"), active: pathname === "/browse" },
    {
      to: "/spellbooks/default",
      label: t("Favorites"),
      active: pathname === "/spellbooks/default",
    },
    {
      to: "/spellbooks/prepared",
      label: t("Prepared"),
      active: pathname === "/spellbooks/prepared",
    },
    {
      to: "/spellbooks",
      label: t("Spellbooks"),
      active:
        pathname === "/spellbooks" ||
        (pathname.startsWith("/spellbooks/") &&
          pathname !== "/spellbooks/default" &&
          pathname !== "/spellbooks/prepared"),
    },
    { to: "/settings", label: t("Settings"), active: pathname === "/settings" },
  ];
}

function TopBarNav() {
  const items = useTopBarItems();

  return (
    <NavigationMenu viewport={false} className="hidden flex-none md:flex">
      <NavigationMenuList className="gap-1">
        {items.map((item) => (
          <NavigationMenuItem key={item.to}>
            <NavigationMenuLink asChild active={item.active}>
              <NavLink to={item.to} className="px-3 py-2">
                {item.label}
              </NavLink>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function MobileNavMenu() {
  const { t } = useTranslation("topbar");
  const items = useTopBarItems();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="md:hidden"
          aria-label={t("Open navigation")}
        >
          <Menu className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 gap-0">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>{t("D&D 3.5 Spellbook")}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-2 p-4">
          {items.map((item) => (
            <SheetClose asChild key={item.to}>
              <NavLink
                to={item.to}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  item.active
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {item.label}
              </NavLink>
            </SheetClose>
          ))}
          <div className="pt-2">
            <LangToggle />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LangToggle() {
  const { t } = useTranslation("topbar");
  const { state, setState } = useUserPrefs();
  const lang = state.uiPrefs.lang ?? "en";

  return (
    <ToggleGroup
      type="single"
      value={lang}
      variant="outline"
      size="sm"
      aria-label={t("Language")}
      onValueChange={(value) => {
        if (value !== "en" && value !== "zh") return;
        setState((s) => ({ ...s, uiPrefs: { ...s.uiPrefs, lang: value } }));
      }}
    >
      <ToggleGroupItem value="en" aria-label={t("English")}>
        EN
      </ToggleGroupItem>
      <ToggleGroupItem value="zh" aria-label={t("Chinese")}>
        中
      </ToggleGroupItem>
    </ToggleGroup>
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

        <TopBarSearch />
        <MobileNavMenu />
        <TopBarNav />
        <div className="hidden md:block">
          <LangToggle />
        </div>
      </div>
    </header>
  );
}
