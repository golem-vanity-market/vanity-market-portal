import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clipboard,
  ClipboardCheck,
  Download,
  ExternalLink,
  Info,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import {
  VanityOrderResult,
  VanityOrderResultSchema,
  type Problem,
} from "db-vanity-model/src/order-schema.ts";
import { msToShort, publicArkivClient, truncateMiddle } from "./helpers";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrder } from "./useOrder";
import { getProblemMatchInfo, matchProblemToAddress } from "@/utils/difficulty";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/Toast";
import { getAddress } from "viem";
import { Badge } from "@/components/ui/badge";
import { displayDifficulty } from "@/utils";
import { CancelRequestButton } from "./CancelRequestButton";
import { eq } from "@arkiv-network/sdk/query";

const fetchOrderResults = async (orderId: string) => {
  const arkivClient = publicArkivClient();
  const query = arkivClient.buildQuery();

  const rawRes = await query
    .where([eq("vanity_market_order_result", "2"), eq("orderId", `${orderId}`)])
    .limit(20)
    .withPayload(true)
    .withMetadata(true)
    .withAttributes(true)
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
      const parsed = VanityOrderResultSchema.safeParse(jsonParsed);
      if (!parsed.success) {
        console.error("Failed to validate result:", parsed.error);
        return null;
      }
      return { id: entity.key as string, order: parsed.data };
    })
    .filter((o): o is { id: string; order: VanityOrderResult } => o !== null);
};

type ProcessingCountdownProps = {
  started?: string | Date | null;
  duration?: number | string | bigint | null;
};

function ProcessingCountdown({ started, duration }: ProcessingCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  const startedAt = started ? new Date(started).getTime() : Number.NaN;
  const durationSeconds = duration != null ? Number(duration) : Number.NaN;
  const isValidTiming =
    Number.isFinite(startedAt) &&
    Number.isFinite(durationSeconds) &&
    durationSeconds > 0;

  useEffect(() => {
    if (!isValidTiming || typeof window === "undefined") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isValidTiming, startedAt, durationSeconds]);

  if (!isValidTiming) return null;

  const remainingMs = Math.max(startedAt + durationSeconds * 1000 - now, 0);

  const label =
    remainingMs <= 1000
      ? "order finishing..."
      : `~${remainingMs < 60_000 ? "<1m" : msToShort(remainingMs)} remaining`;

  return (
    <span className="text-xs text-muted-foreground" aria-live="polite">
      {label}
    </span>
  );
}

function OrderResultsPage() {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    data: results = [],
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["orderResults", orderId],
    queryFn: () => fetchOrderResults(orderId!),
    enabled: !!orderId,
  });

  const { data: orderData } = useOrder(orderId ?? "");

  const resultsWithProblemAssigned = results.map((result) => {
    const problem = orderData
      ? matchProblemToAddress(
          getAddress(result.order.proof.address),
          orderData.problems,
        )
      : null;
    const matchInfo = problem
      ? getProblemMatchInfo(result.order.proof.address, problem)
      : null;
    return { ...result, problem, matchInfo };
  });

  const resultsSortedByRarity = resultsWithProblemAssigned.toSorted((a, b) => {
    const rarityA = a.matchInfo?.rarity ?? 0n;
    const rarityB = b.matchInfo?.rarity ?? 0n;
    if (rarityA === rarityB) return 0;
    return rarityA < rarityB ? 1 : -1;
  });

  const problemLabel = (p: Problem["type"]) => {
    switch (p) {
      case "leading-any":
        return `Leading`;
      case "trailing-any":
        return `Trailing`;
      case "letters-heavy":
        return "Letters heavy";
      case "numbers-heavy":
        return "Numbers only";
      case "snake-score-no-case":
        return "Snake score";
      case "user-prefix":
        return `Custom prefix`;
      case "user-suffix":
        return `Custom suffix`;
      case "user-mask":
        return `Custom mask`;
    }
  };

  const problems = new Set(orderData?.problems?.map((p) => p.type) ?? []);

  const getInitialFilter = () => {
    const hash = location.hash.slice(1); // Remove '#'
    return hash || "all";
  };

  const [activeFilter, setActiveFilter] = useState<string>(getInitialFilter);

  const handleFilterChange = (value: string) => {
    setActiveFilter(value);
    navigate(`#${value}`, { replace: true });
  };

  const filteredResults =
    activeFilter === "all"
      ? resultsSortedByRarity
      : resultsSortedByRarity.filter(
          (r) => r.problem && r.problem.type === activeFilter,
        );

  const problemCounts = resultsWithProblemAssigned.reduce((acc, r) => {
    if (r.problem) {
      const key = r.problem.type;
      acc.set(key, (acc.get(key) ?? 0) + 1);
    }
    return acc;
  }, new Map<Problem["type"], number>());

  const copyText = async (text: string, label = "Copied") => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: label, variant: "success" });
    } catch (e) {
      toast({ title: "Failed to copy to clipboard", variant: "error" });
      console.error(e);
    }
  };

  const downloadText = (
    filename: string,
    content: string,
    mime: string = "text/plain;charset=utf-8",
  ) => {
    try {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: "Failed to download file", variant: "error" });
      console.error(e);
    }
  };

  const toCsv = () => {
    const header = [
      "address",
      "salt",
      "provider_id",
      "provider_name",
      "provider_wallet",
      "order_id",
      "result_entity_id",
      "pub_key",
    ];
    const escape = (val: string) => {
      const s = String(val ?? "");
      if (/[",\n]/.test(s)) return '"' + s.replaceAll('"', '""') + '"';
      return s;
    };
    const rows = results.map(({ id, order }) => [
      getAddress(order.proof.address),
      order.proof.salt,
      order.provider.id,
      order.provider.name,
      order.provider.walletAddress,
      order.orderId,
      id,
      order.proof.pubKey,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map(escape).join(","))
      .join("\n");
    return csv;
  };

  // Simple deterministic color from provider id for avatar
  const colorFromId = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++)
      hash = (hash * 31 + id.charCodeAt(i)) | 0;
    const h = Math.abs(hash) % 360;
    const s = 65;
    const l = 45;
    return `hsl(${h} ${s}% ${l}%)`;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "processing":
        return "secondary";
      case "queue":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "processing":
        return "Processing";
      case "queue":
        return "Queued";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const renderHighlightedAddress = (
    address: string,
    problem: Problem | null,
  ): ReactNode => {
    if (!address.startsWith("0x")) {
      return <>{address}</>;
    }

    if (!problem) {
      return <>{address}</>;
    }

    const body = address.slice(2);
    const highlight = Array.from({ length: body.length }, () => false);

    switch (problem.type) {
      case "user-prefix": {
        const prefix = problem.specifier.replace(/^0x/, "");
        if (body.toLowerCase().startsWith(prefix.toLowerCase())) {
          const limit = Math.min(prefix.length, body.length);
          for (let i = 0; i < limit; i++) {
            highlight[i] = true;
          }
        }
        break;
      }
      case "user-suffix": {
        const suffix = problem.specifier;
        if (body.toLowerCase().endsWith(suffix.toLowerCase())) {
          const start = Math.max(body.length - suffix.length, 0);
          for (let i = start; i < body.length; i++) {
            highlight[i] = true;
          }
        }
        break;
      }
      case "user-mask": {
        const mask = problem.specifier.replace(/^0x/, "").toLowerCase();
        for (let i = 0; i < mask.length && i < body.length; i++) {
          const maskChar = mask[i];
          const addrChar = body[i];
          if (
            maskChar !== "x" &&
            addrChar &&
            addrChar.toLowerCase() === maskChar
          ) {
            highlight[i] = true;
          }
        }
        break;
      }
      case "leading-any": {
        const firstChar = body[0]?.toLowerCase();
        if (firstChar) {
          for (let i = 0; i < body.length; i++) {
            const char = body[i];
            if (char && char.toLowerCase() === firstChar) {
              highlight[i] = true;
            } else {
              break;
            }
          }
        }
        break;
      }
      case "trailing-any": {
        const lastChar = body[body.length - 1]?.toLowerCase();
        if (lastChar) {
          for (let idx = body.length - 1; idx >= 0; idx--) {
            const char = body[idx];
            if (char && char.toLowerCase() === lastChar) {
              highlight[idx] = true;
            } else {
              break;
            }
          }
        }
        break;
      }
      case "letters-heavy": {
        for (let i = 0; i < body.length; i++) {
          if (/[a-f]/i.test(body[i])) {
            highlight[i] = true;
          }
        }
        break;
      }
      case "numbers-heavy": {
        for (let i = 0; i < body.length; i++) {
          if (/[0-9]/.test(body[i])) {
            highlight[i] = true;
          }
        }
        break;
      }
      case "snake-score-no-case": {
        for (let i = 0; i < body.length - 1; i++) {
          if (body[i].toLowerCase() === body[i + 1].toLowerCase()) {
            highlight[i] = true;
            highlight[i + 1] = true;
          }
        }
        break;
      }
      default:
        break;
    }

    if (!highlight.some(Boolean)) {
      return <>{address}</>;
    }

    return (
      <>
        0x
        {Array.from(body).map((char, idx) => (
          <span
            key={idx}
            className={highlight[idx] ? "text-primary" : undefined}
          >
            {char}
          </span>
        ))}
      </>
    );
  };

  const status = orderData?.status;
  const requestId = orderData?.requestId ?? null;
  const canCancel =
    status !== undefined && status !== "completed" && status !== "cancelled";

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Results</h1>
            {orderData?.status && (
              <Badge variant={getStatusVariant(orderData.status)}>
                {getStatusLabel(orderData.status)}
              </Badge>
            )}
            {status === "processing" && (
              <ProcessingCountdown
                started={orderData?.started ?? null}
                duration={orderData?.duration ?? null}
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Addresses found for your order.
          </p>
          {orderId && (
            <div className="mt-1 text-xs text-muted-foreground">
              Order:{" "}
              <a
                href={`${import.meta.env.VITE_ARKIV_BLOCK_EXPLORER}/entity/${orderId}?tab=data`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono underline"
                title="Open order in explorer"
              >
                {truncateMiddle(orderId, 12, 10)}
              </a>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCancel && (
            <CancelRequestButton
              requestId={requestId}
              variant="link"
              size="default"
              className="text-destructive"
            />
          )}
          {!isLoading && results.length > 0 && (
            <Button
              onClick={() =>
                downloadText(
                  `order_${orderId ?? "results"}_results.csv`,
                  toCsv(),
                  "text/csv;charset=utf-8",
                )
              }
              title="Download all results as CSV"
              variant="secondary"
            >
              <Download className="mr-2 size-4" /> Download CSV
            </Button>
          )}
          {!isLoading && (
            <Button
              onClick={() => refetch()}
              title="Refresh results"
              variant="secondary"
              disabled={isLoading}
            >
              <RefreshCw className="mr-2 size-4" /> Refresh
            </Button>
          )}
          <Button asChild>
            <Link to="/order">
              <ArrowLeft className="mr-2 size-4" />
              Back to Orders
            </Link>
          </Button>
        </div>
      </div>

      {!!error && (
        <Alert variant="destructive">
          <AlertTitle>Failed to load results</AlertTitle>
          <AlertDescription>Try again shortly.</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          No results yet. If a provider finds a matching address, it will appear
          here.
        </div>
      ) : (
        <>
          {problems.size > 0 && (
            <Tabs
              value={activeFilter}
              onValueChange={handleFilterChange}
              className="w-full"
            >
              <TabsList className="mb-2">
                <TabsTrigger value="all">
                  <span>All</span>
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {resultsWithProblemAssigned.length}
                  </span>
                </TabsTrigger>
                {Array.from(problems)
                  .toSorted()
                  .map((p) => (
                    <TabsTrigger key={p} value={p}>
                      <span>{problemLabel(p)}</span>
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
                        {problemCounts.get(p) ?? 0}
                      </span>
                    </TabsTrigger>
                  ))}
              </TabsList>
            </Tabs>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Address</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="inline-flex w-full cursor-help items-center justify-end gap-1"
                          tabIndex={0}
                        >
                          Rarity
                          <Info
                            className="size-3.5 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        align="end"
                        className="max-w-xs text-left"
                      >
                        <p>
                          Estimated number of random addresses a provider would
                          need to generate before finding a match. Higher values
                          indicate rarer results.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map(({ id, order, problem, matchInfo }) => {
                const addr = getAddress(order.proof.address);
                return (
                  <TableRow key={id}>
                    <TableCell>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => copyText(addr, "Address copied")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            copyText(addr, "Address copied");
                          }
                        }}
                        className="group inline-flex max-w-full cursor-pointer items-center gap-2"
                        title="Click to copy address"
                      >
                        <span className="truncate font-mono text-sm">
                          {renderHighlightedAddress(addr, problem)}
                        </span>
                        <Clipboard className="size-4 text-muted-foreground group-hover:text-foreground" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <a
                        href={`${import.meta.env.VITE_ARKIV_BLOCK_EXPLORER}/entity/${id}?tab=data`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-sm underline"
                        title="Open result entity in explorer"
                      >
                        {truncateMiddle(id, 10, 8)}{" "}
                        <ExternalLink className="size-3" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="flex items-center gap-2">
                          <div
                            className="inline-flex size-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                            style={{
                              backgroundColor: colorFromId(order.provider.id),
                            }}
                            aria-hidden
                          >
                            {order.provider.name?.slice(0, 1).toUpperCase() ||
                              "?"}
                          </div>
                          <span className="text-sm">{order.provider.name}</span>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Provider details"
                            >
                              <Info className="size-3.5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-96" align="start">
                            <div className="space-y-2 text-sm">
                              <div className="font-semibold">
                                {order.provider.name}
                              </div>
                              <div className="font-mono text-xs break-all">
                                id: {order.provider.id}
                              </div>
                              <div className="font-mono text-xs break-all text-muted-foreground">
                                wallet: {order.provider.walletAddress}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {matchInfo ? (
                        <span
                          className="font-mono text-sm font-medium"
                          title={
                            matchInfo.powerOf16Exponent !== undefined
                              ? `~16^${matchInfo.powerOf16Exponent} ${matchInfo.summary}`
                              : matchInfo.summary
                          }
                        >
                          {displayDifficulty(Number(matchInfo.rarity))}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.proof.pubKey.startsWith("xpub") ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              copyText(
                                order.proof.salt,
                                "Derivation path copied",
                              )
                            }
                            title="Copy derivation path"
                          >
                            <ClipboardCheck className="mr-2 size-3.5" /> Copy
                            derivation path
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              copyText(order.proof.salt, "Salt copied")
                            }
                            title="Copy salt"
                          >
                            <ClipboardCheck className="mr-2 size-3.5" /> Copy
                            salt
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}

export default OrderResultsPage;
