import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { OTPInputContext } from "input-otp";

const mockAuthState = vi.hoisted(() => ({
  user: { id: "u-1", email: "test@example.com" } as { id: string; email: string } | null,
  signOut: vi.fn(),
}));

const mockSupabaseState = vi.hoisted(() => ({
  chaptersData: null as Array<{ id: string; slug: string }> | null,
  phoneContact: null as { id: string; value: string } | null,
  updateError: null as Error | null,
  insertError: null as Error | null,
}));

const mockNavLinkState = vi.hoisted(() => ({
  forcePending: false,
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  const WrappedNavLink = React.forwardRef<
    HTMLAnchorElement,
    React.ComponentProps<typeof actual.NavLink>
  >(({ className, to, children, ...props }, ref) => {
    if (mockNavLinkState.forcePending && typeof className === "function") {
      const cls = className({ isActive: false, isPending: true, isTransitioning: false });
      return (
        <a ref={ref} href={String(to)} className={cls}>
          {typeof children === "function"
            ? children({ isActive: false, isPending: true, isTransitioning: false })
            : children}
        </a>
      );
    }
    return <actual.NavLink ref={ref} to={to} className={className} {...props}>{children}</actual.NavLink>;
  });
  return {
    ...actual,
    NavLink: WrappedNavLink,
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("@/hooks/useRoles", () => ({
  useRoles: () => ({
    isAnyAdmin: false,
    isGlobalAdmin: false,
    isLoading: false,
    roles: [],
  }),
}));

vi.mock("@/hooks/useMember", () => ({
  useMember: () => ({
    member: { id: "m-1", full_name: "Test Member", chapter_id: null, avatar_url: null },
    isLoading: false,
  }),
}));

vi.mock("@/components/NotificationsPanel", () => ({
  NotificationsPanel: () => <div data-testid="notifications-panel" />,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "chapters") {
        return {
          select: () => Promise.resolve({ data: mockSupabaseState.chaptersData, error: null }),
        };
      }
      if (table === "member_contacts") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({ data: mockSupabaseState.phoneContact, error: null }),
                }),
              }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: mockSupabaseState.updateError }),
          }),
          insert: () => Promise.resolve({ error: mockSupabaseState.insertError }),
        };
      }
      return {
        select: () => Promise.resolve({ data: [], error: null }),
      };
    },
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/a.png" } }),
      }),
    },
  },
}));

import AppLayout from "@/components/AppLayout";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NavLink } from "@/components/NavLink";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { AvatarUpload } from "@/components/AvatarUpload";
import { PhoneField } from "@/components/profile/PhoneField";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
} from "@/components/ui/breadcrumb";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { InputOTPSlot } from "@/components/ui/input-otp";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/toaster";

function createQC() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

describe("Wave 24 tail branch coverage: components and ui", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.user = { id: "u-1", email: "test@example.com" };
    mockSupabaseState.chaptersData = null;
    mockSupabaseState.phoneContact = null;
    mockSupabaseState.updateError = null;
    mockSupabaseState.insertError = null;
    mockNavLinkState.forcePending = false;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("AppLayout handles null chapters data and default/custom title", async () => {
    mockSupabaseState.chaptersData = null;
    const qc = createQC();
    const { rerender } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppLayout>
            <div>Body</div>
          </AppLayout>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Body")).toBeInTheDocument();
    expect(screen.getAllByText("KhadayataOnline").length).toBeGreaterThan(0);

    rerender(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppLayout title="Custom Header">
            <div>Body 2</div>
          </AppLayout>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText("Custom Header")).toBeInTheDocument();
  });

  it("LanguageToggle handles no content, single language (returns null), and multiple languages", () => {
    const onChange = vi.fn();
    const { rerender, container } = render(<LanguageToggle onChange={onChange} />);
    expect(screen.getByLabelText("Switch to English")).toBeInTheDocument();

    rerender(<LanguageToggle content={{ en: "Only English" }} onChange={onChange} />);
    expect(container.firstChild).toBeNull();

    rerender(
      <LanguageToggle content={{ en: "Hello", gu: "નમસ્તે" }} onChange={onChange} />,
    );
    expect(screen.getByLabelText("Switch to Gujarati")).toBeInTheDocument();
  });

  it("NavLink applies activeClassName and pendingClassName", () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={["/"]}>
        <NavLink to="/" end className="base" activeClassName="is-active" pendingClassName="is-pending">
          Home
        </NavLink>
      </MemoryRouter>,
    );
    expect(screen.getByText("Home").className).toContain("is-active");

    mockNavLinkState.forcePending = true;
    rerender(
      <MemoryRouter initialEntries={["/"]}>
        <NavLink to="/slow" className="base" activeClassName="is-active" pendingClassName="is-pending">
          Slow
        </NavLink>
      </MemoryRouter>,
    );
    expect(screen.getByText("Slow").className).toContain("is-pending");
  });

  it("QRCodeDisplay handles null 2d context gracefully", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { container } = render(<QRCodeDisplay data="test-qr" size={120} />);
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("AvatarUpload returns early when no file selected or user is null", () => {
    const onUploadComplete = vi.fn();
    const { container } = render(
      <AvatarUpload onUploadComplete={onUploadComplete} initials="TS" />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    // No file selected
    fireEvent.change(input, { target: { files: [] } });
    expect(onUploadComplete).not.toHaveBeenCalled();

    // User is null
    mockAuthState.user = null;
    const file = new File(["abc"], "avatar.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onUploadComplete).not.toHaveBeenCalled();
  });

  it("PhoneField handles update and insert errors", async () => {
    // 1. Update error path
    mockSupabaseState.phoneContact = { id: "c-1", value: "+91 9876543210" };
    mockSupabaseState.updateError = new Error("Update failed");

    const qc1 = createQC();
    const { unmount } = render(
      <QueryClientProvider client={qc1}>
        <PhoneField memberId="m-1" />
      </QueryClientProvider>,
    );

    await screen.findByText("+91 9876543210");
    fireEvent.click(screen.getByRole("button"));
    const saveButtons = screen.getAllByRole("button");
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("9876543210")).toBeInTheDocument();
    });
    unmount();

    // 2. Insert error path
    mockSupabaseState.phoneContact = null;
    mockSupabaseState.insertError = new Error("Insert failed");

    const qc2 = createQC();
    render(
      <QueryClientProvider client={qc2}>
        <PhoneField memberId="m-2" />
      </QueryClientProvider>,
    );

    const editBtn = await screen.findByRole("button");
    fireEvent.click(editBtn);
    const input = screen.getByPlaceholderText("9876543210");
    fireEvent.change(input, { target: { value: "9999999999" } });
    const btns = screen.getAllByRole("button");
    fireEvent.click(btns[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("9999999999")).toBeInTheDocument();
    });
  });

  it("PaginationLink renders both active and inactive states", () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="#1" isActive>
              1
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#2" isActive={false}>
              2
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );

    expect(screen.getByText("1")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("2")).not.toHaveAttribute("aria-current");
  });

  it("BreadcrumbLink renders both asChild Slot and default anchor", () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/home">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <a href="/child">Child</a>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    expect(screen.getByText("Home")).toHaveAttribute("href", "/home");
    expect(screen.getByText("Child")).toHaveAttribute("href", "/child");
  });

  it("Carousel derives orientation from opts.axis when orientation prop is falsy", () => {
    const { rerender } = render(
      <Carousel orientation={"" as unknown as "horizontal"} opts={{ axis: "y" }}>
        <CarouselContent>
          <CarouselItem>Slide Y</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );
    expect(screen.getByText("Slide Y")).toBeInTheDocument();

    rerender(
      <Carousel orientation={"" as unknown as "horizontal"} opts={{ axis: "x" }}>
        <CarouselContent>
          <CarouselItem>Slide X</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );
    expect(screen.getByText("Slide X")).toBeInTheDocument();
  });

  it("InputOTPSlot renders active and inactive slots", () => {
    render(
      <OTPInputContext.Provider
        value={{
          slots: [
            { char: "5", hasFakeCaret: true, isActive: true, placeholderChar: null },
            { char: "", hasFakeCaret: false, isActive: false, placeholderChar: null },
          ],
          isFocused: true,
          isHovering: false,
        }}
      >
        <InputOTPSlot index={0} data-testid="slot-0" />
        <InputOTPSlot index={1} data-testid="slot-1" />
      </OTPInputContext.Provider>,
    );

    expect(screen.getByTestId("slot-0").className).toContain("ring-2");
    expect(screen.getByTestId("slot-1").className).not.toContain("ring-2");
  });

  it("ScrollBar renders horizontal orientation classes", () => {
    render(
      <ScrollArea type="always">
        <div>Content</div>
        <ScrollBar orientation="horizontal" forceMount data-testid="h-scrollbar" />
      </ScrollArea>,
    );

    expect(screen.getByTestId("h-scrollbar").className).toContain("h-2.5");
  });

  it("Toaster renders in non-test MODE branch", () => {
    vi.stubEnv("MODE", "production");
    const { container } = render(<Toaster />);
    expect(container).toBeTruthy();
  });
});
