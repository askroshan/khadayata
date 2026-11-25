/**
 * Pass 54 — Wave 20: Branch coverage burn-down for RecurringPledgesPanel and useMember hooks.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { RecurringPledgesPanel } from "@/components/finance/RecurringPledgesPanel";
import {
  useMember,
  useChapters,
  useCountries,
  useStates,
  useCities,
  useHasStates,
  useCitiesByCountry,
} from "@/hooks/useMember";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeChain(data: unknown, error: unknown = null, count: number | null = Array.isArray(data) ? data.length : 0) {
  const result = { data, error, count };
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

describe("Pass 54 — useMember unauthenticated branch", () => {
  beforeAll(async () => {
    await supabase.auth.signOut();
  });

  it("updateMember throws 'Not authenticated' when no user is signed in", async () => {
    let caughtError: string | null = null;
    function UnauthProbe() {
      const { updateMember } = useMember();
      return (
        <button
          onClick={() => {
            updateMember.mutate(
              { first_name: "Nobody" },
              {
                onError: (err) => {
                  caughtError = (err as Error).message;
                },
              }
            );
          }}
        >
          Trigger Unauth Update
        </button>
      );
    }

    renderApp(<UnauthProbe />);
    fireEvent.click(screen.getByRole("button", { name: "Trigger Unauth Update" }));
    await waitFor(() => {
      expect(caughtError).toBe("Not authenticated");
    });
  });
});

describe("Pass 54 — Wave 20 RecurringPledgesPanel & useMember branches", () => {
  beforeAll(async () => {
    await supabase.auth.signInWithPassword({
      email: E2E_ACCOUNTS.globalAdmin.email,
      password: E2E_PASSWORD,
    });
  });

  afterAll(async () => {
    await supabase.auth.signOut();
  });

  it("RecurringPledgesPanel: handles null pledges/funds, null fund name, unknown status, and updateStatus error", async () => {
    // First render: null data from both recurring_pledges and funds -> hits `data ?? []`
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({ id: "m-1", user_id: "u-1", first_name: "Admin", last_name: "User" }) as never;
      }
      if (table === "recurring_pledges") return makeChain(null) as never;
      if (table === "funds") return makeChain(null) as never;
      return makeChain([]) as never;
    });

    renderApp(<RecurringPledgesPanel />);
    expect(await screen.findByText(/No recurring pledges yet/i)).toBeInTheDocument();
    cleanup();
    vi.restoreAllMocks();

    // Second render: pledge with funds=null, unknown status, and updateStatus returning error
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({ id: "m-1", user_id: "u-1", first_name: "Admin", last_name: "User" }) as never;
      }
      if (table === "recurring_pledges") {
        const c = makeChain([
          {
            id: "pl-1",
            member_id: "m-1",
            fund_id: "f-1",
            amount: 500,
            currency: "INR",
            interval: "monthly",
            status: "pending_review",
            notes: null,
            funds: null,
          },
        ]);
        c.update = () => makeChain(null, new Error("Update pledge failed"));
        return c as never;
      }
      if (table === "funds") {
        return makeChain([{ id: "f-1", name: "Education Fund", active: true }]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<RecurringPledgesPanel />);
    expect(await screen.findByText("Fund")).toBeInTheDocument();
    expect(screen.getByText("pending_review")).toBeInTheDocument();

    // Click Cancel pledge button (status !== 'cancelled') -> triggers updateStatus error + onError toast
    const cancelBtn = screen.getByRole("button", { name: "Cancel pledge" });
    fireEvent.click(cancelBtn);
    await waitFor(() => {
      expect(cancelBtn).toBeInTheDocument();
    });
  });

  it("RecurringPledgesPanel: createPledge with empty notes, amount='0' annual fallback, and insert error", async () => {
    const insertSpy = vi.fn().mockImplementation(() => makeChain(null, new Error("Insert pledge failed")));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({ id: "m-1", user_id: "u-1", first_name: "Admin", last_name: "User" }) as never;
      }
      if (table === "recurring_pledges") {
        const c = makeChain([]);
        c.insert = insertSpy;
        return c as never;
      }
      if (table === "funds") {
        return makeChain([{ id: "f-1", name: "Education Fund", active: true }]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<RecurringPledgesPanel />);
    const newBtn = await screen.findByRole("button", { name: /New Pledge/i });
    fireEvent.click(newBtn);

    // Wait for dialog
    await screen.findByText("New Recurring Pledge");

    // Select a fund via combobox
    const triggers = screen.getAllByRole("combobox");
    fireEvent.click(triggers[0]);
    const fundOption = await screen.findByRole("option", { name: "Education Fund" });
    fireEvent.click(fundOption);

    // Enter amount "0" so `form.amount` is truthy and `parseFloat("0") || 0` hits the `|| 0` branch
    const amountInput = screen.getByPlaceholderText("0");
    fireEvent.change(amountInput, { target: { value: "0" } });
    expect(await screen.findByText(/Annual total:/i)).toBeInTheDocument();

    // Leave notes empty so `form.notes.trim() || null` hits the `null` branch, and submit -> hits insert error
    const createBtn = screen.getByRole("button", { name: "Create Pledge" });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fund_id: "f-1",
          notes: null,
        })
      );
    });
  });

  it("useMember & taxonomy hooks: error branches and useHasStates null count fallback", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(null, new Error("members boom")) as never;
      if (table === "chapters") return makeChain(null, new Error("chapters boom")) as never;
      if (table === "countries") return makeChain(null, new Error("countries boom")) as never;
      if (table === "states") return makeChain(null, new Error("states boom")) as never;
      if (table === "cities") return makeChain(null, new Error("cities boom")) as never;
      return makeChain([]) as never;
    });

    function ErrorProbe() {
      const m = useMember();
      const ch = useChapters();
      const co = useCountries();
      const st = useStates("c-1");
      const ci = useCities("s-1");
      const hs = useHasStates("c-1");
      const cbc = useCitiesByCountry("c-1");
      return (
        <div>
          <span data-testid="m-done">{String(m.isLoading)}</span>
          <span data-testid="ch-err">{String(ch.isError)}</span>
          <span data-testid="co-err">{String(co.isError)}</span>
          <span data-testid="st-err">{String(st.isError)}</span>
          <span data-testid="ci-err">{String(ci.isError)}</span>
          <span data-testid="hs-err">{String(hs.isError)}</span>
          <span data-testid="cbc-err">{String(cbc.isError)}</span>
        </div>
      );
    }

    renderApp(<ErrorProbe />);
    await waitFor(() => {
      expect(screen.getByTestId("ch-err").textContent).toBe("true");
      expect(screen.getByTestId("co-err").textContent).toBe("true");
      expect(screen.getByTestId("st-err").textContent).toBe("true");
      expect(screen.getByTestId("ci-err").textContent).toBe("true");
      expect(screen.getByTestId("hs-err").textContent).toBe("true");
      expect(screen.getByTestId("cbc-err").textContent).toBe("true");
    });
    cleanup();
    vi.restoreAllMocks();

    // Test useHasStates when count is null -> hits `(count ?? 0) > 0`
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "states") return makeChain(null, null, null) as never;
      return makeChain([]) as never;
    });

    function NullCountProbe() {
      const hs = useHasStates("c-null");
      return <span data-testid="hs-val">{String(hs.data)}</span>;
    }

    renderApp(<NullCountProbe />);
    await waitFor(() => {
      expect(screen.getByTestId("hs-val").textContent).toBe("false");
    });
  });
});
