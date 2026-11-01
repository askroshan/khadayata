import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Bar, BarChart, XAxis } from "recharts";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import {
  Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger,
} from "@/components/ui/menubar";
import {
  NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider,
  SidebarRail, SidebarSeparator, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Toast, ToastAction, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport,
} from "@/components/ui/toast";
import { Toaster } from "@/components/ui/toaster";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function FormSmoke() {
  const form = useForm({ defaultValues: { name: "" } });
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
              <FormDescription>desc</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

describe("UI primitive mounts (shadcn inventory)", () => {
  it("renders accordion, alert, avatar, badge, breadcrumb, button, calendar, card", () => {
    render(
      <div>
        <Accordion type="single" collapsible>
          <AccordionItem value="a">
            <AccordionTrigger>Item A</AccordionTrigger>
            <AccordionContent>Content A</AccordionContent>
          </AccordionItem>
        </Accordion>
        <Alert>
          <AlertTitle>Title</AlertTitle>
          <AlertDescription>Desc</AlertDescription>
        </Alert>
        <Avatar>
          <AvatarImage src="/x.png" alt="x" />
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
        <Badge>Badge</Badge>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbEllipsis />
            <BreadcrumbItem>
              <BreadcrumbPage>Here</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Button>Click</Button>
        <Calendar mode="single" selected={new Date("2026-01-01")} onSelect={() => {}} />
        <Card>
          <CardHeader>
            <CardTitle>Card</CardTitle>
            <CardDescription>cd</CardDescription>
          </CardHeader>
          <CardContent>body</CardContent>
          <CardFooter>foot</CardFooter>
        </Card>
      </div>,
    );
    expect(screen.getByText("Item A")).toBeInTheDocument();
    expect(screen.getByText("Badge")).toBeInTheDocument();
  });

  it("renders carousel, chart, checkbox, collapsible, command", () => {
    const config = { desktop: { label: "Desktop", color: "#888" } };
    render(
      <div>
        <Carousel>
          <CarouselContent>
            <CarouselItem>One</CarouselItem>
            <CarouselItem>Two</CarouselItem>
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
        <ChartContainer config={config} className="h-40 w-40">
          <BarChart data={[{ desktop: 1, name: "a" }]}>
            <XAxis dataKey="name" />
            <Bar dataKey="desktop" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
        <Checkbox checked onCheckedChange={() => {}} />
        <Collapsible>
          <CollapsibleTrigger>Open</CollapsibleTrigger>
          <CollapsibleContent>Hidden</CollapsibleContent>
        </Collapsible>
        <Command>
          <CommandInput placeholder="Search" />
          <CommandList>
            <CommandEmpty>Empty</CommandEmpty>
            <CommandGroup heading="g">
              <CommandItem>Item</CommandItem>
              <CommandShortcut>⌘K</CommandShortcut>
            </CommandGroup>
            <CommandSeparator />
          </CommandList>
        </Command>
      </div>,
    );
    expect(screen.getByText("One")).toBeInTheDocument();
  });

  it("renders menus, dialogs, drawer, dropdown, form, hover, inputs", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <div>
          <ContextMenu>
            <ContextMenuTrigger>Right click</ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem>Ctx</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dlg</DialogTitle>
                <DialogDescription>d</DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <Drawer>
            <DrawerTrigger asChild>
              <Button>Open drawer</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Drw</DrawerTitle>
                <DrawerDescription>dd</DrawerDescription>
              </DrawerHeader>
              <DrawerFooter>
                <DrawerClose>Close</DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>Menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Label</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Item</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <FormSmoke />
          <HoverCard>
            <HoverCardTrigger>Hover</HoverCardTrigger>
            <HoverCardContent>hc</HoverCardContent>
          </HoverCard>
          <Label htmlFor="i1">L</Label>
          <Input id="i1" />
          <InputOTP maxLength={4}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
          <Textarea />
          <AspectRatio ratio={16 / 9}>
            <div>ar</div>
          </AspectRatio>
        </div>
      </MemoryRouter>,
    );
    await user.click(screen.getByText("Open dialog"));
    expect(await screen.findByText("Dlg")).toBeInTheDocument();
  });

  it("renders menubar, nav, pagination, popover, progress, radio, resizable, scroll", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>New</MenubarItem>
              <MenubarSeparator />
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Nav</NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavigationMenuLink>Link</NavigationMenuLink>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <Popover>
          <PopoverTrigger asChild>
            <Button>Pop</Button>
          </PopoverTrigger>
          <PopoverContent>pc</PopoverContent>
        </Popover>
        <Progress value={40} />
        <RadioGroup defaultValue="a">
          <RadioGroupItem value="a" id="ra" />
          <RadioGroupItem value="b" id="rb" />
        </RadioGroup>
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel>A</ResizablePanel>
          <ResizableHandle />
          <ResizablePanel>B</ResizablePanel>
        </ResizablePanelGroup>
        <ScrollArea className="h-20 w-20">
          <div className="h-40">scroll</div>
          <ScrollBar />
        </ScrollArea>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Pick" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">One</SelectItem>
          </SelectContent>
        </Select>
        <Separator />
        <Sheet>
          <SheetTrigger asChild>
            <Button>Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>S</SheetTitle>
              <SheetDescription>sd</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </div>,
    );
    await user.click(screen.getByText("Pop"));
    expect(await screen.findByText("pc")).toBeInTheDocument();
  });

  it("renders sidebar, skeleton, slider, sonner, switch, table, tabs, toast, toggle, tooltip", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <SidebarProvider>
          <Sidebar>
            <SidebarHeader>Head</SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Group</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton>Item</SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarSeparator />
            </SidebarContent>
            <SidebarFooter>Foot</SidebarFooter>
            <SidebarRail />
          </Sidebar>
          <SidebarInset>
            <SidebarTrigger />
            inset
          </SidebarInset>
        </SidebarProvider>
        <Skeleton className="h-4 w-4" />
        <Slider defaultValue={[30]} max={100} step={1} />
        <SonnerToaster />
        <Switch checked onCheckedChange={() => {}} />
        <Table>
          <TableCaption>cap</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>H</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>C</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>F</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        <Tabs defaultValue="t1">
          <TabsList>
            <TabsTrigger value="t1">T1</TabsTrigger>
            <TabsTrigger value="t2">T2</TabsTrigger>
          </TabsList>
          <TabsContent value="t1">c1</TabsContent>
          <TabsContent value="t2">c2</TabsContent>
        </Tabs>
        <ToastProvider>
          <Toast>
            <ToastTitle>tt</ToastTitle>
            <ToastDescription>td</ToastDescription>
            <ToastAction altText="ok">OK</ToastAction>
            <ToastClose />
          </Toast>
          <ToastViewport />
        </ToastProvider>
        <Toaster />
        <Toggle>Bold</Toggle>
        <ToggleGroup type="single">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b">B</ToggleGroupItem>
        </ToggleGroup>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button>Tip</Button>
          </TooltipTrigger>
          <TooltipContent>tooltip</TooltipContent>
        </Tooltip>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button>Alert</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sure?</AlertDialogTitle>
              <AlertDialogDescription>desc</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TooltipProvider>,
    );
    expect(screen.getByText("inset")).toBeInTheDocument();
    await user.click(screen.getByText("Alert"));
    expect(await screen.findByText("Sure?")).toBeInTheDocument();
  });
});
