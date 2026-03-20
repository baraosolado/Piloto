"use client";

import * as React from "react";
import {
  AlertDialog as RadixAlertDialog,
  AlertDialogAction as RadixAlertDialogAction,
  AlertDialogCancel as RadixAlertDialogCancel,
  AlertDialogContent as RadixAlertDialogContent,
  AlertDialogDescription as RadixAlertDialogDescription,
  AlertDialogOverlay as RadixAlertDialogOverlay,
  AlertDialogPortal as RadixAlertDialogPortal,
  AlertDialogTitle as RadixAlertDialogTitle,
  AlertDialogTrigger as RadixAlertDialogTrigger,
} from "@radix-ui/react-alert-dialog";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function AlertDialog({
  ...props
}: React.ComponentProps<typeof RadixAlertDialog>) {
  return <RadixAlertDialog data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof RadixAlertDialogTrigger>) {
  return (
    <RadixAlertDialogTrigger data-slot="alert-dialog-trigger" {...props} />
  );
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof RadixAlertDialogOverlay>) {
  return (
    <RadixAlertDialogOverlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof RadixAlertDialogContent>) {
  return (
    <RadixAlertDialogPortal>
      <AlertDialogOverlay />
      <RadixAlertDialogContent
        data-slot="alert-dialog-content"
        className={cn(
          "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg",
          className,
        )}
        {...props}
      />
    </RadixAlertDialogPortal>
  );
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof RadixAlertDialogTitle>) {
  return (
    <RadixAlertDialogTitle
      data-slot="alert-dialog-title"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof RadixAlertDialogDescription>) {
  return (
    <RadixAlertDialogDescription
      data-slot="alert-dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof RadixAlertDialogAction>) {
  return (
    <RadixAlertDialogAction
      className={cn(buttonVariants(), className)}
      {...props}
    />
  );
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof RadixAlertDialogCancel>) {
  return (
    <RadixAlertDialogCancel
      className={cn(buttonVariants({ variant: "outline" }), className)}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
};
