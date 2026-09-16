import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useChapters } from "@/hooks/useMember";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, ChevronRight, Globe, Filter, X } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import SEOMeta from "@/components/SEOMeta";

type ChapterWithLocation = {
  id: string;
  slug: string;
  name: string;
  country_id: string | null;
  state_id: string | null;
  city_id: string | null;
  countries: { name: string; iso2: string } | null;
  states: { name: string; code: string } | null;
  cities: { name: string; code: string } | null;
};

export default function Chapters() {
  const { data: chapters, isLoading } = useChapters();
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");

  const typedChapters = useMemo(() => (chapters ?? []) as unknown as ChapterWithLocation[], [chapters]);

  // Build filter options from the chapters data itself — no extra DB calls
  const countries = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const ch of typedChapters) {
      if (ch.country_id && ch.countries && !map.has(ch.country_id)) {
        map.set(ch.country_id, { id: ch.country_id, name: ch.countries.name });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [typedChapters]);

  const states = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const ch of typedChapters) {
      if (
        ch.state_id &&
        ch.states &&
        ch.country_id === selectedCountry &&
        !map.has(ch.state_id)
      ) {
        map.set(ch.state_id, { id: ch.state_id, name: ch.states.name });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [typedChapters, selectedCountry]);

  const cities = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const ch of typedChapters) {
      if (
        ch.city_id &&
        ch.cities &&
        ch.country_id === selectedCountry &&
        (selectedState === "all" || ch.state_id === selectedState) &&
        !map.has(ch.city_id)
      ) {
        map.set(ch.city_id, { id: ch.city_id, name: ch.cities.name });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [typedChapters, selectedCountry, selectedState]);

  const filtered = useMemo(() => {
    return typedChapters.filter((ch) => {
      if (selectedCountry !== "all" && ch.country_id !== selectedCountry) return false;
      if (selectedState !== "all" && ch.state_id !== selectedState) return false;
      if (selectedCity !== "all" && ch.city_id !== selectedCity) return false;
      return true;
    });
  }, [typedChapters, selectedCountry, selectedState, selectedCity]);

  const hasFilters = selectedCountry !== "all" || selectedState !== "all" || selectedCity !== "all";

  function clearFilters() {
    setSelectedCountry("all");
    setSelectedState("all");
    setSelectedCity("all");
  }

  function handleCountryChange(value: string) {
    setSelectedCountry(value);
    setSelectedState("all");
    setSelectedCity("all");
  }

  function handleStateChange(value: string) {
    setSelectedState(value);
    setSelectedCity("all");
  }

  return (
    <PublicLayout title="Chapters">
    <SEOMeta
      title="Chapters — Khadayata Community Worldwide"
      description="Explore all 67+ Khadayata community chapters across 28 countries. Find your local chapter in India (Ahmedabad, Mumbai, Surat, Delhi, Jaipur), USA (New York), UK (London), UAE (Dubai), and more."
      url="/chapters"
      keywords="Khadayata chapters, Khadayata community worldwide, Indian community chapters, Gujarati community chapters, Khadayata India, Khadayata USA, Khadayata UK, Khadayata Dubai, Khadayata London"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Chapters", url: "/chapters" },
      ]}
    />
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
        {/* Filters */}
        <div className="mb-6 rounded-xl border border-border/60 bg-card/50 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Filter by location</h2>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="ml-auto h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" /> Clear
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Country — required filter */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Country</label>
              <Select value={selectedCountry} onValueChange={handleCountryChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All countries</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* State — optional, depends on country */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                State <span className="text-muted-foreground/60">(optional)</span>
              </label>
              <Select
                value={selectedState}
                onValueChange={handleStateChange}
                disabled={selectedCountry === "all" || states.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={
                    selectedCountry === "all" ? "Select country first" :
                    states.length === 0 ? "No states" : "All states"
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  {states.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* City — optional, depends on state (or country if no states) */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                City <span className="text-muted-foreground/60">(optional)</span>
              </label>
              <Select
                value={selectedCity}
                onValueChange={setSelectedCity}
                disabled={selectedCountry === "all" || cities.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={
                    selectedCountry === "all" ? "Select country first" :
                    cities.length === 0 ? "No cities" : "All cities"
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cities</SelectItem>
                  {cities.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Result count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${filtered.length} chapter${filtered.length !== 1 ? "s" : ""}`}
            {hasFilters && !isLoading && filtered.length !== typedChapters.length && (
              <span className="text-muted-foreground/60"> of {typedChapters.length}</span>
            )}
          </p>
        </div>

        {/* Chapter grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No chapters match your filters.</p>
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 gap-1">
              <X className="w-3.5 h-3.5" /> Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((ch) => {
              const city = ch.cities?.name;
              const state = ch.states?.name;
              const country = ch.countries?.name;
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
