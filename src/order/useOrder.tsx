import { useQuery } from "@tanstack/react-query";
import { makeClient } from "./helpers";
import { VanityOrderSchema } from "db-vanity-model/src/order-schema.ts";

const isValidHex = (str: string): str is `0x${string}` => {
  return /^0x[0-9a-fA-F]+$/.test(str);
};

const fetchOrder = async (orderId: string) => {
  if (!isValidHex(orderId)) {
    throw new Error("Invalid order ID format");
  }
  const arkivClient = await makeClient();
  const rawRes = await arkivClient.getEntity(orderId);
  if (!rawRes) {
    throw new Error("Order not found");
  }
  let jsonParsed = null;
  try {
    const text = new TextDecoder().decode(rawRes.payload);
    jsonParsed = JSON.parse(text);
  } catch {
    throw new Error("Failed to parse JSON for order");
  }
  const parsed = VanityOrderSchema.safeParse(jsonParsed);
  if (!parsed.success) {
    throw new Error("Failed to validate order");
  }
  return parsed.data;
};

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrder(orderId),
    enabled: !!orderId,
    refetchInterval: 5000,
  });
}
