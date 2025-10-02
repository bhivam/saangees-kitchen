import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { env } from "./env";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MerchantHome } from "./pages/home";
import { TRPCProvider, type AppRouter } from "./trpc";
import { Toaster } from "sonner";

const queryClient = new QueryClient();

const trpcClient = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: `${env.VITE_SERVER_URL}` })],
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <MerchantHome />
      </TRPCProvider>
    </QueryClientProvider>
    <Toaster />
  </StrictMode>,
);

