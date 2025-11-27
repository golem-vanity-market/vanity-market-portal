import { createRoot } from "react-dom/client";
import "./index.css";
import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "./components/theme-provider";
import Dashboard from "./Dashboard.tsx";

const container = document.getElementById("root") as HTMLDivElement;
const root = createRoot(container);

import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { Toaster } from "@/components/ui/sonner";
import { getArkivChainFromEnv } from "./order/helpers.ts";
import { MyOrdersPage } from "./order/MyOrdersPage";
import { NewOrderPage } from "./order/NewOrderPage";
import OrderResultsPage from "./order/OrderResults";
import DetailsPage from "./provider/DetailsPage";
import AnalyticsPage from "./providers/AnalyticsPage";
import ProvidersPage from "./providers/ProvidersPage";
import Welcome from "./Welcome.tsx";

const arkivChain = getArkivChainFromEnv();

const queryClient = new QueryClient();

queryClient.getQueryCache().subscribe((event) => {
  if (event.type === "updated" && event.action.type === "failed") {
    const query = event.query;
    const error = event.action.error;

    console.groupCollapsed(`🛑 Query Failed (${query.queryHash})`);
    console.log("Error:", error);
    console.log("Query Key:", query.queryKey);
    console.log("Failure Count:", query.state.fetchFailureCount);
    console.groupEnd();
  }
});

const router = createBrowserRouter(
  [
    {
      element: <Dashboard />,
      children: [
        {
          path: "/",
          index: true,
          element: <Welcome />,
        },
        {
          path: "/providers",
          element: <ProvidersPage />,
        },
        {
          path: "/analytics",
          element: <AnalyticsPage />,
        },
        {
          path: "/provider",
          element: <DetailsPage />,
        },
        {
          path: "/order",
          element: <MyOrdersPage />,
        },
        {
          path: "/order/new",
          element: <NewOrderPage />,
        },
        {
          path: "/order/:orderId/results",
          element: <OrderResultsPage />,
        },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
);

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "";

const wagmiAdapter = new WagmiAdapter({
  networks: [arkivChain],
  projectId,
  ssr: false,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks: [arkivChain],
  projectId,
  features: {
    analytics: false,
    socials: false,
    email: false,
  },
  chainImages: {
    [arkivChain.id]: `https://arkiv.network/images/arkiv-logo.svg`,
  },
  themeVariables: {
    "--w3m-accent": "var(--color-primary)",
    "--w3m-font-family": "var(--font-heading)",
    "--w3m-border-radius-master": "2px",
  },
});

root.render(
  <React.StrictMode>
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="ui-theme">
          <RouterProvider router={router} />
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
);
