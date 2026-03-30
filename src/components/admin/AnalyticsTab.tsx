import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Calendar, Building2, DollarSign, Heart, BookOpen, GraduationCap, FileText, Globe, UserCheck, TriangleAlert as AlertTriangle, ArrowUpRight, ChartBar as BarChart2 } from "lucide-react";

interface Props {
  myChapterId?: string | null;
}

function StatCard({
  icon: Icon, label, value, sub, color, trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  trend?: number;
}) {
  return (
    <Card className="border-0 shadow-sm">
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

export default function AnalyticsTab({ myChapterId }: Props) {
  const isGlobal = !myChapterId;

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
      const now = new Date();
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
      let q = supabase.from("businesses").select("id, is_verified, chapter_id");
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      const { data } = await q;
      if (!data) return null;
      return {
        total: data.length,
        verified: data.filter(b => b.is_verified).length,
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
      let q = supabase.from("matrimonial_profiles").select("id, status, chapter_id");
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      const { data } = await q;
      if (!data) return null;
      return {
        total: data.length,
        active: data.filter(p => p.status === "approved").length,
        pending: data.filter(p => p.status === "pending").length,
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
      const { data } = await supabase.from("chapters").select("id, is_active");
      if (!data) return null;
      return {
        total: data.length,
        active: data.filter(c => c.is_active !== false).length,
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Analytics &amp; Reporting</h1>
          <p className="text-sm text-muted-foreground">
            {isGlobal ? "Platform-wide utilisation metrics" : "Chapter-scoped utilisation metrics"}
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <BarChart2 className="w-3 h-3" />
          Live Data
        </Badge>
      </div>

      {/* ── Membership ── */}
      <SectionHeading icon={Users} title="Membership" color="#3B82F6" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <StatCard icon={Users} label="Total Members" value={memberStats?.total ?? "—"} color="#3B82F6" />
        <StatCard icon={UserCheck} label="L2+ Verified" value={memberStats?.l2plus ?? "—"} sub="Highest trust" color="#15803D" />
        <StatCard icon={UserCheck} label="L1 Vouched" value={memberStats?.l1 ?? "—"} color="#0891B2" />
        <StatCard icon={Users} label="Unverified L0" value={memberStats?.l0 ?? "—"} color="#94A3B8" />
        <StatCard icon={TrendingUp} label="New (30d)" value={memberStats?.last30 ?? "—"} color="#F59E0B" />
        <StatCard icon={TrendingUp} label="New (7d)" value={memberStats?.last7 ?? "—"} color="#D97706" />
      </div>

      {/* ── Events ── */}
      <SectionHeading icon={Calendar} title="Events" color="#7C3AED" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard icon={Calendar} label="Total Events" value={eventStats?.total ?? "—"} color="#7C3AED" />
        <StatCard icon={Calendar} label="Upcoming / Active" value={eventStats?.upcoming ?? "—"} color="#6D28D9" />
        <StatCard icon={Calendar} label="Total RSVPs" value={isGlobal ? (rsvpCount ?? "—") : "—"} sub={isGlobal ? undefined : "Global only"} color="#8B5CF6" />
        <StatCard icon={AlertTriangle} label="Cancelled" value={eventStats?.cancelled ?? "—"} color="#EF4444" />
      </div>

      {/* ── Business & Jobs ── */}
      <SectionHeading icon={Building2} title="Business &amp; Jobs" color="#059669" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard icon={Building2} label="Businesses Listed" value={businessStats?.total ?? "—"} color="#059669" />
        <StatCard icon={Building2} label="Verified Businesses" value={businessStats?.verified ?? "—"} color="#10B981" />
        <StatCard icon={FileText} label="Job Listings" value={jobStats?.total ?? "—"} color="#0D9488" />
        <StatCard icon={FileText} label="Active Jobs" value={jobStats?.active ?? "—"} color="#14B8A6" />
      </div>

      {/* ── Matrimonial ── */}
      <SectionHeading icon={Heart} title="Matrimonial" color="#E91E63" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard icon={Heart} label="Total Profiles" value={matrimonialStats?.total ?? "—"} color="#E91E63" />
        <StatCard icon={Heart} label="Active Profiles" value={matrimonialStats?.active ?? "—"} color="#DB2777" />
        <StatCard icon={Heart} label="Pending Review" value={matrimonialStats?.pending ?? "—"} color="#F472B6" />
      </div>

      {/* ── Finance ── */}
      {isGlobal && (
        <>
          <SectionHeading icon={DollarSign} title="Finance &amp; Donations" color="#F59E0B" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatCard icon={DollarSign} label="Total Donations" value={donationStats?.count ?? "—"} color="#F59E0B" />
            <StatCard icon={DollarSign} label="Lifetime Value" value={donationStats?.totalFormatted ?? "—"} color="#D97706" />
            <StatCard icon={TrendingUp} label="Last 30 Days" value={donationStats?.recentFormatted ?? "—"} color="#B45309" />
            <StatCard icon={GraduationCap} label="Scholarship Apps" value={scholarshipStats?.applications ?? "—"} color="#92400E" />
          </div>
        </>
      )}

      {/* ── Content ── */}
      <SectionHeading icon={BookOpen} title="Content &amp; News" color="#0891B2" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard icon={BookOpen} label="Total Articles" value={newsStats?.total ?? "—"} color="#0891B2" />
        <StatCard icon={BookOpen} label="Published" value={newsStats?.published ?? "—"} color="#0E7490" />
        <StatCard icon={BookOpen} label="Drafts" value={newsStats?.draft ?? "—"} color="#94A3B8" />
        <StatCard icon={GraduationCap} label="Scholarships" value={scholarshipStats?.total ?? "—"} color="#0369A1" />
      </div>

      {/* ── Governance (global only) ── */}
      {isGlobal && (
        <>
          <SectionHeading icon={Globe} title="Governance &amp; Moderation" color="#1E293B" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatCard icon={Globe} label="Chapters" value={chapterStats?.total ?? "—"} sub={chapterStats ? `${chapterStats.active} active` : undefined} color="#1E293B" />
            <StatCard icon={AlertTriangle} label="Reports Total" value={reportStats?.total ?? "—"} color="#DC2626" />
            <StatCard icon={AlertTriangle} label="Reports Pending" value={reportStats?.pending ?? "—"} color="#EF4444" />
            <StatCard icon={AlertTriangle} label="Reports Resolved" value={reportStats?.resolved ?? "—"} color="#16A34A" />
          </div>
        </>
      )}

      {/* ── Chapter Transfers ── */}
      {isGlobal && (
        <>
          <SectionHeading icon={TrendingUp} title="Chapter Transfers" color="#7C3AED" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatCard icon={TrendingUp} label="All Time Transfers" value={transferStats?.total ?? "—"} color="#7C3AED" />
            <StatCard icon={TrendingUp} label="Last 90 Days" value={transferStats?.recent ?? "—"} color="#6D28D9" />
            <StatCard icon={Users} label="Member Requests" value={transferStats?.memberReqs ?? "—"} color="#8B5CF6" />
            <StatCard icon={UserCheck} label="Admin Moves" value={transferStats?.adminMoves ?? "—"} color="#A78BFA" />
          </div>
        </>
      )}
    </div>
  );
}
