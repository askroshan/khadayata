import { describe, it, expect, afterEach, vi } from "vitest";
import { waitFor, renderHook } from "@testing-library/react";
import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { useChapterSubdomain, buildChapterUrl } from "@/hooks/useChapterSubdomain";
import { useSubdomainSSO, buildSSOUrl } from "@/hooks/useSubdomainSSO";

function Providers({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function stubHostname(hostname: string) {
  vi.stubGlobal("location", {
    ...window.location,
    hostname,
    href: `https://${hostname}/`,
    host: hostname,
    origin: `https://${hostname}`,
    pathname: "/",
    search: "",
    hash: "",
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  });
}

describe("useChapterSubdomain + buildChapterUrl (real chapter rows)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null subdomain on localhost", () => {
    stubHostname("localhost");
    const { result } = renderHook(() => useChapterSubdomain(), { wrapper: Providers });
    expect(result.current.subdomain).toBeNull();
    expect(result.current.isChapterSite).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("ignores www and app apex hosts", () => {
    stubHostname("www.khadayataonline.com");
    const www = renderHook(() => useChapterSubdomain(), { wrapper: Providers });
    expect(www.result.current.subdomain).toBeNull();

    stubHostname("app.khadayataonline.com");
    const app = renderHook(() => useChapterSubdomain(), { wrapper: Providers });
    expect(app.result.current.subdomain).toBeNull();
  });

  it("resolves ahmedabad subdomain against real chapters.subdomain", async () => {
    stubHostname("ahmedabad.khadayataonline.com");
    const { result } = renderHook(() => useChapterSubdomain(), { wrapper: Providers });
    expect(result.current.subdomain).toBe("ahmedabad");
    expect(result.current.isChapterSite).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 20_000 });
    expect(result.current.chapter?.slug ?? result.current.chapter?.name?.toLowerCase()).toMatch(
      /ahmedabad/,
    );
  });

  it("buildChapterUrl uses production host or directory fallback", () => {
    stubHostname("khadayataonline.com");
    expect(buildChapterUrl({ subdomain: "mumbai" })).toBe("https://mumbai.khadayataonline.com");

    stubHostname("localhost");
    expect(buildChapterUrl({ subdomain: "mumbai" })).toBe("/directory?chapter=mumbai");
  });
});

describe("useSubdomainSSO + buildSSOUrl", () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    await supabase.auth.signOut();
  });

  it("buildSSOUrl returns null without session", async () => {
    await supabase.auth.signOut();
    stubHostname("localhost");
    await expect(buildSSOUrl("ahmedabad")).resolves.toBeNull();
  });

  it("buildSSOUrl embeds relay for signed-in member (dev fallback)", async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: E2E_ACCOUNTS.member.email,
      password: E2E_PASSWORD,
    });
    if (error) throw error;
    stubHostname("localhost");
    const url = await buildSSOUrl("ahmedabad", "/dashboard");
    expect(url).toMatch(/\/dashboard\?chapter=ahmedabad&sso_relay=/);

    stubHostname("khadayataonline.com");
    const prod = await buildSSOUrl("mumbai", "/");
    expect(prod).toMatch(/^https:\/\/mumbai\.khadayataonline\.com\/#sso_relay=/);
  });

  it("useSubdomainSSO clears expired/invalid relay hash", async () => {
    const expired = btoa(
      JSON.stringify({
        refreshToken: "x",
        timestamp: Date.now() - 120_000,
        origin: "ahmedabad.khadayataonline.com",
      }),
    );
    stubHostname("localhost");
    window.location.hash = `sso_relay=${expired}`;
    renderHook(() => useSubdomainSSO(), { wrapper: Providers });
    await waitFor(() => {
      expect(window.location.hash === "" || !window.location.hash.includes("sso_relay")).toBe(true);
    }, { timeout: 5_000 });
  });

  it("useSubdomainSSO exchanges a live refresh token relay", async () => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email: E2E_ACCOUNTS.member.email,
      password: E2E_PASSWORD,
    });
    if (error || !data.session?.refresh_token) throw error ?? new Error("no session");

    const relay = btoa(
      JSON.stringify({
        refreshToken: data.session.refresh_token,
        timestamp: Date.now(),
        origin: "ahmedabad.khadayataonline.com",
      }),
    );
    stubHostname("localhost");
    // jsdom location.hash setter
    window.location.hash = `sso_relay=${encodeURIComponent(relay)}`;
    // decodeRelay uses atob on match group — use unencoded btoa payload in hash
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        hostname: "localhost",
        pathname: "/",
        search: "",
        hash: `#sso_relay=${relay}`,
        href: `http://localhost/#sso_relay=${relay}`,
      },
    });
    const replaceState = vi.spyOn(window.history, "replaceState");
    renderHook(() => useSubdomainSSO(), { wrapper: Providers });
    await waitFor(() => {
      expect(replaceState).toHaveBeenCalled();
    }, { timeout: 15_000 });
  });
});
