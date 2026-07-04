import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  index("./routes/_index.tsx"),

  route("browse", "./routes/browse.tsx"),
  route("search", "./routes/search.tsx"),
  route("spells/:id", "./routes/spells.$id.tsx"),

  route("spellbooks", "./routes/spellbooks.tsx"),
  route("spellbooks/:id", "./routes/spellbooks.$id.tsx"),

  route("settings", "./routes/settings.tsx"),
  route("about", "./routes/about.tsx"),
] satisfies RouteConfig;
