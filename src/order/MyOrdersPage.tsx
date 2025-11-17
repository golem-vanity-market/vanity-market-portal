import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppKitAccount } from "@reown/appkit/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Loader2, PlusCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import {
  REQUEST_TTL_MS,
  msToShort,
  makeMetamaskClient,
  publicArkivClient,
  getEthereumGlobal,
} from "./helpers";
import OrdersExplainer from "./OrdersExplainer";
import OpenOrdersSection from "./OpenOrdersSection";
import MyOrdersSection from "./MyOrdersSection";
import {
  VanityOrderSchema,
  VanityRequestWithTimestampSchema,
  type VanityRequestWithTimestamp,
} from "db-vanity-model/src/order-schema.ts";
import { z } from "zod";
import { getAddress } from "viem";

import { eq } from "@arkiv-network/sdk/query";

const VALID_TABS = ["awaiting", "queued", "processing", "completed"] as const;
type TabKey = (typeof VALID_TABS)[number];
const VALID_TAB_SET = new Set<TabKey>(VALID_TABS);

function getConnectedAddress(): string {
  let address = "";

  try {
    address = getEthereumGlobal().selectedAddress;
  } catch (e) {
    console.error("Method 2 to get address failed", e);
  }

  //normalize address
  try {
    address = getAddress(address);
  } catch (e) {
    console.error("Failed to normalize address", e);
    throw new Error("Failed to normalize address");
  }
  return address;
}

const fetchMyRequests = async (showAllOrders: boolean) => {
  const arkivClient = publicArkivClient();
  let rawRes;
  if (showAllOrders) {
    rawRes = await arkivClient.query(`vanity_market_request="5"`);
  } else {
    rawRes = await arkivClient.query(
      `vanity_market_request="5" && $owner="${getConnectedAddress()}"`,
    );
  }
  return rawRes
    .map((entity) => {
      let jsonParsed = null;
      try {
        const text = new TextDecoder().decode(entity.payload);
        jsonParsed = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse JSON for order:", e);
        return null;
      }
      const parsed = VanityRequestWithTimestampSchema.safeParse(jsonParsed);
      if (!parsed.success) {
        console.error("Failed to validate request:", parsed.error);
        return null;
      }
      return { id: entity.key as string, order: parsed.data };
    })
    .filter(
      (o): o is { id: string; order: VanityRequestWithTimestamp } => o !== null,
    )
    .sort(
      (a, b) =>
        new Date(b.order.timestamp).getTime() -
        new Date(a.order.timestamp).getTime(),
    );
};

async function fetchOrders(allOrders: boolean) {
  const arkivClient = publicArkivClient();

  const query = arkivClient.buildQuery();

  const whereConditions = [eq("vanity_market_order", "5")];
  if (!allOrders) {
    whereConditions.push(eq("vanity_market_order", "5"));
  }
  const rawRes = await query
    .where(whereConditions)
    .withPayload(true)
    .withMetadata(true)
    .fetch();
  return rawRes.entities
    .map((entity) => {
      let jsonParsed = null;
      try {
        const text = new TextDecoder().decode(entity.payload);
        jsonParsed = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse JSON for order:", e);
        return null;
      }
      const parsed = VanityOrderSchema.safeParse(jsonParsed);
      if (!parsed.success) {
        console.error("Failed to validate order:", parsed.error);
        return null;
      }
      return { ...parsed.data, orderId: entity.key };
    })
    .filter(
      (
        o,
      ): o is z.infer<typeof VanityOrderSchema> & { orderId: `0x${string}` } =>
        o !== null,
    )
    .sort(
      (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
    );
}

export const MyOrdersPage = () => {
  const [showAllOrders, setShowAllOrders] = useState(() => {
    return localStorage.getItem("showAllOrders") === "true";
  });
  const enableShowAllOrders =
    localStorage.getItem("enableShowAllOrders") === "true";

  const {
    data: myRequests = [],
    isLoading: isRequestsLoading,
    error: requestsError,
    refetch: refetchRequests,
    isFetching: isRequestsFetching,
  } = useQuery<{ id: string; order: VanityRequestWithTimestamp }[]>({
    queryKey: ["myRequests", showAllOrders],
    queryFn: () => fetchMyRequests(showAllOrders),
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    retry: (failureCount, error) => {
      console.error(
        `Fetch my requests failed attempt #${failureCount}:`,
        error,
      );
      return false;
    },
  });

  type VanityOrder = z.infer<typeof VanityOrderSchema> & { orderId: string };
  const {
    data: myOrders = [],
    isLoading: isOrdersLoading,
    error: ordersError,
    refetch: refetchOrders,
    isFetching: isOrdersFetching,
  } = useQuery<VanityOrder[]>({
    queryKey: ["myOrders", showAllOrders],
    queryFn: () => fetchOrders(showAllOrders),
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    retry: (failureCount, error) => {
      console.error(
        `Fetch my requests failed attempt #${failureCount}:`,
        error,
      );
      return false;
    },
  });

  const { isConnected } = useAppKitAccount();
  const [now, setNow] = useState(() => Date.now());
  const [tab, setTab] = useState<TabKey>(() => {
    if (typeof window === "undefined") return "awaiting";
    const hash = window.location.hash.replace(/^#/, "");
    if (VALID_TAB_SET.has(hash as TabKey)) return hash as TabKey;
    return "awaiting";
  });
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = `#${tab}`;
    if (window.location.hash !== target) {
      window.history.replaceState(null, "", target);
    }
  }, [tab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (VALID_TAB_SET.has(hash as TabKey)) {
        setTab(hash as TabKey);
      }
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  if (!isConnected) {
    return <Alert>Please connect your wallet to view your orders.</Alert>;
  }

  const pickedRequestIds = new Set(myOrders.map((order) => order.requestId));
  const awaitingRequests = myRequests.filter((request) => {
    const createdAt = new Date(request.order.timestamp).getTime();
    if (!Number.isFinite(createdAt)) return false;
    const expiresAt = createdAt + REQUEST_TTL_MS;
    return !pickedRequestIds.has(request.id) && expiresAt > now;
  });
  const queuedOrders = myOrders.filter((order) => order.status === "queue");
  const processingOrders = myOrders.filter(
    (order) => order.status === "processing",
  );
  const completedOrders = myOrders.filter(
    (order) => order.status === "completed" || order.status === "cancelled",
  );

  const awaitingPickupCount = awaitingRequests.length;
  const activeOrdersCount = queuedOrders.length + processingOrders.length;
  const completedOrdersCount = completedOrders.length;
  const totalOrders = myOrders.length;
  const completionRate =
    totalOrders > 0
      ? Math.round((completedOrdersCount / totalOrders) * 100)
      : 0;

  const turnaroundDurations = myOrders
    .filter((order) => order.completed)
    .map(
      (order) =>
        new Date(order.completed as string).getTime() -
        new Date(order.created).getTime(),
    )
    .filter((ms) => Number.isFinite(ms) && ms > 0);

  const averageTurnaround =
    turnaroundDurations.length > 0
      ? Math.round(
          turnaroundDurations.reduce((total, ms) => total + ms, 0) /
            turnaroundDurations.length,
        )
      : null;

  const pickupDurations = myOrders
    .filter((order) => order.started)
    .map(
      (order) =>
        new Date(order.started as string).getTime() -
        new Date(order.created).getTime(),
    )
    .filter((ms) => Number.isFinite(ms) && ms > 0);

  const averagePickup =
    pickupDurations.length > 0
      ? Math.round(
          pickupDurations.reduce((total, ms) => total + ms, 0) /
            pickupDurations.length,
        )
      : null;

  const stats = {
    awaitingPickup: awaitingPickupCount,
    activeOrders: activeOrdersCount,
    completedOrders: completedOrdersCount,
    totalOrders,
    completionRate,
    averageTurnaround,
    averagePickup,
  };

  const anyFetching = isRequestsFetching || isOrdersFetching;
  const completionRateLabel = stats.totalOrders
    ? `${stats.completionRate}%`
    : "—";
  const averageTurnaroundLabel = stats.averageTurnaround
    ? msToShort(stats.averageTurnaround)
    : "—";
  const averagePickupLabel = stats.averagePickup
    ? msToShort(stats.averagePickup)
    : "—";

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-border/70 bg-card/95 p-8 shadow-lg shadow-primary/10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Orders overview
            </span>
            <div className="space-y-2">
              <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
                My Activity
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Track everything you have posted to the vanity marketplace and
                monitor progress in real time.
              </p>
            </div>
          </div>
          <div className="flex w-full justify-start sm:w-auto sm:justify-end">
            <Button asChild size="lg" className="h-11 rounded-xl px-6">
              <Link to="/order/new" title="Create a new order">
                <PlusCircle className="size-4" />
                New Order
              </Link>
            </Button>
            {enableShowAllOrders && (
              <Button onClick={() => setShowAllOrders(!showAllOrders)}>
                Show all orders
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-none bg-background/90 shadow-sm shadow-primary/10">
          <CardHeader className="p-5 pb-3">
            <CardDescription className="text-xs font-semibold text-muted-foreground/80">
              Awaiting pickup
            </CardDescription>
            <CardTitle className="text-3xl font-semibold">
              {stats.awaitingPickup}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 text-sm text-muted-foreground">
            Orders still visible in the public queue.
          </CardContent>
        </Card>
        <Card className="border-none bg-background/90 shadow-sm shadow-primary/10">
          <CardHeader className="p-5 pb-3">
            <CardDescription className="text-xs font-semibold text-muted-foreground/80">
              Active pipeline
            </CardDescription>
            <CardTitle className="text-3xl font-semibold">
              {stats.activeOrders}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 text-sm text-muted-foreground">
            {stats.completedOrders} completed out of {stats.totalOrders} posted.
          </CardContent>
        </Card>
        <Card className="border-none bg-primary/5 shadow-sm shadow-primary/20">
          <CardHeader className="p-5 pb-3">
            <CardDescription className="text-xs font-semibold text-primary/80">
              Completion rate
            </CardDescription>
            <CardTitle className="text-3xl font-semibold text-primary">
              {completionRateLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 text-sm text-primary/90">
            Completed {stats.completedOrders} orders so far.
          </CardContent>
        </Card>
        <Card className="border-none bg-background/90 shadow-sm shadow-primary/10">
          <CardHeader className="p-5 pb-4">
            <CardDescription className="text-xs font-semibold text-muted-foreground/80">
              Average Processing speed
            </CardDescription>
            <CardTitle className="text-3xl font-semibold">
              {averageTurnaroundLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <dl className="grid gap-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground/80">Avg pickup</dt>
                <dd className="mt-1 text-base font-semibold text-foreground">
                  {averagePickupLabel}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <OrdersExplainer />

      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (VALID_TAB_SET.has(value as TabKey)) {
            setTab(value as TabKey);
          }
        }}
        className="w-full"
      >
        <div className="rounded-3xl border border-border/70 shadow-lg shadow-primary/10">
          <div className="flex flex-col gap-4 border-b border-border/70 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <TabsList className="h-auto gap-2 rounded-full bg-background/80 p-1">
              <TabsTrigger
                value="awaiting"
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow"
              >
                Awaiting
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {awaitingRequests.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="queued"
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow"
              >
                Queued
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {queuedOrders.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="processing"
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow"
              >
                Processing
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {processingOrders.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow"
              >
                Completed
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {completedOrders.length}
                </span>
              </TabsTrigger>
            </TabsList>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  Promise.allSettled([refetchRequests(), refetchOrders()]);
                }}
                disabled={anyFetching}
                title="Refresh both lists"
              >
                {anyFetching ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 size-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>
          <div className="space-y-6 p-4 sm:p-6">
            <TabsContent value="awaiting" className="mt-0">
              <OpenOrdersSection
                pending={awaitingRequests}
                isLoading={isRequestsLoading}
                error={requestsError}
                now={now}
                pickedRequestIds={pickedRequestIds}
                onShowPicked={() => setTab("queued")}
                title="Awaiting pickup"
                description="Requests that do not yet have a corresponding order."
                emptyMessage="No requests awaiting pickup."
              />
            </TabsContent>
            <TabsContent value="queued" className="mt-0">
              <MyOrdersSection
                orders={queuedOrders}
                isLoading={isOrdersLoading}
                error={ordersError}
                now={now}
                title="Queued orders"
                description="Orders awaiting processing by a provider."
                emptyMessage="No queued orders right now."
              />
            </TabsContent>
            <TabsContent value="processing" className="mt-0">
              <MyOrdersSection
                orders={processingOrders}
                isLoading={isOrdersLoading}
                error={ordersError}
                now={now}
                title="Processing orders"
                description="Orders currently being worked on by providers."
                emptyMessage="No orders are processing at the moment."
              />
            </TabsContent>
            <TabsContent value="completed" className="mt-0">
              <MyOrdersSection
                orders={completedOrders}
                isLoading={isOrdersLoading}
                error={ordersError}
                now={now}
                title="Completed orders"
                description="All finished orders and their results."
                emptyMessage="No completed orders yet."
              />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
};
