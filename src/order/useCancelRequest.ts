import { Hex } from "@arkiv-network/sdk";
import { makeClient, makeMetamaskClient } from "./helpers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/Toast";
import { ExpirationTime } from "@arkiv-network/sdk/utils";

async function cancelRequest(requestId: Hex): Promise<void> {
  const client = makeClient();
  const entity = await client.getEntity(requestId);
  const requestBody = entity.payload;
  if (!requestBody || !entity.attributes) {
    throw new Error("Request not found");
  }
  const bodyAsString = new TextDecoder().decode(requestBody);
  const bodyObj = JSON.parse(bodyAsString);
  bodyObj.cancelledAt = new Date().toISOString();
  const updatedBodyString = JSON.stringify(bodyObj);
  const requestBodyUpdated = new TextEncoder().encode(updatedBodyString);
  const updateBody = {
    entityKey: requestId,
    payload: requestBodyUpdated,
    expiresIn: ExpirationTime.fromDays(7),
    attributes: entity.attributes,
    contentType: entity.contentType,
  };
  await makeMetamaskClient().updateEntity(updateBody);
}
export function useCancelRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelRequest,
    onSuccess: () => {
      toast({
        title: "Order cancelled",
        description:
          "The order has been successfully cancelled. Note that it may take some time for the cancellation to be reflected on the network.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error cancelling order",
        description:
          error?.message ||
          "An unexpected error occurred while cancelling the order.",
        variant: "error",
      });
    },
    onSettled: () => {
      const KEYS_TO_INVALIDATE = [
        "myOrders",
        "order",
        "orderResults",
        "myRequests",
      ];
      KEYS_TO_INVALIDATE.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    },
  });
}
