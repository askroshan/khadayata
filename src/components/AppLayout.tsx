import { ReactNode, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRoles } from "@/hooks/useRoles";
import { COMMUNITY_FULL_NAME } from "@/lib/community";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LogOut, Chrome as Home, Users, Calendar, Briefcase, Heart, BookOpen, Building2, Shield, Bell, Search, Menu, Newspaper, User, Handshake, GraduationCap, TriangleAlert as AlertTriangle, MapPin, BookMarked, IndianRupee, Library, Mic, HeartPulse, Settings, Flag } from "lucide-react";
const LOGO = "/Screenshot_2026-03-16_at_9.18.14_AM.png";
import { NotificationsPanel } from "@/components/NotificationsPanel";

type NavItem = {
  icon: typeof Home;
  label: string;
  path: string;
  adminOnly?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: [
      { icon: Home, label: "Dashboard", path: "/dashboard" },
      { icon: Search, label: "Global Search", path: "/search" },
    ],
  },
  {
    label: "Community",
    items: [
      { icon: Users, label: "Members", path: "/directory" },
      { icon: Heart, label: "Matrimonial", path: "/matrimonial/manage" },
    ],
  },
  {
    label: "Economy",
    items: [
      { icon: Briefcase, label: "Business & Jobs", path: "/business/manage" },
      { icon: Handshake, label: "Mentorship", path: "/mentorship/manage" },
      { icon: GraduationCap, label: "Scholarships", path: "/scholarships/manage" },
    ],
  },
  {
    label: "Engage",
    items: [
      { icon: Calendar, label: "Events", path: "/events/manage" },
      { icon: Newspaper, label: "News", path: "/news/manage" },
      { icon: Building2, label: "Kotyark Temple", path: "/temple" },
      { icon: IndianRupee, label: "Donate", path: "/temple" },
    ],
  },
  {
    label: "Heritage",
    items: [
      { icon: Library, label: "Khadayata Jyoti", path: "/archives" },
      { icon: Mic, label: "Oral History", path: "/oral-history" },
      { icon: BookMarked, label: "Elders Council", path: "/elders-council" },
    ],
  },
  {
    label: "Services",
    items: [
      { icon: Building2, label: "Hall Booking", path: "/services#hall" },
      { icon: HeartPulse, label: "Medical Aid", path: "/services#medical" },
      { icon: AlertTriangle, label: "Emergency", path: "/emergency" },
    ],
  },
  {
    label: "Account",
    items: [
      { icon: User, label: "My Profile", path: "/profile" },
      { icon: Flag, label: "Moderation", path: "/moderation", adminOnly: true },
      { icon: Shield, label: "Admin", path: "/admin", adminOnly: true },
      { icon: Settings, label: "Settings", path: "/settings" },
    ],
  },
];

function NavLinks({ onClick }: { onClick?: () => void }) {
  const location = useLocation();
  const { isAnyAdmin, isLoading: rolesLoading } = useRoles();
  const currentPath = location.pathname + location.hash;

  return (
    <nav className="p-2 space-y-1">
      {NAV_GROUPS.map((group) => {
        const visibleItems = group.items.filter(item => !item.adminOnly || (!rolesLoading && isAnyAdmin));
        if (!visibleItems.length) return null;
        return (
          <div key={group.label}>
            <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
              {group.label}
            </p>
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = item.path.includes("#") ? currentPath === item.path : location.pathname === item.path;
              return (
                <Link
                  key={item.path + item.label}
                  to={item.path}
                  onClick={onClick}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
                    active
                      ? "gradient-warm text-primary-foreground font-semibold shadow-lg"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.adminOnly && (
                    <Badge className="ml-auto text-[9px] px-1.5 py-0 h-4 bg-primary/20 text-primary border-0">Admin</Badge>
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

export default function AppLayout({ children, title }: { children: ReactNode; title?: string }) {
  const { user, signOut } = useAuth();
  const { isAnyAdmin, isLoading: rolesLoading, roles } = useRoles();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-primary-foreground focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>
      {/* Top bar */}
      <header role="banner" className="border-b border-border bg-card/95 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center justify-between py-3 px-3 sm:px-4 lg:px-6">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0" aria-label="Open navigation menu">
                  <Menu className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-card overflow-y-auto">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <img src={LOGO} alt="Khadayata" style={{ height: 32, width: "auto", mixBlendMode: "multiply" }} />
                    <span className="text-lg font-display font-bold text-gradient-hero">KhadayataOnline</span>
                  </div>
                  {!rolesLoading && isAnyAdmin && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {roles.map(r => (
                        <Badge key={r} className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-0">{r}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <NavLinks onClick={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
              <img src={LOGO} alt="Khadayata" style={{ height: 32, width: "auto", mixBlendMode: "multiply", flexShrink: 0 }} />
              <span className="text-lg font-display font-bold text-gradient-hero truncate">{title || "KhadayataOnline"}</span>
            </Link>
            {title && <span className="hidden sm:inline text-sm text-muted-foreground shrink-0">/ {title}</span>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!rolesLoading && isAnyAdmin && (
              <Badge className="hidden md:flex text-[10px] bg-primary/10 text-primary border-0 items-center gap-1">
                <Shield className="w-2.5 h-2.5" /> Admin
              </Badge>
            )}
            <span className="text-xs text-muted-foreground hidden md:inline truncate max-w-[160px]">{user?.email}</span>
            <NotificationsPanel />
            <Button variant="outline" size="sm" onClick={() => signOut().then(() => navigate("/"))} aria-label="Sign out" className="h-8">
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-56 shrink-0 border-r border-border bg-card/50 min-h-[calc(100vh-53px)] sticky top-[53px] overflow-y-auto">
          {!rolesLoading && isAnyAdmin && (
            <div className="px-3 pt-3">
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-2">
                <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wider mb-1">Your Roles</p>
                <div className="flex flex-wrap gap-1">
                  {roles.map(r => (
                    <Badge key={r} className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-0">{r}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          <NavLinks />
        </aside>

        {/* Content */}
        <main id="main-content" className="flex-1 min-w-0" tabIndex={-1}>
          {children}
        </main>
      </div>
      <footer role="contentinfo" className="sr-only">
        KhadayataOnline — {COMMUNITY_FULL_NAME}
      </footer>
    </div>
  );
}
