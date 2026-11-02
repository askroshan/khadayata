import { describe, it, expect, afterAll } from "vitest";
import { waitFor, renderHook } from "@testing-library/react";
import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import {
  useChapterBySlug,
  useChapterMemberCount,
  useChapterMembers,
  useChapterCommittee,
  useChapterEvents,
  useChapterNews,
  useTotalMemberCount,
  useTotalChapterCount,
  useTotalBusinessCount,
  useTotalCountryCount,
} from "@/hooks/useChapter";
import {
  useMember,
  useChapters,
  useCountries,
  useStates,
  useCities,
} from "@/hooks/useMember";
import { useRoles, usePermissions } from "@/hooks/useRoles";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";

const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";

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

async function signIn(email: string) {
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: E2E_PASSWORD,
  });
  if (error) throw error;
}

describe("Hook coverage against real Supabase", () => {
  afterAll(async () => {
    await supabase.auth.signOut();
  });

  it("useTotalMemberCount returns real census", async () => {
    const { result } = renderHook(() => useTotalMemberCount(), { wrapper: Providers });
    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 20_000 });
    expect(result.current.data).toBeGreaterThan(100);
  });

  it("useTotalChapterCount returns real chapters", async () => {
    const { result } = renderHook(() => useTotalChapterCount(), { wrapper: Providers });
    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 20_000 });
    expect(result.current.data).toBeGreaterThan(10);
  });

  it("useTotalBusinessCount and useTotalCountryCount resolve", async () => {
    const biz = renderHook(() => useTotalBusinessCount(), { wrapper: Providers });
    const countries = renderHook(() => useTotalCountryCount(), { wrapper: Providers });
    await waitFor(() => {
      expect(biz.result.current.isSuccess).toBe(true);
      expect(countries.result.current.isSuccess).toBe(true);
    }, { timeout: 20_000 });
    expect(typeof biz.result.current.data).toBe("number");
    expect((countries.result.current.data ?? 0)).toBeGreaterThan(0);
  });

  it("useChapterBySlug loads Ahmedabad", async () => {
    const { result } = renderHook(() => useChapterBySlug("ahmedabad"), { wrapper: Providers });
    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 20_000 });
    expect(result.current.data?.name?.toLowerCase()).toMatch(/ahmedabad/);
  });

  it("useChapterMemberCount / members / committee / events / news", async () => {
    // Chapter member roster is RLS-gated for authenticated members.
    await signIn(E2E_ACCOUNTS.member.email);
    const count = renderHook(() => useChapterMemberCount(AHMEDABAD), { wrapper: Providers });
    const members = renderHook(() => useChapterMembers(AHMEDABAD), { wrapper: Providers });
    const committee = renderHook(() => useChapterCommittee(AHMEDABAD), { wrapper: Providers });
    const events = renderHook(() => useChapterEvents(AHMEDABAD), { wrapper: Providers });
    const news = renderHook(() => useChapterNews(AHMEDABAD), { wrapper: Providers });
    await waitFor(() => {
      expect(count.result.current.isFetched).toBe(true);
      expect(members.result.current.isFetched).toBe(true);
      expect(committee.result.current.isFetched).toBe(true);
      expect(events.result.current.isFetched).toBe(true);
      expect(news.result.current.isFetched).toBe(true);
    }, { timeout: 25_000 });
    expect(count.result.current.isSuccess).toBe(true);
    expect(members.result.current.isSuccess).toBe(true);
    expect(Array.isArray(members.result.current.data)).toBe(true);
    expect(events.result.current.isSuccess).toBe(true);
    expect(news.result.current.isSuccess).toBe(true);
  });

  it("useChapters / useCountries geography", async () => {
    const chapters = renderHook(() => useChapters(), { wrapper: Providers });
    const countries = renderHook(() => useCountries(), { wrapper: Providers });
    await waitFor(() => {
      expect(chapters.result.current.isSuccess).toBe(true);
      expect(countries.result.current.isSuccess).toBe(true);
    }, { timeout: 20_000 });
    expect((chapters.result.current.data?.length ?? 0)).toBeGreaterThan(10);
    const india = countries.result.current.data?.find((c) => c.iso2 === "IN" || /india/i.test(c.name));
    expect(india).toBeTruthy();
    if (india) {
      const states = renderHook(() => useStates(india.id), { wrapper: Providers });
      await waitFor(() => expect(states.result.current.isSuccess).toBe(true), { timeout: 20_000 });
      expect((states.result.current.data?.length ?? 0)).toBeGreaterThan(0);
      const firstState = states.result.current.data![0];
      const cities = renderHook(() => useCities(firstState.id), { wrapper: Providers });
      await waitFor(() => expect(cities.result.current.isSuccess).toBe(true), { timeout: 20_000 });
      expect(Array.isArray(cities.result.current.data)).toBe(true);
    }
  });

  it("useMember + useRoles for Global Admin", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    // Give AuthProvider a live session before hooks query members/roles.
    const { data: sessionCheck } = await supabase.auth.getSession();
    expect(sessionCheck.session?.user).toBeTruthy();

    const member = renderHook(() => useMember(), { wrapper: Providers });
    await waitFor(
      () => {
        expect(member.result.current.isLoading).toBe(false);
        expect(member.result.current.member).toBeTruthy();
      },
      { timeout: 25_000 },
    );

    const roles = renderHook(() => useRoles(), { wrapper: Providers });
    await waitFor(
      () => {
        expect(roles.result.current.isLoading).toBe(false);
        expect(roles.result.current.isGlobalAdmin).toBe(true);
      },
      { timeout: 25_000 },
    );
    expect(roles.result.current.isAnyAdmin).toBe(true);

    const perms = renderHook(() => usePermissions(), { wrapper: Providers });
    await waitFor(() => expect(perms.result.current.canVerifyMembers).toBe(true), { timeout: 15_000 });
  });

  it("useMember for regular member has no admin role", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const roles = renderHook(() => useRoles(), { wrapper: Providers });
    await waitFor(() => expect(roles.result.current.isLoading).toBe(false), { timeout: 25_000 });
    expect(roles.result.current.isAnyAdmin).toBe(false);
  });

  it("useIsMobile and useToast are callable", () => {
    const mobile = renderHook(() => useIsMobile(), { wrapper: Providers });
    expect(typeof mobile.result.current).toBe("boolean");
    const toast = renderHook(() => useToast(), { wrapper: Providers });
    expect(typeof toast.result.current.toast).toBe("function");
  });
});
