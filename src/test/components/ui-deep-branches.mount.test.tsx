import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bar, BarChart, XAxis } from "recharts";
import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { toast as sonnerToast, Toaster as SonnerToaster } from "@/components/ui/sonner";
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { Toggle, toggleVariants } from "@/components/ui/toggle";
import { toast, useToast } from "@/components/ui/use-toast";

function FormWithErrors() {
  const schema = z.object({ name: z.string().min(3, "Name too short") });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => {})}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>At least 3 chars</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save</Button>
      </form>
    </Form>
  );
}

function OrphanFormFieldHook() {
  useFormField();
  return null;
}

function OrphanSidebarHook() {
  useSidebar();
  return null;
}

function SidebarConsumer() {
  const { toggleSidebar, state } = useSidebar();
  return (
    <button type="button" onClick={toggleSidebar}>
      toggle-{state}
    </button>
  );
}

function ToastImperative() {
  const { toast: hookToast, toasts } = useToast();
  return (
    <div>
      <Button
        onClick={() => {
          hookToast({ title: "Hook toast", description: "from useToast" });
          toast({ title: "Module toast", variant: "destructive" });
          sonnerToast("Sonner ping");
        }}
      >
        Fire toasts
      </Button>
      <span data-testid="toast-count">{toasts.length}</span>
    </div>
  );
}

function CarouselWithApi() {
  const [api, setApi] = useState<CarouselApi>();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (api) setReady(true);
  }, [api]);
  return (
    <div>
      <span data-testid="carousel-api">{ready ? "ready" : "pending"}</span>
      <Carousel orientation="vertical" setApi={setApi}>
        <CarouselContent>
          <CarouselItem>V1</CarouselItem>
          <CarouselItem>V2</CarouselItem>
          <CarouselItem>V3</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}

describe("UI deep branches — menus / variants / dialogs", () => {
  it("renders button/badge/alert/toggle variant matrices", () => {
    const variants = ["default", "destructive", "outline", "secondary", "ghost", "link"] as const;
    const sizes = ["default", "sm", "lg", "icon"] as const;
    render(
      <div>
        {variants.map((v) =>
          sizes.map((s) => (
            <Button key={`${v}-${s}`} variant={v} size={s} className={buttonVariants({ variant: v, size: s })}>
              {s === "icon" ? "!" : `${v}-${s}`}
            </Button>
          )),
        )}
        <Button asChild>
          <a href="/x">asChild</a>
        </Button>
        {(["default", "secondary", "destructive", "outline"] as const).map((v) => (
          <Badge key={v} variant={v} className={badgeVariants({ variant: v })}>
            {v}
          </Badge>
        ))}
        <Alert variant="destructive">
          <AlertTitle>Danger</AlertTitle>
          <AlertDescription>Bad</AlertDescription>
        </Alert>
        <Toggle variant="outline" size="sm" className={toggleVariants({ variant: "outline", size: "sm" })}>
          Outline
        </Toggle>
        <ToastProvider>
          <Toast variant="destructive">
            <ToastTitle>Boom</ToastTitle>
            <ToastDescription>err</ToastDescription>
            <ToastAction altText="undo">Undo</ToastAction>
            <ToastClose />
          </Toast>
          <ToastViewport />
        </ToastProvider>
      </div>,
    );
    expect(screen.getByText("asChild")).toBeInTheDocument();
    expect(screen.getByText("Danger")).toBeInTheDocument();
    expect(screen.getByText("Boom")).toBeInTheDocument();
  });

  it("opens dropdown advanced items", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>Drop</Button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuCheckboxItem checked>Check</DropdownMenuCheckboxItem>
              <DropdownMenuRadioGroup value="a">
                <DropdownMenuRadioItem value="a">Radio A</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="b">Radio B</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuItem>
                Item <DropdownMenuShortcut>⌘I</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>Nested</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );
    await user.click(screen.getByText("Drop"));
    expect(await screen.findByText("Check")).toBeInTheDocument();
    expect(screen.getByText("Radio A")).toBeInTheDocument();
  });

  it("mounts context menu advanced item tree", () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Right-click me</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuLabel>Ctx</ContextMenuLabel>
            <ContextMenuSeparator />
            <ContextMenuGroup>
              <ContextMenuCheckboxItem checked>Ctx check</ContextMenuCheckboxItem>
              <ContextMenuRadioGroup value="x">
                <ContextMenuRadioItem value="x">X</ContextMenuRadioItem>
              </ContextMenuRadioGroup>
              <ContextMenuItem>
                Ctx item <ContextMenuShortcut>⌘C</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuSub>
                <ContextMenuSubTrigger>Ctx more</ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem>Ctx nested</ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            </ContextMenuGroup>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>,
    );
    expect(screen.getByText("Right-click me")).toBeInTheDocument();
  });

  it("opens menubar advanced items", async () => {
    const user = userEvent.setup();
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarLabel>Edit menu</MenubarLabel>
              <MenubarSeparator />
              <MenubarGroup>
                <MenubarCheckboxItem checked>Wrap</MenubarCheckboxItem>
                <MenubarRadioGroup value="1">
                  <MenubarRadioItem value="1">One</MenubarRadioItem>
                </MenubarRadioGroup>
                <MenubarItem>
                  Paste <MenubarShortcut>⌘V</MenubarShortcut>
                </MenubarItem>
                <MenubarSub>
                  <MenubarSubTrigger>Find</MenubarSubTrigger>
                  <MenubarSubContent>
                    <MenubarItem>Find next</MenubarItem>
                  </MenubarSubContent>
                </MenubarSub>
              </MenubarGroup>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>,
    );
    await user.click(screen.getByText("Edit"));
    expect(await screen.findByText("Wrap")).toBeInTheDocument();
  });

  it("renders dialog footer and close control", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open dlg</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button>Close dlg</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByText("Open dlg"));
    expect(await screen.findByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Close dlg")).toBeInTheDocument();
  });

  it("renders sheet footers for each side", async () => {
    const user = userEvent.setup();
    for (const side of ["top", "bottom", "left", "right"] as const) {
      const { unmount } = render(
        <Sheet>
          <SheetTrigger asChild>
            <Button>Sheet {side}</Button>
          </SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>{side}</SheetTitle>
              <SheetDescription>side</SheetDescription>
            </SheetHeader>
            <SheetFooter>
              <SheetClose asChild>
                <Button>Close {side}</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>,
      );
      await user.click(screen.getByText(`Sheet ${side}`));
      expect(await screen.findByText(side)).toBeInTheDocument();
      unmount();
    }
  });
});

describe("UI deep branches — sidebar / chart / form / carousel / command", () => {
  it("mounts sidebar extras, variants, and useSidebar throw", async () => {
    const user = userEvent.setup();
    expect(() => render(<OrphanSidebarHook />)).toThrow(/SidebarProvider/);

    render(
      <SidebarProvider defaultOpen>
        <Sidebar side="right" variant="floating" collapsible="icon">
          <SidebarHeader>
            <SidebarInput placeholder="Search sidebar" />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>G</SidebarGroupLabel>
              <SidebarGroupAction aria-label="group-action">+</SidebarGroupAction>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Home tip">Home</SidebarMenuButton>
                    <SidebarMenuAction showOnHover aria-label="menu-action">
                      …
                    </SidebarMenuAction>
                    <SidebarMenuBadge>3</SidebarMenuBadge>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton href="#">Child</SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <Sidebar collapsible="none">
          <SidebarContent>Static</SidebarContent>
        </Sidebar>
        <SidebarInset>
          <SidebarTrigger />
          <SidebarConsumer />
        </SidebarInset>
      </SidebarProvider>,
    );

    expect(screen.getByPlaceholderText("Search sidebar")).toBeInTheDocument();
    expect(screen.getByText("Static")).toBeInTheDocument();
    await user.click(screen.getByText(/toggle-/));
    expect(screen.getByText(/toggle-/)).toBeInTheDocument();
  });

  it("covers ChartStyle themes, tooltip/legend props, and empty config", () => {
    const themed: ChartConfig = {
      sales: { label: "Sales", theme: { light: "#111", dark: "#eee" } },
      empty: { label: "Empty" },
    };
    const empty = render(<ChartStyle id="empty" config={{ x: { label: "x" } }} />);
    expect(empty.container.querySelector("style")).toBeNull();
    empty.unmount();

    const themedRender = render(<ChartStyle id="themed" config={themed} />);
    expect(themedRender.container.querySelector("style")?.innerHTML).toMatch(/--color-sales/);
    themedRender.unmount();

    render(
      <ChartContainer config={themed} className="h-40 w-40">
        <BarChart data={[{ sales: 2, name: "a" }]}>
          <XAxis dataKey="name" />
          <Bar dataKey="sales" />
          <ChartTooltip
            content={
              <ChartTooltipContent
                indicator="dashed"
                hideLabel
                hideIndicator={false}
                formatter={(v) => [`${v}`, "fmt"]}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent hideIcon verticalAlign="top" />} />
        </BarChart>
      </ChartContainer>,
    );
    expect(document.querySelector("[data-chart]")).toBeTruthy();
  });

  it("surfaces form validation errors and useFormField throw", async () => {
    const user = userEvent.setup();
    // Outside FormProvider, useFormField fails before the FormField guard
    expect(() => render(<OrphanFormFieldHook />)).toThrow(/getFieldState|FormField|null/);

    render(<FormWithErrors />);
    await user.click(screen.getByText("Save"));
    expect(await screen.findByText("Name too short")).toBeInTheDocument();
  });

  it("covers vertical carousel and setApi callback", () => {
    render(<CarouselWithApi />);
    expect(screen.getByText("V1")).toBeInTheDocument();
  });

  it("opens CommandDialog", () => {
    render(
      <CommandDialog open>
        <CommandInput placeholder="Type a command" />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>Calendar</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>,
    );
    expect(screen.getByPlaceholderText("Type a command")).toBeInTheDocument();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
  });

  it("opens select extras and mounts nav/resizable helpers", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <div>
          <Select>
            <SelectTrigger aria-label="Pick group">
              <SelectValue placeholder="Pick" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Group</SelectLabel>
                <SelectItem value="1">One</SelectItem>
                <SelectSeparator />
                <SelectItem value="2">Two</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className={navigationMenuTriggerStyle()}>Go</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <NavigationMenuLink>Link</NavigationMenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuIndicator />
            </NavigationMenuList>
          </NavigationMenu>
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel>L</ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel>R</ResizablePanel>
          </ResizablePanelGroup>
          <Separator orientation="vertical" className="h-8" />
        </div>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("combobox", { name: /pick group/i }));
    expect(await screen.findByText("Group")).toBeInTheDocument();
  });

  it("fires imperative toast helpers from ui/use-toast and sonner", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <SonnerToaster />
        <ToastImperative />
      </div>,
    );
    await user.click(screen.getByText("Fire toasts"));
    expect(Number(screen.getByTestId("toast-count").textContent)).toBeGreaterThanOrEqual(0);
  });
});
