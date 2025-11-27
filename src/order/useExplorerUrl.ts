import { useAppKitNetwork } from "@reown/appkit/react";

export function useExplorerUrl() {
  const { caipNetwork } = useAppKitNetwork();
  const explorerUrl =
    caipNetwork?.blockExplorers?.default.url ||
    "https://explorer.arkiv.network";
  return explorerUrl;
}
