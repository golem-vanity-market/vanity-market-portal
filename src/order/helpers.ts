import {
  createPublicClient,
  createWalletClient,
  http,
  PublicArkivClient,
} from "@arkiv-network/sdk";
import { rosario } from "@arkiv-network/sdk/chains";
import { custom } from "viem";

export const getEthereumGlobal = () => {
  if (typeof window !== "undefined" && (window as any).ethereum) {
    return (window as any).ethereum;
  }
  return null;
};

// TODO: read from arkiv when it's implemented
export const REQUEST_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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

export const makeMetamaskClient = () => {
  return createWalletClient({
    account: getEthereumGlobal().selectedAddress,
    chain: rosario,
    transport: custom(getEthereumGlobal()),
  });
};

const clientGlobal = createPublicClient({
  chain: rosario,
  transport: http(),
});

export function publicArkivClient(): PublicArkivClient {
  return clientGlobal;
}
