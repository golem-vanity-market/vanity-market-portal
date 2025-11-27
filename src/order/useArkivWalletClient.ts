import { useAppKitProvider } from "@reown/appkit/react";
import type { Provider } from "@reown/appkit/react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useMemo } from "react";
import { custom, isHex } from "viem";
import { getArkivChainFromEnv } from "./helpers";
import { createWalletClient } from "@arkiv-network/sdk";

export function useArkivWalletClient() {
  const { walletProvider } = useAppKitProvider<Provider>("eip155");

  const { address, isConnected } = useAppKitAccount();

  const client = useMemo(() => {
    if (!isConnected || !walletProvider || !address || !isHex(address)) {
      return null;
    }
    return createWalletClient({
      account: address,
      chain: getArkivChainFromEnv(),
      transport: custom(walletProvider),
    });
  }, [isConnected, walletProvider, address]);

  return client;
}
