import { Link } from "react-router-dom";
import { useChapters } from "@/hooks/useMember";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, ChevronRight, Globe } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import SEOMeta from "@/components/SEOMeta";

export default function Chapters() {
  const { data: chapters, isLoading } = useChapters();

  return (
    <PublicLayout title="Chapters">
    <SEOMeta title="Chapters" description="Explore Khadayata community chapters across 28 countries. Find your local chapter in India, USA, UK, Kenya, Australia and more." url="/chapters" keywords="Khadayata chapters, Khadayata community worldwide, Indian community chapters, Gujarati community chapters" />
    <div className="bg-background">
      <div className="gradient-hero py-10 sm:py-14">
        <div className="container max-w-6xl">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-6 h-6 text-primary-foreground/80" />
            <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-primary-foreground">
              Chapters
            </h1>
          </div>
          <p className="text-primary-foreground/70 text-sm max-w-lg">
            Explore Khadayata community chapters around the world.
          </p>
        </div>
      </div>

      <div className="container max-w-6xl py-8">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {chapters?.map((ch) => {
              const city = (ch.cities as { name: string } | null)?.name;
              const state = (ch.states as { name: string } | null)?.name;
              const country = (ch.countries as { name: string } | null)?.name;
              return (
                <Link key={ch.id} to={`/chapters/${ch.slug}`} className="group">
                  <Card className="shadow-card hover:shadow-elevated transition-all group-hover:-translate-y-0.5 h-full">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <span className="text-primary-foreground font-display font-bold text-lg">
                          {ch.name.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display font-bold text-sm truncate">{ch.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {[city, state, country].filter(Boolean).join(", ")}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </PublicLayout>
  );
}
