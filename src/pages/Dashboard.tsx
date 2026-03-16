import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMember } from "@/hooks/useMember";
import { usePermissions } from "@/hooks/useRoles";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  User, MapPin, Briefcase, Shield, Users, Calendar,
  BookOpen, Heart, Building2, Newspaper, ArrowRight, Bell, TrendingUp, Star, Plus
} from "lucide-react";
import communityGathering from "@/assets/community-gathering.jpg";
import diyaLamp from "@/assets/diya-lamp.png";

function getPanchangDates() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const dates = [
    { name: "Navratri", type: "Festival", month: 2, day: 30 },
    { name: "Ram Navami", type: "Festival", month: 3, day: 6 },
    { name: "Akshaya Tritiya", type: "Auspicious", month: 3, day: 10 },
    { name: "Vaishakhi Purnima", type: "Purnima", month: 4, day: 12 },
    { name: "Jyeshtha Purnima", type: "Purnima", month: 5, day: 11 },
    { name: "Ashadhi Ekadashi", type: "Ekadashi", month: 6, day: 17 },
    { name: "Guru Purnima", type: "Purnima", month: 6, day: 21 },
    { name: "Shravan Somvar", type: "Auspicious", month: 7, day: 5 },
    { name: "Janmashtami", type: "Festival", month: 7, day: 16 },
    { name: "Ganesh Chaturthi", type: "Festival", month: 8, day: 27 },
    { name: "Navratri", type: "Festival", month: 9, day: 2 },
    { name: "Dussehra", type: "Festival", month: 9, day: 12 },
    { name: "Diwali", type: "Festival", month: 9, day: 20 },
    { name: "Dev Diwali", type: "Auspicious", month: 10, day: 15 },
  ].map(d => ({
    ...d,
    date: new Date(y, d.month, d.day).toISOString(),
    past: new Date(y, d.month, d.day) < now,
  }));
  return dates.filter(d => {
    const dt = new Date(d.date);
    return dt.getMonth() >= m && dt.getMonth() <= m + 2;
  }).slice(0, 6);
}

const PANCHANG_DATES = getPanchangDates();

const VERIFICATION_LABELS: Record<number, { label: string; color: string; desc: string }> = {
  0: { label: "L0 — Unverified", color: "bg-muted text-muted-foreground", desc: "Get 2 vouches to level up" },
  1: { label: "L1 — Vouched", color: "bg-gold/20 text-gold-foreground", desc: "Submit ID docs for L2" },
  2: { label: "L2 — Verified", color: "bg-success/20 text-success", desc: "Fully verified member" },
  3: { label: "L3 — Trusted", color: "bg-primary/20 text-primary", desc: "Senior verified member" },
  4: { label: "L4 — Elder", color: "bg-secondary/20 text-secondary", desc: "Community elder" },
  5: { label: "L5 — Patron", color: "bg-gold/20 text-gold-foreground", desc: "Community patron" },
};

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { member, isLoading } = useMember();
  const navigate = useNavigate();
  const { canManageEvents } = usePermissions();

  const { data: announcements } = useQuery({
    queryKey: ["announcements", member?.chapter_id],
    queryFn: async () => {
      let q = supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(3);
      if (member?.chapter_id) {
        q = q.or(`chapter_id.eq.${member.chapter_id},chapter_id.is.null`);
      }
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!user && !!member,
  });

  const { data: upcomingEvents } = useQuery({
    queryKey: ["upcoming-events-dash", member?.chapter_id],
    queryFn: async () => {
      const q = supabase
        .from("events")
        .select("id, name, starts_at, venue, chapter_id")
        .eq("status", "published")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(3);
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: recentNews } = useQuery({
    queryKey: ["recent-news-dash"],
    queryFn: async () => {
      const { data } = await supabase
        .from("content_news")
        .select("id, title, published_at, summary")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
    enabled: !!user,
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <img src={diyaLamp} alt="" className="w-16 h-16 animate-pulse" />
          <p className="text-muted-foreground text-sm">Loading your community...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (member && !member.onboarding_completed) return <Navigate to="/onboarding" replace />;

  const verification = VERIFICATION_LABELS[member?.verification_level ?? 0] ?? VERIFICATION_LABELS[0];

  const quickLinks = [
    { icon: Users, label: "Directory", description: "Browse members", path: "/directory", gradient: "from-primary to-primary/70" },
    { icon: Calendar, label: "Events", description: "Upcoming events", path: "/events", gradient: "from-secondary to-secondary/70" },
    { icon: Briefcase, label: "Business & Jobs", description: "Opportunities", path: "/business", gradient: "from-jewel to-jewel/70" },
    { icon: Heart, label: "Matrimonial", description: "Matchmaking", path: "/matrimonial", gradient: "from-gold to-gold/70" },
    { icon: BookOpen, label: "Archives", description: "Heritage", path: "/archives", gradient: "from-primary to-secondary" },
    { icon: Building2, label: "Temple", description: "Donate & Aarti", path: "/temple", gradient: "from-secondary to-jewel" },
  ];

  return (
    <AppLayout title="Dashboard">
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Welcome banner with image */}
        <div className="relative rounded-2xl overflow-hidden min-h-[200px] animate-fade-in">
          <img src={communityGathering} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/40" />
          <div className="relative z-10 p-4 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <p className="text-primary-foreground/60 text-xs sm:text-sm">Welcome back</p>
              <h2 className="text-xl sm:text-3xl font-display font-bold text-primary-foreground mt-1">
                Namaste, {member?.first_name || "Member"} 🙏
              </h2>
              <p className="text-primary-foreground/70 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {(member?.chapters as { name: string } | null)?.name ?? "No chapter selected"}
              </p>
            </div>
            <div className="flex flex-col sm:items-end gap-1.5 sm:gap-2">
              <Badge role="status" aria-label={`Verification status: ${verification.label}`} className={`${verification.color} border-0 text-sm px-3 py-1`}>
                <Shield className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                {verification.label}
              </Badge>
              <p className="text-xs text-primary-foreground/50">{verification.desc}</p>
              {member?.global_id && (
                <span className="text-xs text-primary-foreground/40 font-mono">
                  ID: {member.global_id}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick links grid */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Card
                key={link.label}
                className="shadow-card hover:shadow-elevated transition-all cursor-pointer group hover:-translate-y-0.5"
                onClick={() => navigate(link.path)}
              >
                <CardContent className="p-5">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${link.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-display font-semibold text-sm">{link.label}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{link.description}</p>
                </CardContent>
              </Card>
            );
          })}
          {canManageEvents && (
            <Card
              className="shadow-card hover:shadow-elevated transition-all cursor-pointer group hover:-translate-y-0.5 border-dashed border-primary/40"
              onClick={() => navigate("/admin")}
            >
              <CardContent className="p-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg">
                  <Plus className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-sm">Create Event</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Manage your events</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Announcements */}
          <Card className="shadow-card lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!announcements?.length ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No announcements right now</p>
              ) : (
                <div className="space-y-3">
                  {announcements.map((a) => (
                    <div key={a.id} className="p-4 rounded-xl bg-muted/50 border border-border">
                      <h4 className="font-semibold text-sm">{a.title}</h4>
                      {a.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.body}</p>}
                      <p className="text-xs text-muted-foreground/60 mt-2">{new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile card */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                My Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full gradient-hero flex items-center justify-center text-primary-foreground font-bold text-lg">
                  {member?.first_name?.[0]}{member?.last_name?.[0]}
                </div>
                <div>
                  <p className="font-semibold">{member?.first_name} {member?.last_name}</p>
                  <p className="text-xs text-muted-foreground">{member?.gender}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/profile")}>
                View Profile <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming events */}
          <Card className="shadow-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Upcoming Events
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/events")} className="text-xs">View All</Button>
            </CardHeader>
            <CardContent>
              {!upcomingEvents?.length ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No upcoming events</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((e) => (
                    <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate("/events")}>
                      <div className="w-12 h-12 rounded-lg gradient-warm flex flex-col items-center justify-center text-primary-foreground shrink-0">
                        <span className="text-xs font-bold">{new Date(e.starts_at).toLocaleDateString("en", { month: "short" })}</span>
                        <span className="text-lg font-bold leading-none">{new Date(e.starts_at).getDate()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{e.name}</p>
                        {e.venue && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{e.venue}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent news */}
          <Card className="shadow-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-primary" />
                Latest News
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/news")} className="text-xs">View All</Button>
            </CardHeader>
            <CardContent>
              {!recentNews?.length ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No news yet</p>
              ) : (
                <div className="space-y-3">
                  {recentNews.map((n) => (
                    <div key={n.id} className="p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate("/news")}>
                      <p className="text-sm font-semibold">{n.title}</p>
                      {n.summary && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.summary}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Panchang Widget */}
        <Card className="shadow-card overflow-hidden">
          <div className="gradient-jewel p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary-foreground">
              <Star className="w-5 h-5" />
              <h3 className="font-display font-semibold">Panchang — Auspicious Dates</h3>
            </div>
            <span className="text-xs text-primary-foreground/70">{new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span>
          </div>
          <CardContent className="p-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              {PANCHANG_DATES.map((d) => (
                <div key={d.name} className="flex items-start gap-2 p-2 rounded-lg bg-muted/40">
                  <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 ${d.past ? "bg-muted text-muted-foreground" : "gradient-warm text-primary-foreground"}`}>
                    <span className="text-[10px] font-semibold leading-none">{new Date(d.date).toLocaleDateString("en", { month: "short" })}</span>
                    <span className="text-base font-bold leading-tight">{new Date(d.date).getDate()}</span>
                  </div>
                  <div>
                    <p className="font-medium leading-tight">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.type}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">Dates based on standard Hindu calendar. Verify with local priest for exact muhurta.</p>
          </CardContent>
        </Card>

        {/* Verification prompt */}
        {member?.verification_level === 0 && (
          <Card className="shadow-card border-gold/30 overflow-hidden">
            <div className="flex items-stretch">
              <div className="w-2 gradient-warm shrink-0" />
              <CardContent className="p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                  <Shield className="w-6 h-6 text-gold" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold">Get Verified — Unlock Full Access</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your account is at Level 0. Ask 2+ community members to vouch for you to reach Level 1.
                    For Level 2 (full verification), submit identity documents.
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/directory")}>
                    <TrendingUp className="w-3.5 h-3.5 mr-1" /> Find Members to Vouch
                  </Button>
                </div>
              </CardContent>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
