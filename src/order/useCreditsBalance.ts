import { eq } from "@arkiv-network/sdk/query";
import { useAppKitAccount } from "@reown/appkit/react";
import { useQuery } from "@tanstack/react-query";
import * as z from "zod/v4";
import { publicArkivClient } from "./helpers";

const BalanceEntitySchema = z.object({
  address: z.string().min(42).max(42),
  credits: z.string(), // stored as string to avoid BigInt serialization issues
  createdAt: z.number(),
  updatedAt: z.number(),
});

const BALANCE_PROTOCOL_VERSION = 1;

export function useCreditsBalance() {
  const { address } = useAppKitAccount();
  return useQuery({
    queryKey: ["credits-balance", address],
    queryFn: async () => {
      if (!address) return 0n;
      const existingBalanceResponse = await publicArkivClient()
        .buildQuery()
        .where([
          eq("entityType", "vanity_payment_balance"),
          eq("protocolVersion", BALANCE_PROTOCOL_VERSION),
          eq("address", address.toLowerCase()),
        ])
        .ownedBy(import.meta.env.VITE_ARKIV_OWNER_ADDRESS)
        .limit(1)
        .withPayload()
        .withAttributes()
        .fetch();

      const existingEntity = existingBalanceResponse.entities[0];

      if (!existingEntity) {
        return 0n;
      }
      const {
        success,
        data: parsedEntity,
        error,
      } = BalanceEntitySchema.safeParse(existingEntity.toJson());
      if (!success) {
        console.error("Failed to parse balance entity:", error);
        return 0n;
      }

      const existingCredits = BigInt(parsedEntity.credits);
      return existingCredits;
    },
    enabled: !!address,
    staleTime: 60 * 1000, // 1 minute
  });
}
