import React, { useMemo, useEffect } from "react";
import { Link, Outlet } from "react-router-dom";
import { ModeToggle } from "./components/theme-toggle";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "./components/ui/navigation-menu";
import { Separator } from "./components/ui/separator";
import { Badge } from "./components/ui/badge";
import { Skeleton } from "./components/ui/skeleton";
import { Footer } from "./Footer.tsx";
import { assetsUrl } from "./utils";
import { ConnectButton } from "@/components/ConnectButton";
import { createPublicClient } from "viem";
import { rosario } from "@arkiv-network/sdk/chains";
import { http } from "@arkiv-network/sdk";

const Dashboard = () => {
  const [current_block, setCurrentBlock] = React.useState<bigint | null>(null);
  const client = useMemo(
    () =>
      createPublicClient({
        chain: rosario,
        transport: http(),
      }),
    [],
  );

  useEffect(() => {
    const update_current_block = async () => {
      try {
        const blockNumber = await client.getBlockNumber();
        setCurrentBlock(blockNumber);
      } catch (error) {
        console.error("Failed to fetch block number:", error);
      }
    };
    update_current_block();
    const interval = setInterval(update_current_block, 15000);
    return () => clearInterval(interval);
  }, [client]);

  const lightLogo = assetsUrl() + "logo_light.svg";
  const darkLogo = assetsUrl() + "logo_dark.svg";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-6">
          <Link to="/" className="flex items-center space-x-3">
            <img
              src={lightLogo}
              alt="Logo"
              className="hidden h-8 w-8 dark:block"
            />
            <img
              src={darkLogo}
              alt="Logo"
              className="block h-8 w-8 dark:hidden"
            />
            <span className="font-heading font-bold">Vanity Market</span>
          </Link>

          <div className="flex items-center space-x-4">
            <NavigationMenu className="font-heading">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuLink
                    asChild
                    className={navigationMenuTriggerStyle()}
                  >
                    <Link to="/">Home</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink
                    asChild
                    className={navigationMenuTriggerStyle()}
                  >
                    <Link to="/providers">Providers</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink
                    asChild
                    className={navigationMenuTriggerStyle()}
                  >
                    <Link to="/analytics">Analytics</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink
                    asChild
                    className={navigationMenuTriggerStyle()}
                  >
                    <Link to="/order">Orders</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
            <Separator orientation="vertical" className="h-9" />
            {current_block !== null ? (
              <Badge variant="outline" className="h-9 font-heading text-sm">
                <Link
                  to={
                    import.meta.env.VITE_ARKIV_LANDING_PAGE ||
                    "https://golem.network"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {import.meta.env.VITE_ARKIV_NETWORK_NAME || "Arkiv"} Block:{" "}
                  {current_block.toString()}
                </Link>
              </Badge>
            ) : (
              <Skeleton className="h-9 w-24" />
            )}
            <Separator orientation="vertical" className="h-9" />
            <ConnectButton />
            <Separator orientation="vertical" className="h-9" />
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 bg-muted/10">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-8 lg:px-12">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
