import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Shield, TrendingUp, Calendar, UserPlus, Clock, Building2, Activity } from "lucide-react";
import { subDays } from "date-fns";

interface AdminStatsProps {
  members: Array<{ verification_level: number; onboarding_completed: boolean; created_at?: string }> | undefined;
  isChapterScoped?: boolean;
  myChapterId?: string | null;
}

export default function AdminStats({ members, isChapterScoped, myChapterId }: AdminStatsProps) {
  const total = members?.length ?? 0;
  const l0 = members?.filter((m) => m.verification_level === 0).length ?? 0;
  const l1 = members?.filter((m) => m.verification_level === 1).length ?? 0;
  const l2plus = members?.filter((m) => m.verification_level >= 2).length ?? 0;
  const scopeLabel = isChapterScoped ? "Chapter" : "Global";
  const sevenDaysAgo = subDays(new Date(), 7).toISOString();
  const newMembers = members?.filter((m) => (m as { created_at?: string }).created_at && (m as { created_at?: string }).created_at! >= sevenDaysAgo).length ?? 0;

  const { data: activeEventsCount } = useQuery({
    queryKey: ["admin-active-events", myChapterId],
    queryFn: async () => {
      let q = supabase.from("events").select("id", { count: "exact", head: true }).gte("starts_at", new Date().toISOString()).eq("status", "published");
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      const { count } = await q;
      return count ?? 0;
    },
  });

  const { data: chaptersCount } = useQuery({
    queryKey: ["admin-chapters-count"],
    queryFn: async () => {
      const { count } = await supabase.from("chapters").select("id", { count: "exact", head: true });
      return count ?? 0;
    },
    enabled: !isChapterScoped,
  });

  const { data: pendingVerifications } = useQuery({
    queryKey: ["admin-pending-verifications", myChapterId],
    queryFn: async () => {
      let q = supabase.from("members").select("id", { count: "exact", head: true }).eq("verification_level", 0).eq("onboarding_completed", true);
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      const { count } = await q;
      return count ?? 0;
    },
  });

  const stats = [
    { label: `${scopeLabel} Members`, value: total, icon: Users, color: "gradient-warm" },
    { label: "L1 Verified", value: l1, icon: Shield, color: "gradient-jewel" },
    { label: "L2+ Verified", value: l2plus, icon: TrendingUp, color: "gradient-hero" },
    { label: "Pending Verification", value: pendingVerifications ?? 0, icon: Clock, color: "bg-amber-500" },
    { label: "New (Last 7 days)", value: newMembers, icon: UserPlus, color: "bg-success" },
    { label: "Unverified (L0)", value: l0, icon: Activity, color: "bg-muted-foreground" },
    { label: "Active Events", value: activeEventsCount ?? 0, icon: Calendar, color: "gradient-hero" },
    ...(!isChapterScoped ? [{ label: "Active Chapters", value: chaptersCount ?? 0, icon: Building2, color: "gradient-jewel" }] : []),
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="shadow-card">
          <CardContent className="p-5 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center shrink-0`}>
              <stat.icon className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
