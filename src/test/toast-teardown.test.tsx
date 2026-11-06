/**
 * Radix Toast default duration is 5s and handleClose reads document.activeElement.
 * After jsdom teardown that timer used to throw "document is not defined" (pass16).
 * Toaster uses duration={Infinity} in test mode so no close timer is scheduled.
 */
import { describe, it } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { Toaster } from "@/components/ui/toaster";
import { toast, clearToasts } from "@/hooks/use-toast";

describe("toast teardown", () => {
  it("does not touch document after unmount past the default 5s duration", async () => {
    const { unmount } = render(<Toaster />);
    toast({ title: "teardown probe" });
    unmount();
    cleanup();
    clearToasts();
    await new Promise((r) => setTimeout(r, 5500));
  });
});
