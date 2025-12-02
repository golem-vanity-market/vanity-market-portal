import { Check, Coins, Copy, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const OWNER_ADDRESS = import.meta.env.VITE_ARKIV_OWNER_ADDRESS || "0x...";
const GLM_TO_CREDITS_RATIO = 1_000_000;

interface TopUpCreditsDialogProps {
  currentBalance: string;
  trigger?: React.ReactNode;
}

function formatCreditsFromGLM(glmAmount: string): string {
  const num = parseFloat(glmAmount) || 0;
  const credits = num * GLM_TO_CREDITS_RATIO;
  if (credits >= 1_000_000) {
    return `${(credits / 1_000_000).toFixed(1)}M`;
  }
  if (credits >= 1_000) {
    return `${(credits / 1_000).toFixed(0)}K`;
  }
  return credits.toLocaleString();
}

export function TopUpCreditsDialog({
  currentBalance,
  trigger,
}: TopUpCreditsDialogProps) {
  const [amount, setAmount] = useState("1");
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(OWNER_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const presetAmounts = ["0.1", "0.5", "1", "5", "10"];

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
          >
            <Plus className="size-3" />
            Top Up
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg">Top Up Credits</DialogTitle>
          <DialogDescription className="text-xs">
            Send GLM to get credits. 1 GLM = 1,000,000 credits.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Balance - compact */}
          <div className="flex items-center justify-between rounded-md bg-amber-500/10 px-3 py-2">
            <span className="text-xs text-muted-foreground">Your balance</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {currentBalance}
            </span>
          </div>

          {/* Amount Selection - cleaner */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Amount</span>
              <span className="text-xs text-muted-foreground">
                = {formatCreditsFromGLM(amount)} credits
              </span>
            </div>
            <div className="flex gap-1.5">
              {presetAmounts.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                    amount === preset
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80",
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
            <div className="relative">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-9 pr-12 font-mono text-sm"
                placeholder="0.00"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                GLM
              </span>
            </div>
          </div>

          {/* Send to address - compact */}
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Send to</span>
            <button
              type="button"
              onClick={copyAddress}
              className="flex w-full items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-left transition-colors hover:bg-muted/50"
            >
              <code className="truncate text-xs text-muted-foreground">
                {OWNER_ADDRESS}
              </code>
              {copied ? (
                <Check className="size-3.5 shrink-0 text-green-500" />
              ) : (
                <Copy className="size-3.5 shrink-0 text-muted-foreground" />
              )}
            </button>
            <p className="text-[10px] text-muted-foreground">
              Click to copy • Credits added after confirmation
            </p>
          </div>

          {/* Summary */}
          <div className="rounded-md border-2 border-dashed border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">You send</div>
                <div className="text-lg font-bold">{amount || "0"} GLM</div>
              </div>
              <div className="text-2xl text-muted-foreground">→</div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">You receive</div>
                <div className="text-lg font-bold text-amber-500">
                  {formatCreditsFromGLM(amount)}
                </div>
                <div className="text-[10px] text-muted-foreground">credits</div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Button className="w-full gap-2" disabled>
            <Coins className="size-4" />
            Transfer {amount || "0"} GLM
            <span className="rounded bg-primary-foreground/20 px-1.5 py-0.5 text-[10px]">
              Soon
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
