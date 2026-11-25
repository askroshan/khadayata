/**
 * Pass 65 — Wave 23: Close remaining uncovered branches in
 * MatrimonialModerationPanel, dropdown-menu, menubar, AcceptFamilyInvite, Chapters.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup, render } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { MatrimonialModerationPanel } from "@/components/matrimonial/MatrimonialModerationPanel";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarLabel,
  MenubarItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
} from "@/components/ui/menubar";
import AcceptFamilyInvite from "@/pages/AcceptFamilyInvite";
import Chapters from "@/pages/Chapters";

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

describe("Pass 65 — Wave 23 branch coverage burn-down", () => {
  it("MatrimonialModerationPanel: handles null data fallback", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "matrimonial_profiles") {
        return makeChain(null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<MatrimonialModerationPanel />);
    expect(await screen.findByText("No profiles")).toBeInTheDocument();
  });

  it("MatrimonialModerationPanel: renders dash when chapter is null and handles delete error", async () => {
    const deleteSpy = vi.fn().mockImplementation(() => makeChain(null, new Error("delete failed")));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "matrimonial_profiles") {
        const c = makeChain([
          {
            id: "mp-1",
            verified: false,
            suspended: false,
            created_at: new Date().toISOString(),
            member: {
              id: "m-1",
              first_name: "Kiran",
              last_name: "Shah",
              gender: "male",
              chapters: null,
            },
          },
        ]);
        c.delete = deleteSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<MatrimonialModerationPanel />);
    expect(await screen.findByText("Kiran Shah")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /delete profile/i }));
    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalled();
    });
  });

  it("dropdown-menu: renders inset variants for Label, Item, and SubTrigger", () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel inset>Inset Label</DropdownMenuLabel>
          <DropdownMenuItem inset>Inset Item</DropdownMenuItem>
          <DropdownMenuSub open>
            <DropdownMenuSubTrigger inset>Inset Sub</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Sub Child</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    expect(screen.getByText("Inset Label").className).toContain("pl-8");
    expect(screen.getByText("Inset Item").className).toContain("pl-8");
    expect(screen.getByText("Inset Sub").className).toContain("pl-8");
  });

  it("menubar: renders inset variants for Label, Item, and SubTrigger", () => {
    render(
      <Menubar value="menu-1">
        <MenubarMenu value="menu-1">
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarLabel inset>Menubar Inset Label</MenubarLabel>
            <MenubarItem inset>Menubar Inset Item</MenubarItem>
            <MenubarSub open>
              <MenubarSubTrigger inset>Menubar Inset Sub</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Sub Child</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );

    expect(screen.getByText("Menubar Inset Label").className).toContain("pl-8");
    expect(screen.getByText("Menubar Inset Item").className).toContain("pl-8");
    expect(screen.getByText("Menubar Inset Sub").className).toContain("pl-8");
  });

  it("AcceptFamilyInvite: handles nullish preview fields", async () => {
    vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: {
        found: true,
        status: "pending",
        invitee_name: null,
        relation: null,
        inviter_first_name: null,
        inviter_last_name: null,
      },
      error: null,
    } as never);

    renderApp(
      <Routes>
        <Route path="/accept-family-invite/:token" element={<AcceptFamilyInvite />} />
      </Routes>,
      { route: "/accept-family-invite/tok-nullish" },
    );

    expect(await screen.findByRole("button", { name: /accept & connect/i })).toBeInTheDocument();
  });

  it("Chapters: filters by country, state, and city down to 1 chapter", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "chapters") {
        return makeChain([
          {
            id: "ch-1",
            slug: "ahmedabad",
            name: "Ahmedabad Chapter",
            country_id: "c-in",
            state_id: "s-gj",
            city_id: "ci-amd",
            countries: { name: "India", iso2: "IN" },
            states: { name: "Gujarat", code: "GJ" },
            cities: { name: "Ahmedabad", code: "AMD" },
          },
          {
            id: "ch-2",
            slug: "surat",
            name: "Surat Chapter",
            country_id: "c-in",
            state_id: "s-gj",
            city_id: "ci-srt",
            countries: { name: "India", iso2: "IN" },
            states: { name: "Gujarat", code: "GJ" },
            cities: { name: "Surat", code: "SRT" },
          },
          {
            id: "ch-3",
            slug: "mumbai",
            name: "Mumbai Chapter",
            country_id: "c-in",
            state_id: "s-mh",
            city_id: "ci-bom",
            countries: { name: "India", iso2: "IN" },
            states: { name: "Maharashtra", code: "MH" },
            cities: { name: "Mumbai", code: "BOM" },
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Chapters />, { route: "/chapters" });
    expect(await screen.findByText("Ahmedabad Chapter")).toBeInTheDocument();
    expect(screen.getByText("3 chapters")).toBeInTheDocument();

    const [countryTrigger, stateTrigger, cityTrigger] = screen.getAllByRole("combobox");

    // Select Country: India
    fireEvent.click(countryTrigger);
    fireEvent.click(await screen.findByRole("option", { name: "India" }));

    // Select State: Gujarat (filters out Maharashtra)
    fireEvent.click(stateTrigger);
    fireEvent.click(await screen.findByRole("option", { name: "Gujarat" }));
    await waitFor(() => {
      expect(screen.getByText("2 chapters")).toBeInTheDocument();
      expect(screen.queryByText("Mumbai Chapter")).not.toBeInTheDocument();
    });

    // Select City: Ahmedabad (filters out Surat -> 1 chapter singular)
    fireEvent.click(cityTrigger);
    fireEvent.click(await screen.findByRole("option", { name: "Ahmedabad" }));
    await waitFor(() => {
      expect(screen.getByText("1 chapter")).toBeInTheDocument();
      expect(screen.queryByText("Surat Chapter")).not.toBeInTheDocument();
    });
  });
});
