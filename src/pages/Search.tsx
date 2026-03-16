import { useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCountries, useStates, useCities } from "@/hooks/useMember";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search as SearchIcon, Users, Calendar, Briefcase, BookOpen, Newspaper, Sparkles, Building2, GraduationCap, Handshake, MapPin, ChevronDown, HeartPulse, IndianRupee, Mic, Heart, Filter, CircleCheck as CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

type SearchCategory = "all" | "people" | "events" | "businesses" | "jobs" | "news" | "scholarships" | "mentorships" | "archives" | "donations";

const CATEGORIES: { value: SearchCategory; label: string; icon: typeof Users; gradient: string }[] = [
  { value: "all", label: "All", icon: Sparkles, gradient: "from-primary to-secondary" },
  { value: "people", label: "People", icon: Users, gradient: "from-primary to-primary/70" },
  { value: "events", label: "Events", icon: Calendar, gradient: "from-secondary to-secondary/70" },
  { value: "businesses", label: "Business", icon: Building2, gradient: "from-gold to-gold/70" },
  { value: "jobs", label: "Jobs", icon: Briefcase, gradient: "from-jewel to-jewel/70" },
  { value: "news", label: "News", icon: Newspaper, gradient: "from-primary to-jewel" },
  { value: "scholarships", label: "Scholarships", icon: GraduationCap, gradient: "from-secondary to-primary" },
  { value: "mentorships", label: "Mentorship", icon: Handshake, gradient: "from-gold to-secondary" },
  { value: "archives", label: "Archives", icon: BookOpen, gradient: "from-jewel to-primary" },
];

export default function GlobalSearch() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [dobFilter, setDobFilter] = useState("");
  const [category, setCategory] = useState<SearchCategory>("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [countryId, setCountryId] = useState("");
  const [stateId, setStateId] = useState("");
  const [cityId, setCityId] = useState("");

  const { data: countries } = useCountries();
  const { data: states } = useStates(countryId || undefined);
  const { data: cities } = useCities(stateId || undefined);

  const isSearching = query.length > 1 || dobFilter || countryId || stateId || cityId;
  const searchIn = (cat: SearchCategory) => category === "all" || category === cat;

  const { data: members } = useQuery({
    queryKey: ["search-members", query, dobFilter, countryId, stateId, cityId],
    queryFn: async () => {
      if (!query.trim() && !dobFilter && !countryId) return [];
      let q = supabase.from("members").select("id, first_name, last_name, photo_url, gender, dob, chapters(name, country_id, state_id, city_id), verification_level, global_id").eq("onboarding_completed", true);
      if (query.trim()) q = q.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,global_id.ilike.%${query}%`);
      if (dobFilter) q = q.eq("dob", dobFilter);
      if (countryId) q = q.eq("chapters.country_id", countryId);
      if (stateId) q = q.eq("chapters.state_id", stateId);
      if (cityId) q = q.eq("chapters.city_id", cityId);
      const { data } = await q.limit(20);
      return data ?? [];
    },
    enabled: !!isSearching && searchIn("people"),
  });

  const { data: events } = useQuery({
    queryKey: ["search-events", query, countryId, stateId, cityId],
    queryFn: async () => {
      if (!query.trim() && !countryId) return [];
      let q = supabase.from("events").select("id, name, starts_at, venue, category, event_type, fee_amount, fee_currency, country_id, state_id, city_id, countries(name), states(name), cities(name)").eq("status", "published");
      if (query.trim()) q = q.or(`name.ilike.%${query}%,venue.ilike.%${query}%,category.ilike.%${query}%`);
      if (countryId) q = q.eq("country_id", countryId);
      if (stateId) q = q.eq("state_id", stateId);
      if (cityId) q = q.eq("city_id", cityId);
      const { data } = await q.order("starts_at", { ascending: true }).limit(20);
      return data ?? [];
    },
    enabled: !!isSearching && searchIn("events"),
  });

  const { data: businesses } = useQuery({
    queryKey: ["search-businesses", query, countryId, stateId, cityId],
    queryFn: async () => {
      if (!query.trim() && !countryId) return [];
      let q = supabase.from("businesses").select("id, name, sector, phone, email, city_id, state_id, country_id, countries(name), states(name), cities(name), verified, employee_count");
      if (query.trim()) q = q.or(`name.ilike.%${query}%,sector.ilike.%${query}%,description.ilike.%${query}%`);
      if (countryId) q = q.eq("country_id", countryId);
      if (stateId) q = q.eq("state_id", stateId);
      if (cityId) q = q.eq("city_id", cityId);
      const { data } = await q.limit(20);
      return data ?? [];
    },
    enabled: !!isSearching && searchIn("businesses"),
  });

  const { data: jobs } = useQuery({
    queryKey: ["search-jobs", query, countryId, stateId, cityId],
    queryFn: async () => {
      if (!query.trim() && !countryId) return [];
      let q = supabase.from("jobs").select("id, title, location, remote, employment_type, salary_min, salary_max, salary_currency, salary_period, country_id, state_id, city_id, countries(name), states(name), cities(name)").eq("status", "open");
      if (query.trim()) q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`);
      if (countryId) q = q.eq("country_id", countryId);
      if (stateId) q = q.eq("state_id", stateId);
      if (cityId) q = q.eq("city_id", cityId);
      const { data } = await q.limit(20);
      return data ?? [];
    },
    enabled: !!isSearching && searchIn("jobs"),
  });

  const { data: news } = useQuery({
    queryKey: ["search-news", query, countryId, stateId, cityId],
    queryFn: async () => {
      if (!query.trim() && !countryId) return [];
      let q = supabase.from("content_news").select("id, title, published_at, summary, category, author_name, country_id, state_id, city_id, countries(name), states(name), cities(name)").eq("status", "published");
      if (query.trim()) q = q.or(`title.ilike.%${query}%,summary.ilike.%${query}%,body.ilike.%${query}%`);
      if (countryId) q = q.eq("country_id", countryId);
      if (stateId) q = q.eq("state_id", stateId);
      if (cityId) q = q.eq("city_id", cityId);
      const { data } = await q.order("published_at", { ascending: false }).limit(20);
      return data ?? [];
    },
    enabled: !!isSearching && searchIn("news"),
  });

  const { data: scholarships } = useQuery({
    queryKey: ["search-scholarships", query, countryId, stateId, cityId],
    queryFn: async () => {
      if (!query.trim() && !countryId) return [];
      let q = supabase.from("scholarships").select("id, name, amount, currency, deadline, category, country_id, state_id, city_id, countries(name), states(name), cities(name)").eq("status", "active");
      if (query.trim()) q = q.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
      if (countryId) q = q.eq("country_id", countryId);
      if (stateId) q = q.eq("state_id", stateId);
      if (cityId) q = q.eq("city_id", cityId);
      const { data } = await q.limit(20);
      return data ?? [];
    },
    enabled: !!isSearching && searchIn("scholarships"),
  });

  const { data: mentorshipsData } = useQuery({
    queryKey: ["search-mentorships", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const { data } = await supabase.from("mentorships").select("id, skills, status, mentor:members!mentorships_mentor_member_id_fkey(first_name, last_name, chapters(name))").eq("status", "available").limit(20);
      // Client-side skill filter
      return (data ?? []).filter(m => (m.skills as string[])?.some(s => s.toLowerCase().includes(query.toLowerCase())));
    },
    enabled: !!isSearching && searchIn("mentorships"),
  });

  const { data: magazines } = useQuery({
    queryKey: ["search-magazines", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const { data } = await supabase.from("magazine_issues").select("id, title, issue_date, volume").ilike("title", `%${query}%`).limit(20);
      return data ?? [];
    },
    enabled: !!isSearching && searchIn("archives"),
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const counts: Record<SearchCategory, number> = {
    all: 0, people: members?.length ?? 0, events: events?.length ?? 0,
    businesses: businesses?.length ?? 0, jobs: jobs?.length ?? 0,
    news: news?.length ?? 0, scholarships: scholarships?.length ?? 0,
    mentorships: mentorshipsData?.length ?? 0, archives: magazines?.length ?? 0,
    donations: 0,
  };
  counts.all = Object.values(counts).reduce((a, b) => a + b, 0);

  const locStr = (item: Record<string, unknown>) => [
    (item.cities as { name: string } | null)?.name,
    (item.states as { name: string } | null)?.name,
    (item.countries as { name: string } | null)?.name,
  ].filter(Boolean).join(", ");

  const clearFilters = () => { setCountryId(""); setStateId(""); setCityId(""); setDobFilter(""); };

  return (
    <AppLayout title="Search">
      <div className="p-3 sm:p-6 space-y-6">
        {/* Hero search */}
        <div className="gradient-hero rounded-2xl p-6 sm:p-8 text-primary-foreground">
          <h1 className="text-2xl sm:text-3xl font-display font-bold flex items-center gap-2"><Sparkles className="w-6 sm:w-7 h-6 sm:h-7 text-gold" /> Global Search</h1>
          <p className="text-primary-foreground/70 mt-1 text-sm">Search across people, events, businesses, jobs, news, scholarships, mentorship & archives</p>
          <div role="search" aria-label="Global community search" className="relative mt-4">
            <label htmlFor="global-search-input" className="sr-only">Search community members, events, businesses and more</label>
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
            <Input id="global-search-input" placeholder="Search by name, Global ID, keyword..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-12 text-lg h-14 bg-primary-foreground text-foreground border-0 rounded-xl" maxLength={200} autoFocus aria-label="Search" />
          </div>

          {/* Advanced filter toggle */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="mt-3 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10">
                <Filter className="w-3.5 h-3.5 mr-1" />Advanced Filters <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="grid gap-3 sm:grid-cols-4 bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-4">
                <div>
                  <Label className="text-primary-foreground/80 text-xs">Date of Birth</Label>
                  <Input type="date" value={dobFilter} onChange={e => setDobFilter(e.target.value)} className="bg-primary-foreground text-foreground border-0" />
                </div>
                <div>
                  <Label className="text-primary-foreground/80 text-xs">Country</Label>
                  <Select value={countryId} onValueChange={v => { setCountryId(v); setStateId(""); setCityId(""); }}>
                    <SelectTrigger className="bg-primary-foreground text-foreground border-0"><SelectValue placeholder="Any country" /></SelectTrigger>
                    <SelectContent>{countries?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-primary-foreground/80 text-xs">State</Label>
                  <Select value={stateId} onValueChange={v => { setStateId(v); setCityId(""); }} disabled={!countryId}>
                    <SelectTrigger className="bg-primary-foreground text-foreground border-0"><SelectValue placeholder="Any state" /></SelectTrigger>
                    <SelectContent>{states?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-primary-foreground/80 text-xs">City</Label>
                  <Select value={cityId} onValueChange={setCityId} disabled={!stateId}>
                    <SelectTrigger className="bg-primary-foreground text-foreground border-0"><SelectValue placeholder="Any city" /></SelectTrigger>
                    <SelectContent>{cities?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {(countryId || stateId || cityId || dobFilter) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-primary-foreground/70 hover:text-primary-foreground text-xs">Clear filters</Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Category icons */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = category === cat.value;
            const count = counts[cat.value];
            return (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl text-xs whitespace-nowrap transition-all shrink-0 ${
                  active ? "bg-primary text-primary-foreground shadow-md" : "bg-card hover:bg-muted border border-border"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{cat.label}</span>
                {isSearching && count > 0 && <Badge variant={active ? "secondary" : "outline"} className="text-[10px] px-1.5 h-4">{count}</Badge>}
              </button>
            );
          })}
        </div>

        {/* Results */}
        {!isSearching ? (
          <div className="text-center py-16">
            <SearchIcon className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground">Start typing or select location filters to search</p>
          </div>
        ) : (
          <div className="space-y-3">
            {isSearching && <p className="text-sm text-muted-foreground">{counts.all} results found</p>}

            {/* People */}
            {searchIn("people") && members?.map((m) => (
              <Link key={m.id} to={`/member/${m.id}`}>
                <Card className="shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                      {m.photo_url ? <img src={m.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" /> : <Users className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{m.first_name} {m.last_name}</p>
                        {m.verification_level >= 1 && <Badge variant="outline" className="text-[10px] shrink-0">L{m.verification_level}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{(m.chapters as { name: string } | null)?.name}</p>
                      {m.global_id && <p className="text-[10px] text-muted-foreground/60 font-mono">{m.global_id}</p>}
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">Person</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {/* Events */}
            {searchIn("events") && events?.map((e) => (
              <Link key={e.id} to="/events">
                <Card className="shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5 cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center text-primary-foreground shrink-0"><Calendar className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(e.starts_at), "MMM d, yyyy")}</span>
                        {e.venue && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{e.venue}</span>}
                        {locStr(e) && <span>{locStr(e)}</span>}
                      </div>
                      <div className="flex gap-1 mt-1">
                        {e.category && <Badge variant="outline" className="text-[10px]">{e.category}</Badge>}
                        {e.event_type && <Badge variant="secondary" className="text-[10px] capitalize">{e.event_type.replace("_", " ")}</Badge>}
                        {e.fee_amount && <Badge variant="secondary" className="text-[10px]">{e.fee_currency} {Number(e.fee_amount).toLocaleString()}</Badge>}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">Event</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {/* Businesses */}
            {searchIn("businesses") && businesses?.map((b) => (
              <Link key={b.id} to="/business">
                <Card className="shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5 cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold/70 flex items-center justify-center text-primary-foreground shrink-0"><Building2 className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{b.name}</p>
                        {b.verified && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {b.sector && <span>{b.sector}</span>}
                        {locStr(b) && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{locStr(b)}</span>}
                        {b.employee_count && <span>{b.employee_count} employees</span>}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">Business</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {/* Jobs */}
            {searchIn("jobs") && jobs?.map((j) => {
              const salaryStr = j.salary_min || j.salary_max
                ? `${j.salary_currency ?? "INR"} ${j.salary_min ? Number(j.salary_min).toLocaleString() : ""}${j.salary_min && j.salary_max ? "-" : ""}${j.salary_max ? Number(j.salary_max).toLocaleString() : ""}`
                : null;
              return (
                <Link key={j.id} to="/business">
                  <Card className="shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5 cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-jewel to-jewel/70 flex items-center justify-center text-primary-foreground shrink-0"><Briefcase className="w-4 h-4" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{j.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          {(j.location || locStr(j)) && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{j.location || locStr(j)}</span>}
                          {j.remote && <span>Remote</span>}
                          {salaryStr && <span>{salaryStr}</span>}
                          <Badge variant="outline" className="text-[10px] capitalize">{(j.employment_type ?? "full_time").replace("_", " ")}</Badge>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">Job</Badge>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}

            {/* News */}
            {searchIn("news") && news?.map((n) => (
              <Link key={n.id} to="/news">
                <Card className="shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5 cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-jewel flex items-center justify-center text-primary-foreground shrink-0"><Newspaper className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {n.published_at && <span>{format(new Date(n.published_at), "MMM d, yyyy")}</span>}
                        {n.author_name && <span>by {n.author_name}</span>}
                        {n.category && <Badge variant="outline" className="text-[10px]">{n.category}</Badge>}
                        {locStr(n) && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{locStr(n)}</span>}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">News</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {/* Scholarships */}
            {searchIn("scholarships") && scholarships?.map((s) => (
              <Link key={s.id} to="/scholarships">
                <Card className="shadow-card hover:shadow-elevated transition-all">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-primary-foreground shrink-0"><GraduationCap className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {s.amount && <span>{s.currency} {Number(s.amount).toLocaleString()}</span>}
                        {s.deadline && <span>Deadline: {format(new Date(s.deadline), "MMM d")}</span>}
                        {s.category && <Badge variant="outline" className="text-[10px]">{s.category}</Badge>}
                        {locStr(s) && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{locStr(s)}</span>}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">Scholarship</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {/* Mentorships */}
            {searchIn("mentorships") && mentorshipsData?.map((m) => {
              const mentor = m.mentor as { first_name: string; last_name: string; chapters: { name: string } | null } | null;
              return (
                <Link key={m.id} to="/mentorship">
                  <Card className="shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5 cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-secondary flex items-center justify-center text-primary-foreground shrink-0"><Handshake className="w-4 h-4" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{mentor?.first_name} {mentor?.last_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {mentor?.chapters?.name && <span>{mentor.chapters.name}</span>}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(m.skills as string[])?.map(s => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">Mentor</Badge>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}

            {/* Archives */}
            {searchIn("archives") && magazines?.map((m) => (
              <Link key={m.id} to="/archives">
                <Card className="shadow-card hover:shadow-elevated transition-all">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-jewel to-primary flex items-center justify-center text-primary-foreground shrink-0"><BookOpen className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.title}</p>
                      <div className="text-xs text-muted-foreground">
                        {m.issue_date && <span>{format(new Date(m.issue_date), "MMM yyyy")}</span>}
                        {m.volume && <span className="ml-2">Vol. {m.volume}</span>}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">Archive</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {counts.all === 0 && (
              <div className="text-center py-16">
                <SearchIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No results found. Try different keywords or filters.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
