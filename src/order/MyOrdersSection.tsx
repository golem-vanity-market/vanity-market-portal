import type { Problem } from "db-vanity-model/src/order-schema.ts";
import { Coins, ExternalLink, MoreVertical } from "lucide-react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CancelRequestMenuItem } from "./CancelRequestButton";
import {
  formatCreditsFromDuration,
  formatDateTime,
  formatRelative,
  truncateMiddle,
} from "./helpers";
import ProblemList from "./ProblemList";
import { useExplorerUrl } from "./useExplorerUrl";

type Order = {
  orderId: string;
  requestId: string;
  status: "queue" | "processing" | "completed" | "cancelled";
  created: string;
  started: string | null;
  completed: string | null;
  pubKey: string;
  problems: Problem[];
  duration?: string | number;
};

export function MyOrdersSection({
  orders,
  isLoading,
  error,
  now,
  title = "Picked up & history",
  description = "Monitor in-flight work and revisit completed runs.",
  emptyMessage = "No orders yet. Once a node picks up your order, it will appear here.",
}: {
  orders: Order[];
  isLoading: boolean;
  error: unknown;
  now: number;
  title?: string;
  description?: string;
  emptyMessage?: string;
}) {
  const visibleCount = orders.length;
  const explorerUrl = useExplorerUrl();

  return (
    <section className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {isLoading ? (
          <span className="text-xs text-muted-foreground">Loading…</span>
        ) : (
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1 text-xs font-semibold"
          >
            {visibleCount}
          </Badge>
        )}
      </div>
      {!!error && (
        <Alert variant="destructive">
          <AlertTitle>Failed to load orders</AlertTitle>
          <AlertDescription>Try again shortly.</AlertDescription>
        </Alert>
      )}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/40 p-6 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="border-border/60">
              <TableHead className="">Order</TableHead>
              <TableHead className="">Request</TableHead>
              <TableHead className="">Public key</TableHead>
              <TableHead className="">Created</TableHead>
              <TableHead className="">Started</TableHead>
              <TableHead className="">Completed</TableHead>
              <TableHead className="">Cost</TableHead>
              <TableHead className="">Status</TableHead>
              <TableHead className="">Results</TableHead>
              <TableHead className="">Patterns</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => {
              const statusVariant =
                o.status === "completed"
                  ? "default"
                  : o.status === "processing"
                    ? "secondary"
                    : o.status === "cancelled"
                      ? "destructive"
                      : "outline";
              const problemsCount = o.problems?.length ?? 0;
              const availabilityClasses =
                "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
              const availabilityBadge = (() => {
                if (
                  o.status === "completed" ||
                  o.status === "processing" ||
                  o.status === "cancelled"
                ) {
                  return (
                    <Link to={`/order/${o.orderId}/results`}>
                      <button
                        type="button"
                        title="View picked-up details"
                        className={`${availabilityClasses} cursor-pointer border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus-visible:ring-emerald-200`}
                      >
                        Results
                        <span aria-hidden>→</span>
                      </button>
                    </Link>
                  );
                }
                return (
                  <span
                    className={`${availabilityClasses} cursor-default border-muted-foreground/30 bg-transparent text-muted-foreground`}
                  >
                    Awaiting provider
                  </span>
                );
              })();

              const showCancel =
                o.status !== "completed" && o.status !== "cancelled";
              return (
                <TableRow key={`${o.orderId}-${o.created}`} className="text-sm">
                  <TableCell>
                    <a
                      href={`${explorerUrl}/entity/${o.orderId}?tab=data`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm font-medium text-foreground underline underline-offset-4"
                      title="Open order in explorer"
                    >
                      {truncateMiddle(o.orderId, 10, 8)}
                    </a>
                  </TableCell>
                  <TableCell>
                    <a
                      href={`${explorerUrl}/entity/${o.requestId}?tab=data`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm text-muted-foreground underline underline-offset-4"
                      title="Open request in explorer"
                    >
                      {truncateMiddle(o.requestId, 10, 8)}
                    </a>
                  </TableCell>
                  <TableCell>
                    <span
                      className="font-mono text-sm text-muted-foreground"
                      title={o.pubKey}
                    >
                      {truncateMiddle(o.pubKey, 14, 10)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className="font-medium text-foreground"
                      title={formatDateTime(o.created)}
                    >
                      {formatRelative(o.created, now)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {o.started ? (
                      <span
                        className="font-medium text-foreground"
                        title={formatDateTime(o.started)}
                      >
                        {formatRelative(o.started, now)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {o.completed ? (
                      <span
                        className="font-medium text-foreground"
                        title={formatDateTime(o.completed)}
                      >
                        {formatRelative(o.completed, now)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 dark:text-amber-400">
                      <Coins className="size-3" />
                      {formatCreditsFromDuration(o.duration)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariant}
                      className="rounded-full px-3 py-1 capitalize"
                    >
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{availabilityBadge}</TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-2 px-3 text-sm font-medium text-primary"
                          aria-label={`View selected patterns (${problemsCount})`}
                        >
                          View ({problemsCount})
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-96" align="end">
                        <div className="mb-2 text-sm font-semibold">
                          Selected patterns
                        </div>
                        <ProblemList problems={o.problems ?? []} />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground"
                          aria-label="Open actions menu"
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <a
                            href={`${explorerUrl}/entity/${o.orderId}?tab=data`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2"
                          >
                            <ExternalLink className="size-4" />
                            <span>View order</span>
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a
                            href={`${explorerUrl}/entity/${o.requestId}?tab=data`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2"
                          >
                            <ExternalLink className="size-4" />
                            <span>View request</span>
                          </a>
                        </DropdownMenuItem>
                        {showCancel && (
                          <>
                            <DropdownMenuSeparator />
                            <CancelRequestMenuItem requestId={o.requestId} />
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

export default MyOrdersSection;
