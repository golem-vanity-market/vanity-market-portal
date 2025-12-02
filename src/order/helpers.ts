import {
  createPublicClient,
  http,
  type PublicArkivClient,
} from "@arkiv-network/sdk";
import { kaolin, mendoza, rosario } from "@arkiv-network/sdk/chains";
import { vanityDurationToSeconds } from "db-vanity-model/src/utils.ts";

// TODO: read from arkiv when it's implemented
export const REQUEST_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Credits calculation: 1 GLM = 1,000,000 credits, 1 credit = 1 minute
export const CREDITS_PER_MINUTE = 1;

export const formatCreditsFromDuration = (
  duration: string | number | undefined | null,
): string => {
  if (duration === undefined || duration === null) return "—";

  let seconds: number;
  if (typeof duration === "number") {
    // Duration is already in seconds
    seconds = duration;
  } else if (typeof duration === "string") {
    seconds = vanityDurationToSeconds(duration);
  } else {
    return "—";
  }

  if (seconds <= 0) return "—";
  const credits = Math.ceil(seconds / 60) * CREDITS_PER_MINUTE;
  if (credits >= 1_000_000) {
    return `${(credits / 1_000_000).toFixed(1)}M`;
  }
  if (credits >= 1_000) {
    return `${(credits / 1_000).toFixed(0)}K`;
  }
  return credits.toLocaleString();
};

export const truncateMiddle = (str: string, start = 6, end = 4) => {
  if (!str) return "";
  return str.length > start + end
    ? `${str.slice(0, start)}…${str.slice(-end)}`
    : str;
};

export const formatDateTime = (iso: string) => new Date(iso).toLocaleString();

export const formatRelative = (iso: string, nowMs: number) => {
  const then = new Date(iso).getTime();
  const diff = then - nowMs;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < hour) return rtf.format(Math.round(diff / minute), "minute");
  if (abs < day) return rtf.format(Math.round(diff / hour), "hour");
  return rtf.format(Math.round(diff / day), "day");
};

export const msToShort = (ms: number) => {
  if (ms <= 0) return "expired";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

type ArkivNetworkName = "rosario" | "kaolin" | "mendoza";

export const getArkivChainFromEnv = () => {
  const networkName: ArkivNetworkName =
    import.meta.env.VITE_ARKIV_CHAIN || "rosario";

  const knownChains = {
    rosario,
    kaolin,
    mendoza,
  };

  return knownChains[networkName] || rosario;
};

const publicClientGlobal = createPublicClient({
  chain: getArkivChainFromEnv(),
  transport: http(),
});

export function publicArkivClient(): PublicArkivClient {
  return publicClientGlobal;
}
