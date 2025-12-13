import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { env } from "./env";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TRPCProvider, type AppRouter } from "./trpc";
import { Toaster } from "sonner";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient();

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.VITE_SERVER_URL}`,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include',
        });
      },
    }),
  ],
});

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <RouterProvider router={router} />
      </TRPCProvider>
    </QueryClientProvider>
    <Toaster />
  </StrictMode>,
);

