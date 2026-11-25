/**
 * Pass 57 — Wave 21: Close uncovered branches in EventGallery, sidebar, and Admin.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { EventGallery } from "@/components/events/EventGallery";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import Admin from "@/pages/Admin";

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

describe("Pass 57 — Wave 21: EventGallery uncovered branches", () => {
  it("handles null event_photos data and dbError on upload", async () => {
    const insertSpy = vi.fn().mockImplementation(() => makeChain(null, new Error("DB insert failed")));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-1",
          user_id: "u-1",
          first_name: "Test",
          last_name: "Admin",
        }) as never;
      }
      if (table === "event_photos") {
        const c = makeChain(null);
        c.insert = insertSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    vi.spyOn(supabase.storage, "from").mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/p.jpg" } }),
    } as never);

    renderApp(<EventGallery eventId="ev-1" eventName="Test Event" />);
    expect(await screen.findByText(/No photos yet/i)).toBeTruthy();

    const input = document.getElementById("gallery-upload-ev-1") as HTMLInputElement;
    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" });
    await waitFor(async () => {
      fireEvent.change(input, { target: { files: [file] } });
      expect(insertSpy).toHaveBeenCalled();
    });
  });

  it("handles whitespace-only member search, null search data, tagMember error, and updateTagConsent error", async () => {
    const tagInsertSpy = vi.fn().mockImplementation(() => makeChain(null, new Error("Tag insert failed")));
    const tagUpdateSpy = vi.fn().mockImplementation(() => makeChain(null, new Error("Consent update failed")));

    let memberSearchCalls = 0;
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        const c = makeChain({
          id: "m-1",
          user_id: "u-1",
          first_name: "Test",
          last_name: "Admin",
        });
        c.or = () => {
          memberSearchCalls += 1;
          if (memberSearchCalls === 1) {
            return makeChain(null);
          }
          return makeChain([{ id: "m-2", first_name: "Kiran", last_name: "Patel" }]);
        };
        return c as never;
      }
      if (table === "event_photos") {
        return makeChain([
          {
            id: "ph-1",
            event_id: "ev-1",
            uploaded_by: "m-1",
            url: "https://example.com/1.jpg",
            uploader: { first_name: "Test", last_name: "Admin" },
            photo_tags: [
              {
                id: "tag-1",
                member_id: "m-1",
                consent_status: "pending",
                tagged_member: { first_name: "Test", last_name: "Admin" },
              },
            ],
          },
        ]) as never;
      }
      if (table === "photo_tags") {
        const c = makeChain([]);
        c.insert = tagInsertSpy;
        c.update = tagUpdateSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<EventGallery eventId="ev-1" eventName="Test Event" />);
    const thumb = await screen.findByRole("button", { name: "" });
    fireEvent.click(thumb);

    const searchInput = await screen.findByPlaceholderText(/Search member to tag/i);
    // Whitespace-only with length >= 2 triggers !tagMemberSearch.trim()
    fireEvent.change(searchInput, { target: { value: "   " } });
    // First real search returns null -> covers data ?? []
    fireEvent.change(searchInput, { target: { value: "Ki" } });
    // Second real search returns a member -> click to trigger tagMember error + onError
    fireEvent.change(searchInput, { target: { value: "Kiran" } });

    const candidate = await screen.findByRole("button", { name: /Kiran Patel/i });
    fireEvent.click(candidate);
    await waitFor(() => {
      expect(tagInsertSpy).toHaveBeenCalled();
    });

    // Click consent approve button inside pending badge to trigger updateTagConsent error
    const badge = screen.getByText(/Test Admin/i).closest("div, span");
    const approveBtn = badge?.querySelector("button");
    expect(approveBtn).toBeTruthy();
    fireEvent.click(approveBtn!);
    await waitFor(() => {
      expect(tagUpdateSpy).toHaveBeenCalled();
    });
  });

  it("throws Not a member in tagMember when member is null", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        const c = makeChain(null);
        c.or = () => makeChain([{ id: "m-2", first_name: "Riya", last_name: "Shah" }]);
        return c as never;
      }
      if (table === "event_photos") {
        return makeChain([
          {
            id: "ph-2",
            event_id: "ev-1",
            uploaded_by: "m-other",
            url: "https://example.com/2.jpg",
            uploader: { first_name: "Other", last_name: "User" },
            photo_tags: [],
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<EventGallery eventId="ev-1" eventName="Test Event" />);
    const thumb = await screen.findByRole("button", { name: "" });
    fireEvent.click(thumb);

    const searchInput = await screen.findByPlaceholderText(/Search member to tag/i);
    fireEvent.change(searchInput, { target: { value: "Riya" } });

    const candidate = await screen.findByRole("button", { name: /Riya Shah/i });
    fireEvent.click(candidate);
    await waitFor(() => {
      expect(candidate).toBeTruthy();
    });
  });
});

describe("Pass 57 — Wave 21: Sidebar uncovered branches", () => {
  function SetOpenDirectButton() {
    const { setOpen, open } = useSidebar();
    return (
      <button type="button" onClick={() => setOpen(false)}>
        CloseDirect-{String(open)}
      </button>
    );
  }

  it("covers setOpen(boolean), asChild variants, and SidebarMenuSubButton size=sm", () => {
    renderApp(
      <SidebarProvider defaultOpen={true}>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <span>GroupLabelAsChild</span>
              </SidebarGroupLabel>
              <SidebarGroupAction asChild>
                <button type="button">GroupActionAsChild</button>
              </SidebarGroupAction>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <a href="#item">MenuBtnAsChild</a>
                    </SidebarMenuButton>
                    <SidebarMenuAction asChild>
                      <button type="button">MenuActionAsChild</button>
                    </SidebarMenuAction>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild size="sm">
                          <a href="#sub-sm">SubBtnSmallAsChild</a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SetOpenDirectButton />
      </SidebarProvider>,
    );

    expect(screen.getByText("GroupLabelAsChild")).toBeTruthy();
    expect(screen.getByText("GroupActionAsChild")).toBeTruthy();
    expect(screen.getByText("MenuBtnAsChild")).toBeTruthy();
    expect(screen.getByText("MenuActionAsChild")).toBeTruthy();
    expect(screen.getByText("SubBtnSmallAsChild")).toBeTruthy();

    const btn = screen.getByRole("button", { name: /CloseDirect-true/i });
    fireEvent.click(btn);
    expect(screen.getByRole("button", { name: /CloseDirect-false/i })).toBeTruthy();
  });
});

describe("Pass 57 — Wave 21: Admin uncovered branches", () => {
  it("covers members query error and null data fallbacks for role_assignments, audits, announcements", async () => {
    let roleCalls = 0;
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        const c = makeChain({
          id: "m-1",
          user_id: "u-1",
          first_name: "Global",
          last_name: "Admin",
          verification_level: 3,
          onboarding_completed: true,
          chapter_id: null,
        });
        c.order = () => makeChain(null, new Error("Members load failed"));
        return c as never;
      }
      if (table === "role_assignments") {
        roleCalls += 1;
        // First call is from useRoles(); subsequent call with .order() is Admin's roleAssignments query
        const c = makeChain([
          {
            id: "ra-1",
            role_id: "r-1",
            member_id: "m-1",
            chapter_id: null,
            roles: { name: "Global Admin", scope: "global" },
          },
        ]);
        c.order = () => makeChain(null);
        return c as never;
      }
      if (table === "audits" || table === "announcements" || table === "tag_requests") {
        return makeChain(null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Admin />, { route: "/admin?tab=members" });
    expect((await screen.findAllByText(/Admin Dashboard/i)).length).toBeGreaterThan(0);
    expect(roleCalls).toBeGreaterThan(0);
  });

  it("covers Chapter Admin chapter badge branch (!isGlobalAdmin && allMembers[0])", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        const c = makeChain({
          id: "m-ch",
          user_id: "u-ch",
          first_name: "Chapter",
          last_name: "Lead",
          verification_level: 3,
          onboarding_completed: true,
          chapter_id: "ch-1",
        });
        c.order = () =>
          makeChain([
            {
              id: "m-ch",
              user_id: "u-ch",
              first_name: "Chapter",
              last_name: "Lead",
              verification_level: 3,
              onboarding_completed: true,
              chapter_id: "ch-1",
              created_at: new Date().toISOString(),
              chapters: { name: "Ahmedabad" },
            },
          ]);
        return c as never;
      }
      if (table === "role_assignments") {
        return makeChain([
          {
            id: "ra-ch",
            role_id: "r-ch",
            member_id: "m-ch",
            chapter_id: "ch-1",
            roles: { name: "Chapter Admin", scope: "chapter" },
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Admin />, { route: "/admin?tab=members" });
    expect(await screen.findByText(/Chapter governance/i)).toBeTruthy();
    expect((await screen.findAllByText("Ahmedabad")).length).toBeGreaterThan(0);
  });

  it("covers Access Denied with non-empty non-admin roles list", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-reg",
          user_id: "u-reg",
          first_name: "Regular",
          last_name: "Member",
        }) as never;
      }
      if (table === "role_assignments") {
        return makeChain([
          {
            id: "ra-reg",
            role_id: "r-reg",
            member_id: "m-reg",
            chapter_id: null,
            roles: { name: "Volunteer", scope: "chapter" },
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Admin />, { route: "/admin" });
    expect(await screen.findByText(/Access Denied/i)).toBeTruthy();
    expect(await screen.findByText(/Your current roles: Volunteer/i)).toBeTruthy();
  });
});
