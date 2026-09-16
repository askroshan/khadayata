import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, TrendingUp, Calendar, Building2, DollarSign, Heart, BookOpen, GraduationCap, FileText, Globe, UserCheck, TriangleAlert as AlertTriangle, ArrowUpRight, ChartBar as BarChart2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface Props {
  myChapterId?: string | null;
}

type DrillKey =
  | "members-all" | "members-l2plus" | "members-l1" | "members-l0" | "members-30d" | "members-7d"
  | "events-all" | "events-upcoming" | "events-cancelled" | "rsvps"
  | "businesses-all" | "businesses-verified" | "jobs-all" | "jobs-active"
  | "matrimonial-all" | "matrimonial-active" | "matrimonial-pending"
  | "donations-all" | "reports-pending" | "reports-all"
  | "chapters-all" | "transfers-all" | "news-all" | "news-published" | "news-draft";

interface DrillRecord {
  id: string;
  label: string;
  sub?: string;
  link?: string;
}

function StatCard({
  icon: Icon, label, value, sub, color, trend, onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  trend?: number;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`border-0 shadow-sm transition-all ${onClick ? "cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-100" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3`} style={{ background: color + "18" }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-semibold ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
              <ArrowUpRight className="w-3 h-3" style={{ transform: trend < 0 ? "rotate(90deg)" : undefined }} />
              {Math.abs(trend)}%
            </div>
          )}
          {onClick && (
            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/50 mt-0.5" />
          )}
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function SectionHeading({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 mt-8 first:mt-0">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "18" }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      <div className="flex-1 h-px bg-border ml-2" />
    </div>
  );
}

function DrillDownDialog({ drillKey, myChapterId, onClose }: { drillKey: DrillKey | null; myChapterId?: string | null; onClose: () => void }) {
  const { data: records, isLoading } = useQuery({
    queryKey: ["drill-down", drillKey, myChapterId],
    queryFn: async (): Promise<DrillRecord[]> => {
      if (!drillKey) return [];

      if (drillKey.startsWith("members-")) {
        let q = supabase.from("members").select("id, first_name, last_name, verification_level, created_at, chapters(name)").limit(100);
        if (myChapterId) q = q.eq("chapter_id", myChapterId);
        const now = new Date();
        if (drillKey === "members-l2plus") q = q.gte("verification_level", 2);
        else if (drillKey === "members-l1") q = q.eq("verification_level", 1);
        else if (drillKey === "members-l0") q = q.eq("verification_level", 0);
        else if (drillKey === "members-30d") {
          const d = new Date(now); d.setDate(d.getDate() - 30);
          q = q.gte("created_at", d.toISOString());
        } else if (drillKey === "members-7d") {
          const d = new Date(now); d.setDate(d.getDate() - 7);
          q = q.gte("created_at", d.toISOString());
        }
        q = q.order("created_at", { ascending: false });
        const { data } = await q;
        return (data ?? []).map(m => ({
          id: m.id,
          label: `${m.first_name} ${m.last_name}`,
          sub: `L${m.verification_level} · ${(m.chapters as { name: string } | null)?.name ?? "No chapter"} · Joined ${m.created_at ? format(new Date(m.created_at), "dd MMM yyyy") : "—"}`,
          link: `/member/${m.id}`,
        }));
      }

      if (drillKey.startsWith("events-")) {
        let q = supabase.from("events").select("id, name, status, starts_at, chapter_id, chapters(name)").limit(100);
        if (myChapterId) q = q.eq("chapter_id", myChapterId);
        if (drillKey === "events-upcoming") q = q.in("status", ["published", "active"]);
        else if (drillKey === "events-cancelled") q = q.eq("status", "cancelled");
        q = q.order("starts_at", { ascending: false });
        const { data } = await q;
        return (data ?? []).map(e => ({
          id: e.id,
          label: e.name,
          sub: `${e.status} · ${(e.chapters as { name: string } | null)?.name ?? "—"} · ${e.starts_at ? format(new Date(e.starts_at), "dd MMM yyyy") : "—"}`,
        }));
      }

      if (drillKey === "rsvps") {
        const { data } = await supabase.from("event_rsvps").select("id, member_id, event_id, status, created_at, members(first_name, last_name), events(name)").limit(100).order("created_at", { ascending: false });
        return (data ?? []).map(r => ({
          id: r.id,
          label: `${(r.members as { first_name: string; last_name: string } | null)?.first_name ?? ""} ${(r.members as { first_name: string; last_name: string } | null)?.last_name ?? ""}`,
          sub: `${(r.events as { name: string } | null)?.name ?? "—"} · ${r.status}`,
        }));
      }

      if (drillKey.startsWith("businesses-")) {
        let q = supabase.from("businesses").select("id, name, verified, chapter_id, chapters(name)").limit(100);
        if (myChapterId) q = q.eq("chapter_id", myChapterId);
        if (drillKey === "businesses-verified") q = q.eq("verified", true);
        q = q.order("name");
        const { data } = await q;
        return (data ?? []).map(b => ({
          id: b.id,
          label: b.name,
          sub: `${b.verified ? "Verified" : "Unverified"} · ${(b.chapters as { name: string } | null)?.name ?? "—"}`,
          link: `/business?id=${b.id}`,
        }));
      }

      if (drillKey.startsWith("jobs-")) {
        let q = supabase.from("jobs").select("id, title, status, location, chapter_id, chapters(name)").limit(100);
        if (myChapterId) q = q.eq("chapter_id", myChapterId);
        if (drillKey === "jobs-active") q = q.eq("status", "open");
        q = q.order("title");
        const { data } = await q;
        return (data ?? []).map(j => ({
          id: j.id,
          label: j.title,
          sub: `${j.location ?? "—"} · ${j.status} · ${(j.chapters as { name: string } | null)?.name ?? "—"}`,
        }));
      }

      if (drillKey.startsWith("matrimonial-")) {
        let q = supabase.from("matrimonial_profiles").select("id, visibility, verified, suspended, created_at, members!matrimonial_profiles_member_id_fkey(first_name, last_name, chapter_id)").limit(100);
        if (drillKey === "matrimonial-active") q = q.eq("visibility", "public").eq("suspended", false);
        else if (drillKey === "matrimonial-pending") q = q.eq("verified", false);
        q = q.order("created_at", { ascending: false });
        const { data } = await q;
        return (data ?? []).filter(p => {
          if (!myChapterId) return true;
          const m = p.members as { chapter_id: string | null } | null;
          return m?.chapter_id === myChapterId;
        }).map(p => {
          const m = p.members as { first_name: string; last_name: string } | null;
          return {
            id: p.id,
            label: `${m?.first_name ?? ""} ${m?.last_name ?? ""}`,
            sub: `${p.verified ? "Verified" : "Unverified"} · ${format(new Date(p.created_at), "dd MMM yyyy")}`,
          };
        });
      }

      if (drillKey === "donations-all") {
        const { data } = await supabase.from("donations").select("id, amount, currency, status, created_at, members(first_name, last_name)").order("created_at", { ascending: false }).limit(100);
        return (data ?? []).map(d => ({
          id: d.id,
          label: `${(d.members as { first_name: string; last_name: string } | null)?.first_name ?? "Anonymous"} — ${d.currency} ${Number(d.amount).toLocaleString()}`,
          sub: `${d.status} · ${format(new Date(d.created_at), "dd MMM yyyy")}`,
        }));
      }

      if (drillKey.startsWith("reports-")) {
        let q = supabase.from("reports").select("id, reason, status, created_at, category").limit(100);
        if (drillKey === "reports-pending") q = q.eq("status", "pending");
        q = q.order("created_at", { ascending: false });
        const { data } = await q;
        return (data ?? []).map(r => ({
          id: r.id,
          label: r.reason ?? "No reason provided",
          sub: `${r.status} · ${format(new Date(r.created_at), "dd MMM yyyy")}`,
        }));
      }

      if (drillKey === "chapters-all") {
        const { data } = await supabase.from("chapters").select("id, slug, name, settings").order("name");
        return (data ?? []).map(c => ({
          id: c.id,
          label: c.name,
          sub: (c.settings as { is_active?: boolean } | null)?.is_active !== false ? "Active" : "Inactive",
          link: `/chapters/${c.slug}`,
        }));
      }

      if (drillKey === "transfers-all") {
        const { data } = await supabase
          .from("chapter_transfer_history")
          .select("id, transfer_type, effective_at, from_chapter_name, to_chapter_name, member:members!chapter_transfer_history_member_id_fkey(first_name, last_name)")
          .order("effective_at", { ascending: false })
          .limit(100);
        return (data ?? []).map(t => {
          const m = t.member as { first_name: string; last_name: string } | null;
          const from = (t.from_chapter_name as string | null) ?? "—";
          const to = (t.to_chapter_name as string | null) ?? "—";
          return {
            id: t.id,
            label: m ? `${m.first_name} ${m.last_name}` : "Unknown Member",
            sub: `${from} → ${to} · ${t.transfer_type.replace(/_/g, " ")} · ${t.effective_at ? format(new Date(t.effective_at), "dd MMM yyyy") : "—"}`,
          };
        });
      }

      if (drillKey.startsWith("news-")) {
        let q = supabase.from("content_news").select("id, title, status, published_at, chapter_id, chapters(name)").limit(100);
        if (myChapterId) q = q.eq("chapter_id", myChapterId);
        if (drillKey === "news-published") q = q.eq("status", "published");
        else if (drillKey === "news-draft") q = q.eq("status", "draft");
        q = q.order("published_at", { ascending: false });
        const { data } = await q;
        return (data ?? []).map(n => ({
          id: n.id,
          label: n.title,
          sub: `${n.status} · ${(n.chapters as { name: string } | null)?.name ?? "Global"} · ${n.published_at ? format(new Date(n.published_at), "dd MMM yyyy") : "—"}`,
          link: `/news/${n.id}`,
        }));
      }

      return [];
    },
    enabled: !!drillKey,
  });

  const title = drillKey ? drillKey.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "";

  return (
    <Dialog open={!!drillKey} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="capitalize">{title}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
        ) : !records?.length ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No records found.</p>
        ) : (
          <div className="space-y-1 mt-2">
            <p className="text-xs text-muted-foreground mb-3">{records.length} record{records.length !== 1 ? "s" : ""} (showing up to 100)</p>
            {records.map(r => (
              <div key={r.id} className="flex items-start justify-between py-2 border-b border-border last:border-0 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.label}</p>
                  {r.sub && <p className="text-xs text-muted-foreground mt-0.5">{r.sub}</p>}
                </div>
                {r.link && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0" asChild>
                    <Link to={r.link}>View</Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AnalyticsTab({ myChapterId }: Props) {
  const isGlobal = !myChapterId;
  const [drillKey, setDrillKey] = useState<DrillKey | null>(null);

  const drill = (key: DrillKey) => setDrillKey(key);

  const { data: memberStats } = useQuery({
    queryKey: ["analytics-members", myChapterId],
    queryFn: async () => {
      let q = supabase.from("members").select("id, verification_level, created_at, onboarding_completed, chapter_id");
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      const { data } = await q;
      if (!data) return null;
      const now = new Date();
      const last30 = new Date(now); last30.setDate(now.getDate() - 30);
      const last7  = new Date(now); last7.setDate(now.getDate() - 7);
      return {
        total: data.length,
        l0: data.filter(m => (m.verification_level ?? 0) === 0).length,
        l1: data.filter(m => (m.verification_level ?? 0) === 1).length,
        l2plus: data.filter(m => (m.verification_level ?? 0) >= 2).length,
        last30: data.filter(m => new Date(m.created_at) >= last30).length,
        last7: data.filter(m => new Date(m.created_at) >= last7).length,
        onboarded: data.filter(m => m.onboarding_completed).length,
      };
    },
    staleTime: 60000,
  });

  const { data: eventStats } = useQuery({
    queryKey: ["analytics-events", myChapterId],
    queryFn: async () => {
      let q = supabase.from("events").select("id, status, created_at, chapter_id");
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      const { data } = await q;
      if (!data) return null;
      const upcoming = data.filter(e => e.status === "published" || e.status === "active").length;
      return {
        total: data.length,
        upcoming,
        cancelled: data.filter(e => e.status === "cancelled").length,
      };
    },
    staleTime: 60000,
  });

  const { data: rsvpCount } = useQuery({
    queryKey: ["analytics-rsvps"],
    queryFn: async () => {
      const { count } = await supabase.from("event_rsvps").select("id", { count: "exact", head: true });
      return count ?? 0;
    },
    enabled: isGlobal,
    staleTime: 60000,
  });

  const { data: businessStats } = useQuery({
    queryKey: ["analytics-businesses", myChapterId],
    queryFn: async () => {
      let q = supabase.from("businesses").select("id, verified, chapter_id");
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      const { data } = await q;
      if (!data) return null;
      return {
        total: data.length,
        verified: data.filter(b => b.verified).length,
      };
    },
    staleTime: 60000,
  });

  const { data: jobStats } = useQuery({
    queryKey: ["analytics-jobs", myChapterId],
    queryFn: async () => {
      let q = supabase.from("jobs").select("id, status, chapter_id");
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      const { data } = await q;
      if (!data) return null;
      return {
        total: data.length,
        active: data.filter(j => j.status === "open").length,
      };
    },
    staleTime: 60000,
  });

  const { data: matrimonialStats } = useQuery({
    queryKey: ["analytics-matrimonial", myChapterId],
    queryFn: async () => {
      let q = supabase.from("matrimonial_profiles").select("id, verified, suspended, members!matrimonial_profiles_member_id_fkey(chapter_id)");
      const { data } = await q;
      if (!data) return null;
      const scoped = myChapterId
        ? data.filter(p => (p.members as { chapter_id: string | null } | null)?.chapter_id === myChapterId)
        : data;
      return {
        total: scoped.length,
        active: scoped.filter(p => !p.suspended).length,
        pending: scoped.filter(p => !p.verified && !p.suspended).length,
      };
    },
    staleTime: 60000,
  });

  const { data: scholarshipStats } = useQuery({
    queryKey: ["analytics-scholarships", myChapterId],
    queryFn: async () => {
      let q = supabase.from("scholarships").select("id, chapter_id");
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      const { data: schData } = await q;
      const { count: appCount } = await supabase
        .from("scholarship_applications")
        .select("id", { count: "exact", head: true });
      return {
        total: schData?.length ?? 0,
        applications: appCount ?? 0,
      };
    },
    staleTime: 60000,
  });

  const { data: donationStats } = useQuery({
    queryKey: ["analytics-donations"],
    queryFn: async () => {
      const { data } = await supabase.from("donations").select("amount, currency, created_at");
      if (!data) return null;
      const now = new Date();
      const last30 = new Date(now); last30.setDate(now.getDate() - 30);
      const recent = data.filter(d => new Date(d.created_at) >= last30);
      const totalInr = data.reduce((s, d) => s + (Number(d.amount) || 0), 0);
      const recentInr = recent.reduce((s, d) => s + (Number(d.amount) || 0), 0);
      return {
        count: data.length,
        recent: recent.length,
        totalFormatted: totalInr >= 100000
          ? "₹" + (totalInr / 100000).toFixed(1) + "L"
          : totalInr >= 1000
            ? "₹" + (totalInr / 1000).toFixed(1) + "K"
            : "₹" + totalInr,
        recentFormatted: recentInr >= 1000
          ? "₹" + (recentInr / 1000).toFixed(1) + "K"
          : "₹" + recentInr,
      };
    },
    enabled: isGlobal,
    staleTime: 60000,
  });

  const { data: newsStats } = useQuery({
    queryKey: ["analytics-news", myChapterId],
    queryFn: async () => {
      let q = supabase.from("content_news").select("id, status, chapter_id");
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      const { data } = await q;
      if (!data) return null;
      return {
        total: data.length,
        published: data.filter(n => n.status === "published").length,
        draft: data.filter(n => n.status === "draft").length,
      };
    },
    staleTime: 60000,
  });

  const { data: reportStats } = useQuery({
    queryKey: ["analytics-reports"],
    queryFn: async () => {
      const { data } = await supabase.from("reports").select("id, status, created_at");
      if (!data) return null;
      return {
        total: data.length,
        pending: data.filter(r => r.status === "pending").length,
        resolved: data.filter(r => r.status === "resolved" || r.status === "actioned").length,
      };
    },
    enabled: isGlobal,
    staleTime: 60000,
  });

  const { data: chapterStats } = useQuery({
    queryKey: ["analytics-chapters"],
    queryFn: async () => {
      const { data } = await supabase.from("chapters").select("id, settings");
      if (!data) return null;
      return {
        total: data.length,
        active: data.filter(c => (c.settings as { is_active?: boolean } | null)?.is_active !== false).length,
      };
    },
    enabled: isGlobal,
    staleTime: 60000,
  });

  const { data: transferStats } = useQuery({
    queryKey: ["analytics-transfers"],
    queryFn: async () => {
      const { data } = await supabase.from("chapter_transfer_history").select("id, transfer_type, effective_at");
      if (!data) return null;
      const now = new Date();
      const last90 = new Date(now); last90.setDate(now.getDate() - 90);
      return {
        total: data.length,
        recent: data.filter(t => new Date(t.effective_at) >= last90).length,
        adminMoves: data.filter(t => t.transfer_type === "admin_move").length,
        memberReqs: data.filter(t => t.transfer_type === "member_request").length,
      };
    },
    enabled: isGlobal,
    staleTime: 60000,
  });

  return (
    <div className="space-y-2 pb-8">
      <DrillDownDialog drillKey={drillKey} myChapterId={myChapterId} onClose={() => setDrillKey(null)} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Analytics &amp; Reporting</h1>
          <p className="text-sm text-muted-foreground">
            {isGlobal ? "Platform-wide utilisation metrics" : "Chapter-scoped utilisation metrics"}
          </p>
          {isGlobal && <p className="text-xs text-muted-foreground mt-1">Click any card to drill into the underlying records.</p>}
        </div>
        <Badge variant="outline" className="gap-1.5">
          <BarChart2 className="w-3 h-3" />
          Live Data
        </Badge>
      </div>

      {/* ── Membership ── */}
      <SectionHeading icon={Users} title="Membership" color="#3B82F6" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <StatCard icon={Users} label="Total Members" value={memberStats?.total ?? "—"} color="#3B82F6" onClick={() => drill("members-all")} />
        <StatCard icon={UserCheck} label="L2+ Verified" value={memberStats?.l2plus ?? "—"} sub="Highest trust" color="#15803D" onClick={() => drill("members-l2plus")} />
        <StatCard icon={UserCheck} label="L1 Vouched" value={memberStats?.l1 ?? "—"} color="#0891B2" onClick={() => drill("members-l1")} />
        <StatCard icon={Users} label="Unverified L0" value={memberStats?.l0 ?? "—"} color="#94A3B8" onClick={() => drill("members-l0")} />
        <StatCard icon={TrendingUp} label="New (30d)" value={memberStats?.last30 ?? "—"} color="#F59E0B" onClick={() => drill("members-30d")} />
        <StatCard icon={TrendingUp} label="New (7d)" value={memberStats?.last7 ?? "—"} color="#D97706" onClick={() => drill("members-7d")} />
      </div>

      {/* ── Events ── */}
      <SectionHeading icon={Calendar} title="Events" color="#7C3AED" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard icon={Calendar} label="Total Events" value={eventStats?.total ?? "—"} color="#7C3AED" onClick={() => drill("events-all")} />
        <StatCard icon={Calendar} label="Upcoming / Active" value={eventStats?.upcoming ?? "—"} color="#6D28D9" onClick={() => drill("events-upcoming")} />
        <StatCard icon={Calendar} label="Total RSVPs" value={isGlobal ? (rsvpCount ?? "—") : "—"} sub={isGlobal ? undefined : "Global only"} color="#8B5CF6" onClick={isGlobal ? () => drill("rsvps") : undefined} />
        <StatCard icon={AlertTriangle} label="Cancelled" value={eventStats?.cancelled ?? "—"} color="#EF4444" onClick={() => drill("events-cancelled")} />
      </div>

      {/* ── Business & Jobs ── */}
      <SectionHeading icon={Building2} title="Business &amp; Jobs" color="#059669" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard icon={Building2} label="Businesses Listed" value={businessStats?.total ?? "—"} color="#059669" onClick={() => drill("businesses-all")} />
        <StatCard icon={Building2} label="Verified Businesses" value={businessStats?.verified ?? "—"} color="#10B981" onClick={() => drill("businesses-verified")} />
        <StatCard icon={FileText} label="Job Listings" value={jobStats?.total ?? "—"} color="#0D9488" onClick={() => drill("jobs-all")} />
        <StatCard icon={FileText} label="Active Jobs" value={jobStats?.active ?? "—"} color="#14B8A6" onClick={() => drill("jobs-active")} />
      </div>

      {/* ── Matrimonial ── */}
      <SectionHeading icon={Heart} title="Matrimonial" color="#E91E63" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard icon={Heart} label="Total Profiles" value={matrimonialStats?.total ?? "—"} color="#E91E63" onClick={() => drill("matrimonial-all")} />
        <StatCard icon={Heart} label="Active Profiles" value={matrimonialStats?.active ?? "—"} color="#DB2777" onClick={() => drill("matrimonial-active")} />
        <StatCard icon={Heart} label="Pending Review" value={matrimonialStats?.pending ?? "—"} color="#F472B6" onClick={() => drill("matrimonial-pending")} />
      </div>

      {/* ── Finance ── */}
      {isGlobal && (
        <>
          <SectionHeading icon={DollarSign} title="Finance &amp; Donations" color="#F59E0B" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatCard icon={DollarSign} label="Total Donations" value={donationStats?.count ?? "—"} color="#F59E0B" onClick={() => drill("donations-all")} />
            <StatCard icon={DollarSign} label="Lifetime Value" value={donationStats?.totalFormatted ?? "—"} color="#D97706" onClick={() => drill("donations-all")} />
            <StatCard icon={TrendingUp} label="Last 30 Days" value={donationStats?.recentFormatted ?? "—"} color="#B45309" onClick={() => drill("donations-all")} />
            <StatCard icon={GraduationCap} label="Scholarship Apps" value={scholarshipStats?.applications ?? "—"} color="#92400E" />
          </div>
        </>
      )}

      {/* ── Content ── */}
      <SectionHeading icon={BookOpen} title="Content &amp; News" color="#0891B2" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard icon={BookOpen} label="Total Articles" value={newsStats?.total ?? "—"} color="#0891B2" onClick={() => drill("news-all")} />
        <StatCard icon={BookOpen} label="Published" value={newsStats?.published ?? "—"} color="#0E7490" onClick={() => drill("news-published")} />
        <StatCard icon={BookOpen} label="Drafts" value={newsStats?.draft ?? "—"} color="#94A3B8" onClick={() => drill("news-draft")} />
        <StatCard icon={GraduationCap} label="Scholarships" value={scholarshipStats?.total ?? "—"} color="#0369A1" />
      </div>

      {/* ── Governance (global only) ── */}
      {isGlobal && (
        <>
          <SectionHeading icon={Globe} title="Governance &amp; Moderation" color="#1E293B" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatCard icon={Globe} label="Chapters" value={chapterStats?.total ?? "—"} sub={chapterStats ? `${chapterStats.active} active` : undefined} color="#1E293B" onClick={() => drill("chapters-all")} />
            <StatCard icon={AlertTriangle} label="Reports Total" value={reportStats?.total ?? "—"} color="#DC2626" onClick={() => drill("reports-all")} />
            <StatCard icon={AlertTriangle} label="Reports Pending" value={reportStats?.pending ?? "—"} color="#EF4444" onClick={() => drill("reports-pending")} />
            <StatCard icon={AlertTriangle} label="Reports Resolved" value={reportStats?.resolved ?? "—"} color="#16A34A" onClick={() => drill("reports-all")} />
          </div>
        </>
      )}

      {/* ── Chapter Transfers ── */}
      {isGlobal && (
        <>
          <SectionHeading icon={TrendingUp} title="Chapter Transfers" color="#7C3AED" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatCard icon={TrendingUp} label="All Time Transfers" value={transferStats?.total ?? "—"} color="#7C3AED" onClick={() => drill("transfers-all")} />
            <StatCard icon={TrendingUp} label="Last 90 Days" value={transferStats?.recent ?? "—"} color="#6D28D9" onClick={() => drill("transfers-all")} />
            <StatCard icon={Users} label="Member Requests" value={transferStats?.memberReqs ?? "—"} color="#8B5CF6" onClick={() => drill("transfers-all")} />
            <StatCard icon={UserCheck} label="Admin Moves" value={transferStats?.adminMoves ?? "—"} color="#A78BFA" onClick={() => drill("transfers-all")} />
          </div>
        </>
      )}
    </div>
  );
}
