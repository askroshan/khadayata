import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { parseEmailsFromText } from "@/lib/bulk-invite-utils";
import { validateChapterMessage } from "@/lib/chapter-contact-utils";
import { safeErrorMessage, GENERIC_ERROR_MESSAGE } from "@/lib/error-utils";
import { getLocalizedContent } from "@/lib/i18n-utils";
import { matchScore, type MatrimonialProfile } from "@/components/matrimonial/constants";
import { reducer } from "@/hooks/use-toast";
import { useChapterSubdomain } from "@/hooks/useChapterSubdomain";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { VideoEmbed } from "@/components/VideoEmbed";

describe("pass67 wave24 tail libs & hooks branch coverage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("bulk-invite-utils: skips lines that become empty after comma split or quote stripping", () => {
    const res = parseEmailsFromText(',ignored\n"   "\nvalid@example.com');
    expect(res.valid).toEqual(["valid@example.com"]);
    expect(res.invalid).toEqual([]);
    expect(res.totalLines).toBe(3);
  });

  it("chapter-contact-utils: handles undefined subject and body", () => {
    const res = validateChapterMessage({
      from_member_id: "m1",
      to_member_id: "m2",
      chapter_id: "c1",
    });
    expect(res.valid).toBe(false);
    expect(res.errors).toContain("Subject cannot be empty.");
    expect(res.errors).toContain("Message body cannot be empty.");
  });

  it("community: resolves env overrides and defaults", async () => {
    vi.stubEnv("VITE_COMMUNITY_NAME", "CustomName");
    vi.stubEnv("VITE_COMMUNITY_FULL_NAME", "Custom Full Name");
    vi.resetModules();
    const custom = await import("@/lib/community");
    expect(custom.COMMUNITY_NAME).toBe("CustomName");
    expect(custom.COMMUNITY_FULL_NAME).toBe("Custom Full Name");

    vi.unstubAllEnvs();
    vi.resetModules();
    const defaults = await import("@/lib/community");
    expect(defaults.COMMUNITY_NAME).toBe("Khadayata");
    expect(defaults.COMMUNITY_FULL_NAME).toBe("Khadayata Heritage Directory");
  });

  it("error-utils: falls back when plain Error has empty message or backend error has no message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(safeErrorMessage(new Error(""))).toBe(GENERIC_ERROR_MESSAGE);
    expect(safeErrorMessage({ code: "99999" })).toBe(GENERIC_ERROR_MESSAGE);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("i18n-utils: falls back through gu, hi, and empty string", () => {
    expect(getLocalizedContent({ gu: "ગુજરાતી" }, "en")).toBe("ગુજરાતી");
    expect(getLocalizedContent({ hi: "हिन्दी" }, "en")).toBe("हिन्दी");
    expect(getLocalizedContent({}, "en")).toBe("");
  });

  it("matrimonial constants: matchScore returns 0 when preferences or otherProfile is missing", () => {
    const base = {
      id: "p1",
      member_id: "m1",
      preferences: {},
    } as unknown as MatrimonialProfile;

    expect(matchScore({ ...base, preferences: null as unknown as Record<string, unknown> }, base, null)).toBe(0);
    expect(matchScore(base, null as unknown as MatrimonialProfile, null)).toBe(0);
  });

  it("use-toast reducer: UPDATE_TOAST preserves non-matching toasts", () => {
    const state = {
      toasts: [{ id: "1", title: "Original" }],
    };
    const next = reducer(state, {
      type: "UPDATE_TOAST",
      toast: { id: "2", title: "Other" },
    });
    expect(next.toasts).toEqual([{ id: "1", title: "Original" }]);
  });

  it("useChapterSubdomain: queryFn returns null when subdomain is null", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useChapterSubdomain(), { wrapper });
    expect(result.current.subdomain).toBeNull();

    const query = queryClient.getQueryCache().find({ queryKey: ["chapter-subdomain", null] });
    expect(query).toBeDefined();
    let fetched: unknown = "sentinel";
    await act(async () => {
      fetched = await query!.fetch();
    });
    expect(fetched).toBeNull();
  });

  it("ErrorBoundary: renders fallback copy when thrown error has no message", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    function ThrowNoMessage(): React.ReactNode {
      throw {};
    }
    render(
      <ErrorBoundary>
        <ThrowNoMessage />
      </ErrorBoundary>,
    );
    expect(
      screen.getByText("An unexpected error occurred. Please try refreshing the page."),
    ).toBeInTheDocument();
  });

  it("VideoEmbed: returns null for unsupported URL and renders iframe for valid YouTube URL", () => {
    const { container: empty } = render(<VideoEmbed url="https://example.com/not-a-video" />);
    expect(empty.firstChild).toBeNull();

    const { container } = render(<VideoEmbed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />);
    const iframe = container.querySelector("iframe");
    expect(iframe).toBeTruthy();
    expect(iframe?.getAttribute("title")).toBe("Video");
  });
});
