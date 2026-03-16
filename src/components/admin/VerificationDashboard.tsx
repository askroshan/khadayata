import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserCheck, Tag, Heart, Mic, ArrowRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";

interface VerificationDashboardProps {
  myChapterId: string | null;
}

export default function VerificationDashboard({ myChapterId }: VerificationDashboardProps) {
  const { user } = useAuth();

  const { data: pendingMembers } = useQuery({
    queryKey: ["vd-pending-members", myChapterId],
    queryFn: async () => {
      let q = supabase
        .from("members")
        .select("id, first_name, last_name, verification_level, chapter_id")
        .eq("onboarding_completed", false)
        .order("created_at", { ascending: false })
        .limit(10);
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: pendingVerifications } = useQuery({
    queryKey: ["vd-verification-requests", myChapterId],
    queryFn: async () => {
      const { data } = await supabase
        .from("verification_requests")
        .select("id, member_id, requested_level, status, created_at, notes, members(first_name, last_name, chapter_id)")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);
      return (data ?? []).filter((r) => {
        if (!myChapterId) return true;
        const m = r.members as { chapter_id: string | null } | null;
        return m?.chapter_id === myChapterId;
      });
    },
    enabled: !!user,
  });

  const { data: pendingTagRequests } = useQuery({
    queryKey: ["vd-tag-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tag_requests")
        .select("id, term, type, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: pendingMatrimonial } = useQuery({
    queryKey: ["vd-matrimonial", myChapterId],
    queryFn: async () => {
      let q = supabase
        .from("matrimonial_profiles")
        .select("id, created_at, members!matrimonial_profiles_member_id_fkey(first_name, last_name, chapter_id)")
        .eq("verified", false)
        .eq("suspended", false)
        .order("created_at", { ascending: false })
        .limit(10);
      const { data } = await q;
      return (data ?? []).filter((p) => {
        if (!myChapterId) return true;
        const m = p.members as { chapter_id: string | null } | null;
        return m?.chapter_id === myChapterId;
      });
    },
    enabled: !!user,
  });

  const { data: pendingOralHistories } = useQuery({
    queryKey: ["vd-oral-histories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("oral_histories")
        .select("id, title, created_at, narrator_name")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!user,
  });

  const totalPending =
    (pendingMembers?.length ?? 0) +
    (pendingVerifications?.length ?? 0) +
    (pendingTagRequests?.length ?? 0) +
    (pendingMatrimonial?.length ?? 0) +
    (pendingOralHistories?.length ?? 0);

  return (
    <div className="space-y-4">
      {totalPending === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center">
            <UserCheck className="w-12 h-12 text-success/50 mx-auto mb-3" />
            <p className="font-display font-semibold text-lg">All caught up!</p>
            <p className="text-muted-foreground text-sm mt-1">No pending items require your attention.</p>
          </CardContent>
        </Card>
      ) : null}

      {(pendingMembers?.length ?? 0) > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-600" />
              Pending Member Onboarding
              <Badge className="bg-amber-100 text-amber-800 border-0 ml-auto">{pendingMembers!.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            {pendingMembers!.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div>
                  <span className="text-sm font-medium">{m.first_name} {m.last_name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">L{m.verification_level}</span>
                </div>
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" asChild>
                  <Link to={`/member/${m.id}?verify=1`}>Review <ArrowRight className="w-3 h-3" /></Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {(pendingVerifications?.length ?? 0) > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Verification Requests
              <Badge className="bg-blue-100 text-blue-800 border-0 ml-auto">{pendingVerifications!.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            {pendingVerifications!.map((r) => {
              const m = r.members as { first_name: string; last_name: string } | null;
              return (
                <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div>
                    <span className="text-sm font-medium">{m?.first_name} {m?.last_name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">→ L{r.requested_level}</span>
                    {r.notes && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{r.notes}</p>}
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" asChild>
                    <Link to={`/member/${r.member_id}?verify=1`}>Review <ArrowRight className="w-3 h-3" /></Link>
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {(pendingTagRequests?.length ?? 0) > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Unresolved Tag Requests
              <Badge className="bg-primary/15 text-primary border-0 ml-auto">{pendingTagRequests!.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            {pendingTagRequests!.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t.term}</span>
                  <Badge variant="outline" className="text-xs">{t.type}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
              </div>
            ))}
            <div className="pt-2">
              <Button size="sm" variant="outline" className="w-full text-xs h-7" onClick={() => {
                const tagsTab = document.querySelector('[data-value="tags"]') as HTMLElement;
                tagsTab?.click();
              }}>
                Go to Tags tab to resolve
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(pendingMatrimonial?.length ?? 0) > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" />
              Matrimonial Profiles Awaiting Review
              <Badge className="bg-rose-100 text-rose-700 border-0 ml-auto">{pendingMatrimonial!.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            {pendingMatrimonial!.map((p) => {
              const m = p.members as { first_name: string; last_name: string } | null;
              return (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-sm font-medium">{m?.first_name} {m?.last_name}</span>
                  <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              );
            })}
            <div className="pt-2">
              <Button size="sm" variant="outline" className="w-full text-xs h-7" asChild>
                <Link to="/matrimonial">Go to Matrimonial</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(pendingOralHistories?.length ?? 0) > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Mic className="w-4 h-4 text-secondary" />
              Oral History Uploads Pending Review
              <Badge className="bg-secondary/20 text-secondary border-0 ml-auto">{pendingOralHistories!.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            {pendingOralHistories!.map((h) => (
              <div key={h.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div>
                  <span className="text-sm font-medium">{h.title}</span>
                  {h.narrator_name && <span className="ml-2 text-xs text-muted-foreground">by {h.narrator_name}</span>}
                </div>
                <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</span>
              </div>
            ))}
            <div className="pt-2">
              <Button size="sm" variant="outline" className="w-full text-xs h-7" asChild>
                <Link to="/oral-history">Go to Oral History</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
