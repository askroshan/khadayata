/**
 * Radix Toast default duration is 5s and handleClose reads document.activeElement.
 * After jsdom teardown that timer used to throw "document is not defined" (pass16).
 * Toaster uses duration={Infinity} in test mode so no close timer is scheduled.
 */
import { useEffect } from "react";
import { describe, it } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { Toaster } from "@/components/ui/toaster";
import { toast, clearToasts, useToast } from "@/hooks/use-toast";

function DismissUnknownId() {
  const { dismiss } = useToast();
  useEffect(() => {
    toast({ title: "keep" });
    dismiss("no-such-toast");
    // First paint only — dismiss identity changes after each toast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

describe("toast teardown", () => {
  it("does not touch document after unmount past the default 5s duration", async () => {
    const { unmount } = render(
      <>
        <Toaster />
        <DismissUnknownId />
      </>,
    );
    toast({ title: "teardown probe" });
    unmount();
    cleanup();
    clearToasts();
    await new Promise((r) => setTimeout(r, 5500));
  });
});
