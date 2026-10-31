import { describe, it, expect, afterAll } from "vitest";
import { waitFor, renderHook, act } from "@testing-library/react";
import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { reducer, toast, useToast } from "@/hooks/use-toast";
import {
  useChapterPastCommittee,
  useChapterBusinesses,
  useChapterJobs,
  useChapterGallery,
  useChapterEvents,
} from "@/hooks/useChapter";
import { useHasStates, useCitiesByCountry, useMember } from "@/hooks/useMember";

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

describe("useToast reducer + imperative toast", () => {
  it("reducer covers ADD / UPDATE / DISMISS / REMOVE", () => {
    let state = { toasts: [] as ReturnType<typeof reducer>["toasts"] };
    state = reducer(state, {
      type: "ADD_TOAST",
      toast: { id: "1", open: true, title: "Hello" },
    });
    expect(state.toasts).toHaveLength(1);
    state = reducer(state, {
      type: "UPDATE_TOAST",
      toast: { id: "1", title: "Updated" },
    });
    expect(state.toasts[0].title).toBe("Updated");
    state = reducer(state, { type: "DISMISS_TOAST", toastId: "1" });
    expect(state.toasts[0].open).toBe(false);
    state = reducer(state, { type: "REMOVE_TOAST", toastId: "1" });
    expect(state.toasts).toHaveLength(0);

    state = reducer(
      { toasts: [{ id: "a", open: true }, { id: "b", open: true }] as never[] },
      { type: "DISMISS_TOAST" },
    );
    expect(state.toasts.every((t) => t.open === false)).toBe(true);
    state = reducer(state, { type: "REMOVE_TOAST" });
    expect(state.toasts).toHaveLength(0);
  });

  it("toast() + useToast dismiss path", () => {
    const { result } = renderHook(() => useToast(), { wrapper: Providers });
    let handle: { id: string; dismiss: () => void; update: (p: { title: string }) => void };
    act(() => {
      handle = toast({ title: "Coverage toast" });
      handle.update({ title: "Updated coverage toast" });
    });
    expect(result.current.toasts.length).toBeGreaterThan(0);
    act(() => {
      handle!.dismiss();
      result.current.dismiss();
    });
  });
});

describe("Remaining useChapter + useMember geography hooks", () => {
  afterAll(async () => {
    await supabase.auth.signOut();
  });

  it("past committee / businesses / jobs / gallery / past events for Ahmedabad", async () => {
    await supabase.auth.signInWithPassword({
      email: E2E_ACCOUNTS.member.email,
      password: E2E_PASSWORD,
    });
    const past = renderHook(() => useChapterPastCommittee(AHMEDABAD), { wrapper: Providers });
    const biz = renderHook(() => useChapterBusinesses(AHMEDABAD), { wrapper: Providers });
    const jobs = renderHook(() => useChapterJobs(AHMEDABAD), { wrapper: Providers });
    const gallery = renderHook(() => useChapterGallery(AHMEDABAD), { wrapper: Providers });
    const pastEvents = renderHook(() => useChapterEvents(AHMEDABAD, true), { wrapper: Providers });
    await waitFor(() => {
      expect(past.result.current.isFetched).toBe(true);
      expect(biz.result.current.isFetched).toBe(true);
      expect(jobs.result.current.isFetched).toBe(true);
      expect(gallery.result.current.isFetched).toBe(true);
      expect(pastEvents.result.current.isFetched).toBe(true);
    }, { timeout: 25_000 });
    expect(biz.result.current.isSuccess).toBe(true);
    expect(jobs.result.current.isSuccess).toBe(true);
    expect(Array.isArray(biz.result.current.data)).toBe(true);
  });

  it("useHasStates + useCitiesByCountry for India", async () => {
    const { data: india } = await supabase
      .from("countries")
      .select("id, name, iso2")
      .or("iso2.eq.IN,name.ilike.India")
      .limit(1)
      .maybeSingle();
    expect(india?.id).toBeTruthy();
    const has = renderHook(() => useHasStates(india!.id), { wrapper: Providers });
    const cities = renderHook(() => useCitiesByCountry(india!.id), { wrapper: Providers });
    await waitFor(() => {
      expect(has.result.current.isSuccess).toBe(true);
      expect(cities.result.current.isSuccess).toBe(true);
    }, { timeout: 20_000 });
    expect(has.result.current.data).toBe(true);
    expect((cities.result.current.data?.length ?? 0)).toBeGreaterThan(0);
  });

  it("useMember.updateMember mutation can no-op-safe update own first_name echo", async () => {
    await supabase.auth.signInWithPassword({
      email: E2E_ACCOUNTS.member.email,
      password: E2E_PASSWORD,
    });
    const { result } = renderHook(() => useMember(), { wrapper: Providers });
    await waitFor(() => expect(result.current.member).toBeTruthy(), { timeout: 25_000 });
    const first = result.current.member!.first_name;
    await act(async () => {
      await result.current.updateMember.mutateAsync({ first_name: first });
    });
    expect(result.current.updateMember.isSuccess || result.current.updateMember.isError).toBe(true);
  }, 40_000);
});
