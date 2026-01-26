import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  type LinksFunction,
} from "react-router";
import appStyles from "~/app.css?url";
import { useBootstrap } from "~/bootstrap/useBootstrap";
import {
  PersistedStateProvider,
  usePersistedState,
} from "~/state/persisted-state";
import TopBar from "./layout/TopBar";
import { CollectionsProvider } from "./state/collections-state";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: appStyles },
];

const queryClient = new QueryClient();

function BootstrapBanner() {
  const { state } = usePersistedState();
  const boot = useBootstrap(state.includePrestige);

  if (boot.isLoading) {
    return <div className="p-4 border-b">Loading rules data...</div>;
  }
  if (boot.error) {
    return (
      <div className="p-4 border-b text-red-600">
        Failed to load rules data. Refresh to retry.
      </div>
    );
  }
  return null;
}

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body className="bg-white text-gray-900">
        <QueryClientProvider client={queryClient}>
          <PersistedStateProvider>
            <CollectionsProvider>
              <div className="flex flex-col min-h-screen">
                <TopBar />
                <BootstrapBanner />
                <div className="flex-1 overflow-auto">
                  <Outlet />
                </div>
              </div>
            </CollectionsProvider>
          </PersistedStateProvider>
        </QueryClientProvider>

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
