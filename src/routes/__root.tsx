import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";
import {
  Authenticated,
  ConvexReactClient,
  Unauthenticated,
} from "convex/react";
import { ConvexQueryClient, convexQuery } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/sidebar";

import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth } from "@clerk/tanstack-start";
import { api } from "convex/_generated/api";
import { cn } from "@/lib/utils";
import { SearchCommand } from "@/components/chat/search-command";
import { useCurrentUser } from "@/hooks/use-current-user";

export type RouterContext = {
  queryClient: QueryClient;
  convexQueryClient: ConvexQueryClient;
  convexClient: ConvexReactClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Zeron",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&family=IBM+Plex+Sans:ital,wght@0,100..700;1,100..700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(
      convexQuery(api.users.getCurrent, {})
    );
  },
  component: () => (
    <AppProvider>
      <RootDocument>
        <Unauthenticated>
          <main className="flex-1 relative">
            <div className="flex flex-col absolute inset-0">
              <Outlet />
            </div>
          </main>
        </Unauthenticated>
        <Authenticated>
          <SearchCommand />
          <SidebarProvider>
            <AppSidebar />
            <main className="flex-1 relative">
              <div className="flex flex-col absolute inset-0">
                <Outlet />
              </div>
            </main>
          </SidebarProvider>
        </Authenticated>
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast: "bg-sidebar! border!",
            },
          }}
        />
      </RootDocument>
    </AppProvider>
  ),
});

function AppProvider({ children }: { children: React.ReactNode }) {
  const context = Route.useRouteContext();
  return (
    <ClerkProvider>
      <QueryClientProvider client={context.queryClient}>
        <ConvexProviderWithClerk
          client={context.convexClient}
          useAuth={useAuth}
        >
          {children}
        </ConvexProviderWithClerk>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { data: user } = useCurrentUser();
  const mode = user?.appearance?.mode ?? "dark";
  const theme = user?.appearance?.theme ?? "default";
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className={cn("flex flex-col fixed inset-0", mode, theme)}>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
