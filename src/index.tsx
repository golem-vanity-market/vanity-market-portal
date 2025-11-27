import { createRoot } from "react-dom/client";
import "./index.css";
import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Dashboard from "./Dashboard.tsx";
import { ThemeProvider } from "./components/theme-provider";
const container = document.getElementById("root") as HTMLDivElement;
const root = createRoot(container);

import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import Welcome from "./Welcome.tsx";
import ProvidersPage from "./providers/ProvidersPage";
import AnalyticsPage from "./providers/AnalyticsPage";
import { NewOrderPage } from "./order/NewOrderPage";
import { MyOrdersPage } from "./order/MyOrdersPage";
import DetailsPage from "./provider/DetailsPage";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { createAppKit } from "@reown/appkit/react";
import { WagmiProvider } from "wagmi";
import { Toaster } from "@/components/ui/sonner";
import OrderResultsPage from "./order/OrderResults";
import { getArkivChainFromEnv } from "./order/helpers.ts";

const arkivChain = getArkivChainFromEnv();

const queryClient = new QueryClient();

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
