/**
 * Pass 62 — Wave 22: Branch coverage burn-down for FamilyTree, admin-utils, and Index.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { FamilyTree } from "@/components/profile/FamilyTree";
import {
  filterMembers,
  buildCsvContent,
  firstAccessibleAdminTab,
  type AdminMember,
  type UserRoles,
} from "@/lib/admin-utils";
import Index from "@/pages/Index";

beforeAll(async () => {
  await supabase.auth.signInWithPassword({
    email: E2E_ACCOUNTS.globalAdmin.email,
    password: E2E_PASSWORD,
  });
});

afterAll(async () => {
  await supabase.auth.signOut();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeChain(data: unknown, error: unknown = null) {
  const result = { data, error, count: Array.isArray(data) ? data.length : 0 };
  const chain: Record<string, unknown> = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    eq: () => chain,
    neq: () => chain,
    not: () => chain,
    in: () => chain,
    is: () => chain,
    gt: () => chain,
    gte: () => chain,
    lt: () => chain,
    lte: () => chain,
    or: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

const NO_ROLES: UserRoles = {
  isGlobalAdmin: false,
  isChapterAdmin: false,
  isDataSteward: false,
  isDirectoryManager: false,
  isEventManager: false,
  isFinanceAdmin: false,
  isPublisher: false,
  isModerator: false,
};

describe("Pass 62 — Wave 22: FamilyTree branches", () => {
  it("handles null data from family_links query (data ?? [])", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "family_links") return makeChain(null) as never;
      return makeChain([]) as never;
    });

    renderApp(<FamilyTree memberId="m-null-data" />);
    expect(await screen.findByText(/no family connections linked yet/i)).toBeInTheDocument();
  });

  it("handles null relation and missing verification_level on related member", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "family_links") {
        return makeChain([
          {
            id: "fl-1",
            relation: "spouse",
            related: { id: "rel-1", first_name: "Meera", last_name: "Shah", verification_level: null },
          },
          {
            id: "fl-2",
            relation: null,
            related: null,
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<FamilyTree memberId="m-null-rel" />);
    expect(await screen.findByText(/Meera Shah/)).toBeInTheDocument();
    expect(screen.getByText(/Other Relations/i)).toBeInTheDocument();
    expect(screen.getAllByText("L0").length).toBeGreaterThanOrEqual(2);
  });
});

describe("Pass 62 — Wave 22: admin-utils branches", () => {
  const sampleMembers: AdminMember[] = [
    {
      id: "m-1",
      user_id: "u-1",
      first_name: "Aarav",
      last_name: "Shah",
      verification_level: 2,
      onboarding_completed: true,
      chapter_id: "ch-1",
      created_at: "2026-01-10T00:00:00.000Z",
      chapters: { name: "Ahmedabad" },
    },
    {
      id: "m-2",
      user_id: "u-2",
      first_name: "Diya",
      last_name: "Patel",
      verification_level: 99,
      onboarding_completed: false,
      chapter_id: "ch-1",
      created_at: "2026-02-15T00:00:00.000Z",
      chapters: null,
    },
  ];

  it("filterMembers covers pending, suspended, and blocked statuses", () => {
    const statuses = {
      "m-1": { suspended: true, blocked: false },
      "m-2": { suspended: false, blocked: true },
    };

    const pending = filterMembers(sampleMembers, "", "all", "pending", "", "");
    expect(pending.map((m) => m.id)).toEqual(["m-2"]);

    const suspended = filterMembers(sampleMembers, "", "all", "suspended", "", "", statuses);
    expect(suspended.map((m) => m.id)).toEqual(["m-1"]);

    const blocked = filterMembers(sampleMembers, "", "all", "blocked", "", "", statuses);
    expect(blocked.map((m) => m.id)).toEqual(["m-2"]);

    const suspendedNoMap = filterMembers(sampleMembers, "", "all", "suspended", "", "");
    expect(suspendedNoMap).toEqual([]);
  });

  it("buildCsvContent falls back to Unknown for unmapped verification_level", () => {
    const csv = buildCsvContent(sampleMembers);
    expect(csv).toContain("L99 — Unknown");
    expect(csv).toContain("L2 — Trusted");
  });

  it("firstAccessibleAdminTab returns preferred tab when accessible and falls back otherwise", () => {
    const financeRoles: UserRoles = { ...NO_ROLES, isFinanceAdmin: true };
    expect(firstAccessibleAdminTab(financeRoles, "finance")).toBe("finance");
    expect(firstAccessibleAdminTab(financeRoles, "chapters")).toBe("finance");
  });
});

describe("Pass 62 — Wave 22: Index branches", () => {
  it("handles error from latestMembers query", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain(null, { message: "forced members error" }) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Index />, { route: "/" });
    await waitFor(() => {
      expect(screen.getByText(/Welcome to the Community/i)).toBeInTheDocument();
    });
  });

  it("handles null data from latestMembers query (data ?? [])", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain(null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Index />, { route: "/" });
    expect(await screen.findByText(/Be among the first to join our growing community/i)).toBeInTheDocument();
  });

  it("renders latestMembers with null first_name and last_name without photo_url", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain([
          {
            id: "mem-null-names",
            first_name: null,
            last_name: null,
            global_id: "KHD-999001",
            photo_url: null,
            verification_level: 1,
            created_at: new Date().toISOString(),
            chapters: { name: "Ahmedabad" },
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Index />, { route: "/" });
    expect(await screen.findByText("KHD-999001")).toBeInTheDocument();
  });
});
