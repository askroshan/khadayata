import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMember } from "@/hooks/useMember";
import { useRoles } from "@/hooks/useRoles";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Shield, Users, Heart } from "lucide-react";
import { defaultChapterFilter } from "@/lib/chapter-nav-utils";
import { E2E_MEMBER_FIRST_NAME } from "@/lib/test-members";

const VERIFICATION_LABELS: Record<number, string> = { 0: "L0", 1: "L1", 2: "L2" };
const VERIFICATION_COLORS: Record<number, string> = { 0: "bg-muted text-muted-foreground", 1: "bg-gold/20 text-gold-foreground", 2: "bg-success/20 text-success" };

export default function Directory() {
  const { user, loading } = useAuth();
  const { member: currentMember } = useMember();
  const { isGlobalAdmin } = useRoles();
  const [search, setSearch] = useState("");
  const [chapterFilter, setChapterFilter] = useState("all");

  // Default the filter to the member's own chapter once member data loads
  useEffect(() => {
    if (currentMember !== undefined) {
      setChapterFilter(defaultChapterFilter(currentMember?.chapter_id ?? null, isGlobalAdmin));
    }
  }, [currentMember, isGlobalAdmin]);

  const { data: members, isLoading } = useQuery({
    queryKey: ["directory", search, chapterFilter],
    queryFn: async () => {
      let q = supabase.from("members").select("*, chapters(name)").eq("onboarding_completed", true).neq("first_name", E2E_MEMBER_FIRST_NAME).order("last_name");
      if (search.trim()) q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
      if (chapterFilter !== "all") q = q.eq("chapter_id", chapterFilter);
      const { data, error } = await q.limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: chapters } = useQuery({
    queryKey: ["chapters-list"],
    queryFn: async () => { const { data } = await supabase.from("chapters").select("id, name").order("name"); return data ?? []; },
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppLayout title="Member Directory">
      <div className="space-y-6">
        {/* Header with gradient */}
        <div className="gradient-hero p-4 sm:p-8 text-primary-foreground">
          <h1 className="text-xl sm:text-3xl font-display font-bold flex items-center gap-2">
            <Users className="w-5 sm:w-7 h-5 sm:h-7" /> Member Directory
          </h1>
          <p className="text-primary-foreground/70 mt-1 text-sm sm:text-base">Browse and connect with community members</p>
          <div role="search" aria-label="Member directory search" className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-6">
            <div className="relative flex-1">
              <label htmlFor="directory-search" className="sr-only">Search members by name</label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input id="directory-search" placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-primary-foreground text-foreground border-0" maxLength={100} />
            </div>
            <Select value={chapterFilter} onValueChange={setChapterFilter}>
              <SelectTrigger className="w-full sm:w-56 bg-primary-foreground text-foreground border-0" aria-label="Filter by chapter"><SelectValue placeholder="All chapters" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chapters</SelectItem>
                {chapters?.map((ch) => <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="px-3 sm:px-6 pb-4 sm:pb-6 space-y-4">
          {/* L0 nudge — ask members to vouch */}
          {(currentMember?.verification_level ?? 0) === 0 && (
            <div className="flex items-start gap-3 rounded-xl bg-amber-50/60 border border-amber-200/50 dark:bg-amber-900/10 dark:border-amber-700/30 px-4 py-3">
              <Heart className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <strong>Get vouched to reach L1.</strong> Click on any verified member's card to visit their profile, then scroll to the Vouches section to vouch for them — or ask them to vouch for you. You need 2 vouches to unlock full access.
              </p>
            </div>
          )}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : !members?.length ? (
            <div className="text-center py-16"><Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No members found</p></div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((m) => (
                <Link key={m.id} to={`/member/${m.id}`}>
                  <Card className="shadow-card hover:shadow-elevated transition-all cursor-pointer group hover:-translate-y-0.5">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full gradient-jewel flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0 group-hover:scale-110 transition-transform">
                          {m.first_name?.[0]}{m.last_name?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-display font-bold text-sm truncate group-hover:text-primary transition-colors">
                            {m.first_name} {m.last_name}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {(m.chapters as { name: string } | null)?.name ?? "No chapter"}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={`${VERIFICATION_COLORS[m.verification_level ?? 0]} text-xs border-0`}>
                              <Shield className="w-3 h-3 mr-0.5" />
                              {VERIFICATION_LABELS[m.verification_level ?? 0]}
                            </Badge>
                            {m.gender && <Badge variant="outline" className="text-xs">{m.gender}</Badge>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
