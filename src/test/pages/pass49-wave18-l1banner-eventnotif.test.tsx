/**
 * Pass 49 — Wave 18: Close uncovered branches in L1UpgradeBanner and event-notifications.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { L1UpgradeBanner } from "@/components/verification/L1UpgradeBanner";
import {
  notifyEventCreated,
  notifyEventCancelled,
  notifyEventUpdated,
} from "@/lib/event-notifications";

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

function makeChain(data: unknown, error: unknown = null, countOverride?: number | null) {
  const count = countOverride !== undefined ? countOverride : Array.isArray(data) ? data.length : 0;
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

describe("Pass 49 — Wave 18: L1UpgradeBanner uncovered branches", () => {
  it("L0 member with 2+ vouches renders completed vouch indicator", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-l0-2v",
          user_id: "u-l0-2v",
          first_name: "L0",
          last_name: "Member",
          verification_level: 0,
        }) as never;
      }
      if (table === "vouches") {
        return makeChain(null, null, 2) as never;
      }
      if (table === "verification_requests") {
        return makeChain(null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<L1UpgradeBanner />);
    expect(await screen.findByText("Upgrade to L1 — Vouched")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("2/2")).toBeInTheDocument();
    });
  });

  it("L0 member with null vouch count falls back to 0", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-l0-null",
          user_id: "u-l0-null",
          first_name: "L0",
          last_name: "NullCount",
          verification_level: 0,
        }) as never;
      }
      if (table === "vouches") {
        return makeChain(null, null, null) as never;
      }
      if (table === "verification_requests") {
        return makeChain(null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<L1UpgradeBanner />);
    expect(await screen.findByText("Upgrade to L1 — Vouched")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("0/2")).toBeInTheDocument();
    });
  });

  it("L1 member with null vouches data falls back to 0/3", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-l1-null",
          user_id: "u-l1-null",
          first_name: "L1",
          last_name: "NullData",
          verification_level: 1,
        }) as never;
      }
      if (table === "vouches") {
        return makeChain(null, null, 0) as never;
      }
      if (table === "verification_requests") {
        return makeChain(null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<L1UpgradeBanner />);
    expect(await screen.findByText("Upgrade to L2 — Verified")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("0/3")).toBeInTheDocument();
    });
  });

  it("L1 member with 3 L1+ vouches, a null voucher, and a pending request renders completed states", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-l1-full",
          user_id: "u-l1-full",
          first_name: "L1",
          last_name: "Full",
          verification_level: 1,
        }) as never;
      }
      if (table === "vouches") {
        return makeChain([
          { voucher: { verification_level: 1 } },
          { voucher: { verification_level: 2 } },
          { voucher: { verification_level: 3 } },
          { voucher: null },
        ]) as never;
      }
      if (table === "verification_requests") {
        return makeChain({ id: "vr-1", status: "pending", requested_level: 2 }) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<L1UpgradeBanner />);
    expect(await screen.findByText("Upgrade to L2 — Verified")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("3/3")).toBeInTheDocument();
      expect(screen.getByText("Request submitted")).toBeInTheDocument();
    });
  });
});

describe("Pass 49 — Wave 18: event-notifications uncovered branches", () => {
  it("notifyEventCreated handles null prefs and empty contacts", async () => {
    const rpcSpy = vi.spyOn(supabase, "rpc").mockResolvedValue({ data: null, error: null } as never);
    const invokeSpy = vi.spyOn(supabase.functions, "invoke").mockResolvedValue({ data: null, error: null } as never);

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain([{ id: "m-1" }]) as never;
      }
      if (table === "notification_preferences") {
        return makeChain(null) as never;
      }
      if (table === "member_contacts") {
        return makeChain([]) as never;
      }
      return makeChain([]) as never;
    });

    await notifyEventCreated({ id: "ev-1", name: "Annual Meet", chapter_id: "ch-1" });
    expect(rpcSpy).toHaveBeenCalledWith("create_notifications_batch", expect.objectContaining({ p_type: "event_created" }));
    expect(invokeSpy).not.toHaveBeenCalled();
  });

  it("notifyEventCreated handles null preference fields and contacts with empty email values", async () => {
    const rpcSpy = vi.spyOn(supabase, "rpc").mockResolvedValue({ data: null, error: null } as never);
    const invokeSpy = vi.spyOn(supabase.functions, "invoke").mockResolvedValue({ data: null, error: null } as never);

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain([{ id: "m-1" }, { id: "m-2" }]) as never;
      }
      if (table === "notification_preferences") {
        return makeChain([
          {
            member_id: "m-1",
            email_enabled: null,
            whatsapp_enabled: null,
            push_enabled: null,
            chapter_notifications_enabled: null,
          },
          {
            member_id: "m-2",
            email_enabled: true,
            whatsapp_enabled: false,
            push_enabled: false,
            chapter_notifications_enabled: true,
          },
        ]) as never;
      }
      if (table === "member_contacts") {
        return makeChain([
          { member_id: "m-2", value: "" },
          { member_id: "m-2", value: null },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    await notifyEventCreated({ id: "ev-2", name: "Diwali Gala", chapter_id: "ch-1" });
    expect(rpcSpy).toHaveBeenCalledWith("create_notifications_batch", expect.objectContaining({ p_type: "event_created" }));
    expect(invokeSpy).not.toHaveBeenCalled();
  });

  it("notifyEventCancelled handles null prefs (missing prefMap entries)", async () => {
    const rpcSpy = vi.spyOn(supabase, "rpc").mockResolvedValue({ data: null, error: null } as never);
    const invokeSpy = vi.spyOn(supabase.functions, "invoke").mockResolvedValue({ data: null, error: null } as never);

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "event_rsvps") {
        return makeChain([{ member_id: "m-1" }]) as never;
      }
      if (table === "notification_preferences") {
        return makeChain(null) as never;
      }
      if (table === "member_contacts") {
        return makeChain([]) as never;
      }
      return makeChain([]) as never;
    });

    await notifyEventCancelled({ id: "ev-3", name: "Cancelled Meet", chapter_id: "ch-1" });
    expect(rpcSpy).toHaveBeenCalledWith("create_notifications_batch", expect.objectContaining({ p_type: "event_cancelled" }));
    expect(invokeSpy).not.toHaveBeenCalled();
  });

  it("notifyEventUpdated handles null preference fields on RSVP members", async () => {
    const rpcSpy = vi.spyOn(supabase, "rpc").mockResolvedValue({ data: null, error: null } as never);

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "event_rsvps") {
        return makeChain([{ member_id: "m-1" }]) as never;
      }
      if (table === "notification_preferences") {
        return makeChain([
          {
            member_id: "m-1",
            email_enabled: null,
            whatsapp_enabled: null,
            push_enabled: null,
            chapter_notifications_enabled: null,
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    await notifyEventUpdated({ id: "ev-4", name: "Updated Meet", chapter_id: "ch-1" });
    expect(rpcSpy).toHaveBeenCalledWith("create_notifications_batch", expect.objectContaining({ p_type: "event_updated" }));
  });
});
