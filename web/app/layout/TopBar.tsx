import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { SpellSearchMode } from "@dnd/contracts";
import { Menu, SearchIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";
import { Button } from "~/components/ui/button";
import { ButtonGroup } from "~/components/ui/button-group";
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

  useEffect(() => {
    setError(null);
  }, [lang]);

  useEffect(() => {
    setText(q);
  }, [q]);

  const runSearch = (mode: SpellSearchMode) => {
    const isValid = isSearchQueryValid(text, lang, mode);
    if (!isValid.ok) {
      if (mode === "full") {
        setError(t("errors.full-text-too-short"));
      } else if (lang == "zh") {
        setError(t("errors.too-short-cjk"));
      } else {
        setError(t("errors.too-short"));
      }
      return;
    }
    setError(null);
    const query = text.trim();
    const shouldPreserveScope =
      location.pathname === "/search" || location.pathname === "/browse";
    navigate(
      shouldPreserveScope
        ? buildSearchUrlWithPreservedScope(params, query, {
            mode,
          })
        : buildSearchUrl({ mode, q: query }),
    );
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    runSearch("name");
  };

  return (
    <Popover open={Boolean(error)}>
      <div className="order-3 min-w-0 basis-full sm:order-none sm:basis-auto sm:flex-1">
        <PopoverAnchor asChild>
          <form className="flex gap-2" onSubmit={onSubmit}>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("input.placeholder")}
              aria-invalid={Boolean(error)}
            />
            <ButtonGroup className="shrink-0">
              <Button
                type="submit"
                variant="outline"
                aria-label={t("actions.search")}
              >
                <SearchIcon className="size-4" />
                <span className="hidden sm:inline">{t("actions.search")}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => runSearch("full")}
              >
                {t("actions.search-full")}
              </Button>
            </ButtonGroup>
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
    { to: "/browse", label: t("nav.browse"), active: pathname === "/browse" },
    {
      to: "/publications",
      label: t("nav.publications"),
      active: pathname === "/publications",
    },
    {
      to: "/spellbooks/default",
      label: t("nav.favorites"),
      active: pathname === "/spellbooks/default",
    },
    {
      to: "/spellbooks/prepared",
      label: t("nav.prepared"),
      active: pathname === "/spellbooks/prepared",
    },
    {
      to: "/spellbooks",
      label: t("nav.spellbooks"),
      active:
        pathname === "/spellbooks" ||
        (pathname.startsWith("/spellbooks/") &&
          pathname !== "/spellbooks/default" &&
          pathname !== "/spellbooks/prepared"),
    },
    {
      to: "/settings",
      label: t("nav.settings"),
      active: pathname === "/settings",
    },
    { to: "/about", label: t("nav.about"), active: pathname === "/about" },
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
          aria-label={t("nav.open")}
        >
          <Menu className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 gap-0">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>{t("brand.title")}</SheetTitle>
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
      aria-label={t("language.label")}
      onValueChange={(value) => {
        if (value !== "en" && value !== "zh") return;
        setState((s) => ({ ...s, uiPrefs: { ...s.uiPrefs, lang: value } }));
      }}
    >
      <ToggleGroupItem value="en" aria-label={t("language.english")}>
        EN
      </ToggleGroupItem>
      <ToggleGroupItem value="zh" aria-label={t("language.chinese")}>
        中
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

export default function TopBar() {
  const { t } = useTranslation("topbar");

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 sm:flex-nowrap sm:gap-3 sm:px-4 sm:py-3">
        <NavLink
          to="/browse"
          className="min-w-0 flex-1 truncate text-sm font-bold sm:flex-none sm:text-base"
        >
          {t("brand.title")}
        </NavLink>

        <MobileNavMenu />
        <TopBarSearch />
        <TopBarNav />
        <div className="hidden md:block">
          <LangToggle />
        </div>
      </div>
    </header>
  );
}
