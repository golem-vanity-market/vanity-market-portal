import { useState, type ReactNode } from "react";
import { Loader2, Trash2, XCircle } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useCancelRequest } from "./useCancelRequest";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Hex } from "@arkiv-network/sdk";

type CancelRequestBaseProps = {
  requestId: string | null | undefined;
};

const DEFAULT_CONFIRMATION =
  "Are you sure you want to cancel this order? This action cannot be undone.";

export type CancelRequestButtonProps = CancelRequestBaseProps &
  Pick<ButtonProps, "size" | "variant" | "className" | "disabled"> & {
    children?: ReactNode;
  };

export type CancelRequestMenuItemProps = CancelRequestBaseProps & {
  children?: ReactNode;
};

export function CancelRequestButton({
  requestId,
  children,
  size = "sm",
  variant = "destructive",
  className,
  disabled,
}: CancelRequestButtonProps) {
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const { mutateAsync: cancel, isPending } = useCancelRequest();

  const handleConfirm = async () => {
    try {
      await cancel(requestId as Hex);
    } finally {
      setIsConfirmationOpen(false);
    }
  };
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={!requestId || disabled || isPending}
        onClick={() => setIsConfirmationOpen(true)}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <XCircle className="size-4" />
        )}
        <span>{children ?? "Cancel order"}</span>
      </Button>
      <AlertDialog
        open={isConfirmationOpen}
        onOpenChange={setIsConfirmationOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel order?</AlertDialogTitle>
            <AlertDialogDescription>
              {DEFAULT_CONFIRMATION}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmationOpen(false)}
              disabled={isPending}
            >
              Keep order
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                void handleConfirm();
              }}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 size-4" />
              )}
              <span>Cancel order</span>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default CancelRequestButton;

export function CancelRequestMenuItem({
  requestId,
  children,
}: CancelRequestMenuItemProps) {
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const { mutateAsync: cancel, isPending } = useCancelRequest();

  const handleConfirm = async () => {
    try {
      await cancel(requestId as Hex);
    } finally {
      setIsConfirmationOpen(false);
    }
  };

  return (
    <>
      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault();
          setIsConfirmationOpen(true);
        }}
        disabled={!requestId || isPending}
        className="text-destructive"
      >
        {isPending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Trash2 className="mr-2 size-4" />
        )}
        <span>{children ?? "Cancel"}</span>
      </DropdownMenuItem>
      <AlertDialog
        open={isConfirmationOpen}
        onOpenChange={setIsConfirmationOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel order?</AlertDialogTitle>
            <AlertDialogDescription>
              {DEFAULT_CONFIRMATION}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmationOpen(false)}
              disabled={isPending}
            >
              Keep order
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                void handleConfirm();
              }}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 size-4" />
              )}
              <span>Cancel order</span>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
