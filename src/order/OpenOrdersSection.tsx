import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ProblemList from "./ProblemList";
import {
  REQUEST_TTL_MS,
  formatDateTime,
  formatRelative,
  msToShort,
  truncateMiddle,
} from "./helpers";
import type { Problem } from "db-vanity-model/src/order-schema.ts";
import { CancelRequestMenuItem } from "./CancelRequestButton";
import { MoreVertical } from "lucide-react";
import { useExplorerUrl } from "./useExplorerUrl";

type PendingItem = {
  id: string;
  order: { timestamp: string; publicKey: string; problems: Problem[] };
};

export function OpenOrdersSection({
  pending,
  isLoading,
  error,
  now,
  pickedRequestIds,
  onShowPicked,
  title = "Posted (awaiting pickup)",
  description = "Orders waiting for providers to claim them.",
  emptyMessage = "No open orders. Create a new one to get started.",
}: {
  pending: PendingItem[];
  isLoading: boolean;
  error: unknown;
  now: number;
  pickedRequestIds: Set<string>;
  onShowPicked?: () => void;
  title?: string;
  description?: string;
  emptyMessage?: string;
}) {
  const visibleCount = pending.length;
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
          <AlertTitle>Failed to load open orders</AlertTitle>
          <AlertDescription>Try again shortly.</AlertDescription>
        </Alert>
      )}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : pending.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/40 p-6 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="border-border/60">
              <TableHead className="">Request</TableHead>
              <TableHead className="">Public key</TableHead>
              <TableHead className="">Added</TableHead>
              <TableHead className="">Expires</TableHead>
              <TableHead className="">Availability</TableHead>
              <TableHead className="">Patterns</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending.map(({ id, order }) => {
              const createdAt = new Date(order.timestamp).getTime();
              const expiresAt = createdAt + REQUEST_TTL_MS;
              const remaining = Math.max(0, expiresAt - now);
              const isPicked = pickedRequestIds.has(id);
              const availabilityClasses =
                "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

              const availabilityBadge = isPicked ? (
                <button
                  type="button"
                  onClick={onShowPicked}
                  title="View picked-up details"
                  className={`${availabilityClasses} cursor-pointer border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus-visible:ring-emerald-200 `}
                >
                  Picked up
                  <span aria-hidden>→</span>
                </button>
              ) : (
                <span
                  className={`${availabilityClasses} cursor-default border-muted-foreground/30 bg-transparent text-muted-foreground`}
                >
                  Awaiting provider
                </span>
              );

              return (
                <TableRow key={id} className="text-sm">
                  <TableCell>
                    <div className="space-y-1">
                      <a
                        href={`${explorerUrl}/entity/${id}?tab=data`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm font-medium text-foreground underline underline-offset-4"
                        title="Open in explorer"
                      >
                        {truncateMiddle(id, 10, 8)}
                      </a>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className="font-mono text-sm text-muted-foreground"
                      title={order.publicKey}
                    >
                      {truncateMiddle(order.publicKey, 14, 10)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <span
                        className="font-medium text-foreground"
                        title={formatDateTime(order.timestamp)}
                      >
                        {formatRelative(order.timestamp, now)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                      title={formatDateTime(new Date(expiresAt).toISOString())}
                    >
                      in {msToShort(remaining)}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-middle">
                    {availabilityBadge}
                  </TableCell>
                  <TableCell className="">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-2 px-3 text-sm font-medium text-primary"
                          aria-label={`View selected problems (${order.problems.length})`}
                        >
                          View ({order.problems.length})
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-96" align="end">
                        <div className="mb-2 text-sm font-semibold">
                          Selected problems
                        </div>
                        <ProblemList problems={order.problems} />
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
                        <CancelRequestMenuItem requestId={id} />
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

export default OpenOrdersSection;
