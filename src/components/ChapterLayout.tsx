import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useChapterSubdomain } from "@/hooks/useChapterSubdomain";
import { useSubdomainSSO } from "@/hooks/useSubdomainSSO";
import { Users, Calendar, Newspaper, Briefcase, Camera, Phone, MapPin, Chrome as Home } from "lucide-react";
import patternOrnament from "@/assets/pattern-ornament.png";

const CHAPTER_NAV = [
  { icon: Home, label: "About", path: "/directory" },
  { icon: Users, label: "Committee", path: "/directory" },
  { icon: Users, label: "Directory", path: "/directory" },
  { icon: Newspaper, label: "News", path: "/news" },
  { icon: Calendar, label: "Events", path: "/events" },
  { icon: Camera, label: "Photos", path: "/events" },
  { icon: Briefcase, label: "Business", path: "/business" },
  { icon: Briefcase, label: "Jobs", path: "/business" },
  { icon: Phone, label: "Contact", path: "/emergency" },
];

interface ChapterLayoutProps {
  children: ReactNode;
}

export function ChapterLayout({ children }: ChapterLayoutProps) {
  const { chapter, isLoading, error } = useChapterSubdomain();
  const location = useLocation();
  useSubdomainSSO();

  if (error) {
    console.error("Chapter layout error:", error);
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading chapter...</div>
      </div>
    );
  }

  if (!chapter) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background">
      {/* Chapter header */}
      <header className="border-b border-border bg-card/95 backdrop-blur-md sticky top-0 z-50">
        <div className="container max-w-6xl flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3">
            <img src={patternOrnament} alt="" className="w-7 h-7 opacity-70" />
            <div>
              <h1 className="text-lg font-display font-bold text-gradient-hero">{chapter.name}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {(chapter.cities as { name: string } | null)?.name}, {(chapter.states as { name: string } | null)?.name}, {(chapter.countries as { name: string } | null)?.name}
              </p>
            </div>
          </div>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            KhadayataOnline Global →
          </Link>
        </div>
        {/* Chapter nav */}
        <div className="container max-w-6xl px-4 overflow-x-auto">
          <nav className="flex gap-1 pb-2">
            {CHAPTER_NAV.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                    active
                      ? "gradient-warm text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="container max-w-6xl">
        {children}
      </main>
    </div>
  );
}
