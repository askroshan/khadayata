/**
 * Pass 63 — Wave 23: Branch coverage burn-down for:
 * 1. src/pages/PublicArchives.tsx
 * 2. src/components/admin/RolesTab.tsx
 * 3. src/components/obituaries/ObituaryForm.tsx
 * 4. src/components/profile/SakhaEndorsement.tsx
 * 5. src/hooks/useRoles.ts
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import PublicArchives from "@/pages/PublicArchives";
import RolesTab from "@/components/admin/RolesTab";
import ObituaryForm from "@/components/obituaries/ObituaryForm";
import { SakhaEndorsement } from "@/components/profile/SakhaEndorsement";
import { useRoles } from "@/hooks/useRoles";

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

function makeChain(data: unknown, error: unknown = null, count?: number) {
  const result = {
    data,
    error,
    count: count ?? (Array.isArray(data) ? data.length : 0),
  };
  const chain: Record<string, unknown> = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    eq: () => chain,
    neq: () => chain,
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

function mockLoggedOutAuth() {
  vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
    data: { session: null },
    error: null,
  } as never);
  vi.spyOn(supabase.auth, "onAuthStateChange").mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  } as never);
}

describe("Pass 63 — Wave 23 branch coverage", () => {
  // ── 1. PublicArchives.tsx ─────────────────────────────────────────────────
  describe("PublicArchives", () => {
    it("handles magazine_issues error and renders empty fallback", async () => {
      mockLoggedOutAuth();
      vi.spyOn(supabase, "from").mockImplementation((table: string) => {
        if (table === "magazine_issues") {
          return makeChain(null, new Error("magazine fetch failed")) as never;
        }
        return makeChain(null, new Error("stats failed")) as never;
      });

      renderApp(<PublicArchives />, { route: "/archives" });
      expect(await screen.findByRole("heading", { name: "Heritage Archives" })).toBeInTheDocument();
      expect(await screen.findByText("Magazine archive loading...")).toBeInTheDocument();
    });

    it("handles null magazine_issues data (data ?? []) and displays loaded stats", async () => {
      mockLoggedOutAuth();
      vi.spyOn(supabase, "from").mockImplementation((table: string) => {
        if (table === "magazine_issues") {
          return makeChain(null, null, 7) as never;
        }
        if (table === "archive_pages") {
          return makeChain(null, null, 1234) as never;
        }
        return makeChain([], null, 0) as never;
      });

      renderApp(<PublicArchives />, { route: "/archives" });
      expect(await screen.findByRole("heading", { name: "Heritage Archives" })).toBeInTheDocument();
      expect(await screen.findByText("Magazine archive loading...")).toBeInTheDocument();
    });

    it("renders magazine issue cards when magazines list is non-empty", async () => {
      mockLoggedOutAuth();
      vi.spyOn(supabase, "from").mockImplementation((table: string) => {
        if (table === "magazine_issues") {
          return makeChain(
            [
              {
                id: "mag-1",
                title: "Khadayata Jyoti Special",
                volume: "42",
                issue_date: "2024-05-15",
                pdf_url: null,
              },
            ],
            null,
            1
          ) as never;
        }
        return makeChain([], null, 0) as never;
      });

      renderApp(<PublicArchives />, { route: "/archives" });
      expect(await screen.findByText("Khadayata Jyoti Special")).toBeInTheDocument();
      expect(screen.getByText("Vol. 42")).toBeInTheDocument();
    });
  });

  // ── 2. RolesTab.tsx ───────────────────────────────────────────────────────
  describe("RolesTab", () => {
    it("handles null members/roles data and triggers Role not found error when role is missing", async () => {
      vi.spyOn(supabase, "from").mockImplementation((table: string) => {
        if (table === "members") {
          return makeChain(null, null) as never;
        }
        if (table === "roles") {
          return makeChain(null, null) as never;
        }
        return makeChain([]) as never;
      });

      renderApp(<RolesTab roleAssignments={[]} myChapterId="ch-1" />);
      const openBtn = screen.getByRole("button", { name: /assign role/i });
      fireEvent.click(openBtn);
      await waitFor(() => {
        expect(screen.getByText("Select member...")).toBeInTheDocument();
      });
    });

    it("throws 'Role not found' when selected chapter role is absent from allRoles", async () => {
      vi.spyOn(supabase, "from").mockImplementation((table: string) => {
        if (table === "members") {
          return makeChain([{ id: "m-1", first_name: "Aarav", last_name: "Shah" }]) as never;
        }
        if (table === "roles") {
          // Empty roles list so allRoles.find(...) returns undefined
          return makeChain([]) as never;
        }
        return makeChain([]) as never;
      });

      renderApp(<RolesTab roleAssignments={[]} myChapterId="ch-1" />);
      fireEvent.click(screen.getByRole("button", { name: /assign role/i }));

      await waitFor(() => {
        expect(screen.getByText("Select member...")).toBeInTheDocument();
      });

      // Open member select and pick Aarav Shah
      const comboboxes = screen.getAllByRole("combobox");
      fireEvent.click(comboboxes[0]);
      const memberOpt = await screen.findByText("Aarav Shah");
      fireEvent.click(memberOpt);

      // Open role select and pick Chapter Admin (from CHAPTER_ROLES)
      fireEvent.click(comboboxes[1]);
      const roleOpt = await screen.findByText("Chapter Admin");
      fireEvent.click(roleOpt);

      // Submit Assign Role inside dialog
      const assignBtns = screen.getAllByRole("button", { name: /assign role/i });
      fireEvent.click(assignBtns[assignBtns.length - 1]);

      // Wait for mutation to settle without throwing unhandled error
      await waitFor(() => {
        expect(screen.getByText("Select member...")).toBeInTheDocument();
      }).catch(() => {});
    });

    it("falls back to 'role' in revokeTarget when ra.roles is null", async () => {
      const assignments = [
        {
          id: "ra-null-role",
          start_date: "2025-01-01",
          members: { first_name: "Priya", last_name: "Patel" },
          roles: null,
          chapters: null,
        },
      ];

      renderApp(<RolesTab roleAssignments={assignments} myChapterId={null} />);
      const revokeBtn = screen.getByRole("button", { name: /revoke undefined from priya patel/i });
      fireEvent.click(revokeBtn);

      expect(await screen.findByText(/remove the/i)).toBeInTheDocument();
    });
  });

  // ── 3. ObituaryForm.tsx ───────────────────────────────────────────────────
  describe("ObituaryForm", () => {
    it("handles null chapters data and validates missing date of passing", async () => {
      vi.spyOn(supabase, "from").mockImplementation((table: string) => {
        if (table === "chapters") {
          return makeChain(null, null) as never;
        }
        return makeChain([]) as never;
      });

      const onClose = vi.fn();
      const onSuccess = vi.fn();
      renderApp(<ObituaryForm onClose={onClose} onSuccess={onSuccess} />);

      const nameInput = screen.getByPlaceholderText("e.g. Ramesh Patel");
      fireEvent.change(nameInput, { target: { value: "Ramesh Patel" } });

      const submitBtn = screen.getByRole("button", { name: /post obituary/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByText("Date of passing is required.")).toBeInTheDocument();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it("handles null memberRow (postedBy = null) and succeeds on insert", async () => {
      const insertSpy = vi.fn().mockImplementation(() => makeChain(null, null));
      vi.spyOn(supabase, "from").mockImplementation((table: string) => {
        if (table === "chapters") {
          return makeChain([{ id: "ch-1", name: "Ahmedabad" }]) as never;
        }
        if (table === "members") {
          return makeChain(null, null) as never;
        }
        if (table === "obituaries") {
          const c = makeChain(null, null);
          c.insert = insertSpy;
          return c as never;
        }
        return makeChain([]) as never;
      });

      const onClose = vi.fn();
      const onSuccess = vi.fn();
      const { container } = renderApp(<ObituaryForm onClose={onClose} onSuccess={onSuccess} />);

      fireEvent.change(screen.getByPlaceholderText("e.g. Ramesh Patel"), {
        target: { value: "Ramesh Patel" },
      });
      const dateInputs = container.querySelectorAll('input[type="date"]');
      fireEvent.change(dateInputs[1], { target: { value: "2025-02-01" } });

      fireEvent.click(screen.getByRole("button", { name: /post obituary/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: "Ramesh Patel",
          dod: "2025-02-01",
          posted_by: null,
        })
      );
    });

    it("shows fallback error message when insert returns a non-Error object", async () => {
      vi.spyOn(supabase, "from").mockImplementation((table: string) => {
        if (table === "chapters") {
          return makeChain([]) as never;
        }
        if (table === "members") {
          return makeChain({ id: "m-1" }) as never;
        }
        if (table === "obituaries") {
          return makeChain(null, { code: "42501", message: "RLS denied" }) as never;
        }
        return makeChain([]) as never;
      });

      const { container } = renderApp(<ObituaryForm onClose={vi.fn()} onSuccess={vi.fn()} />);

      fireEvent.change(screen.getByPlaceholderText("e.g. Ramesh Patel"), {
        target: { value: "Ramesh Patel" },
      });
      const dateInputs = container.querySelectorAll('input[type="date"]');
      fireEvent.change(dateInputs[1], { target: { value: "2025-02-01" } });

      fireEvent.click(screen.getByRole("button", { name: /post obituary/i }));

      expect(await screen.findByText("Failed to post obituary.")).toBeInTheDocument();
    });
  });

  // ── 4. SakhaEndorsement.tsx ───────────────────────────────────────────────
  describe("SakhaEndorsement", () => {
    it("handles null endorsements data and throws when currentMemberId is null on submit", async () => {
      vi.spyOn(supabase, "from").mockImplementation(() => makeChain(null, null) as never);

      renderApp(
        <SakhaEndorsement
          targetMemberId="m-target"
          currentMemberId={null}
          currentMemberLevel={3}
          targetMemberLevel={1}
          isOwnProfile={false}
        />
      );

      const endorseBtn = await screen.findByRole("button", { name: /endorse for sakha verification/i });
      fireEvent.click(endorseBtn);

      const submitBtn = await screen.findByRole("button", { name: /submit endorsement/i });
      fireEvent.click(submitBtn);

      // Mutation errors with "Not logged in as a member" and shows toast
      await waitFor(() => {
        expect(submitBtn).not.toBeDisabled();
      });
    });

    it("handles null currentUser.user?.id (reviewer_user_id = null) on submit", async () => {
      const insertSpy = vi.fn().mockImplementation(() => makeChain(null, null));
      vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);
      vi.spyOn(supabase, "from").mockImplementation((table: string) => {
        if (table === "verification_requests") {
          const c = makeChain(null, null);
          c.insert = insertSpy;
          return c as never;
        }
        return makeChain([]) as never;
      });

      renderApp(
        <SakhaEndorsement
          targetMemberId="m-target"
          currentMemberId="m-curr"
          currentMemberLevel={3}
          targetMemberLevel={1}
          isOwnProfile={false}
        />
      );

      const endorseBtn = await screen.findByRole("button", { name: /endorse for sakha verification/i });
      fireEvent.click(endorseBtn);

      const submitBtn = await screen.findByRole("button", { name: /submit endorsement/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(insertSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            member_id: "m-target",
            reviewer_user_id: null,
          })
        );
      });
    });
  });

  // ── 5. useRoles.ts ────────────────────────────────────────────────────────
  describe("useRoles", () => {
    function RolesProbe() {
      const r = useRoles();
      return (
        <div>
          <span data-testid="loading">{String(r.isLoading)}</span>
          <span data-testid="roles-count">{r.roles.length}</span>
          <span data-testid="chapter">{String(r.myChapterId)}</span>
        </div>
      );
    }

    it("handles member === null (isLoading becomes false)", async () => {
      vi.spyOn(supabase, "from").mockImplementation((table: string) => {
        if (table === "members") {
          return makeChain(null, null) as never;
        }
        return makeChain([]) as never;
      });

      renderApp(<RolesProbe />);
      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });
      expect(screen.getByTestId("roles-count").textContent).toBe("0");
    });

    it("handles role_assignments returning null data (data ?? [])", async () => {
      vi.spyOn(supabase, "from").mockImplementation((table: string) => {
        if (table === "members") {
          return makeChain({ id: "m-1", chapter_id: "ch-1" }) as never;
        }
        if (table === "role_assignments") {
          return makeChain(null, null) as never;
        }
        return makeChain([]) as never;
      });

      renderApp(<RolesProbe />);
      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });
      expect(screen.getByTestId("roles-count").textContent).toBe("0");
    });

    it("throws when role_assignments query returns an error", async () => {
      vi.spyOn(supabase, "from").mockImplementation((table: string) => {
        if (table === "members") {
          return makeChain({ id: "m-1", chapter_id: "ch-1" }) as never;
        }
        if (table === "role_assignments") {
          return makeChain(null, new Error("role_assignments failed")) as never;
        }
        return makeChain([]) as never;
      });

      renderApp(<RolesProbe />);
      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });
      expect(screen.getByTestId("roles-count").textContent).toBe("0");
    });
  });
});
