import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRoles, usePermissions } from "@/hooks/useRoles";
import { useMember } from "@/hooks/useMember";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Flag, Shield, Users, Calendar, ChartBar as BarChart3, Download, Search, Eye, Ban, CircleCheck as CheckCircle, Circle as XCircle, TriangleAlert as AlertTriangle, User, Building2, Briefcase, Newspaper, Heart, Mic, GraduationCap, ChevronUp, ChevronDown, UserCheck, UserX, Handshake } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const CATEGORY_LABELS: Record<string, string> = {
  fake: "Fake / Fraudulent",
  non_khadayata: "Non-Khadayata",
  harassment: "Harassment",
  obscene: "Obscene Content",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  reviewed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  dismissed: "bg-muted text-muted-foreground",
};

const ENTITY_ICONS: Record<string, React.ElementType> = {
  member: User,
  business: Building2,
  job: Briefcase,
  event: Calendar,
  news: Newspaper,
  matrimonial_profile: Heart,
  oral_history: Mic,
  mentorship: GraduationCap,
};

const ADMIN_ACTIONS = [
  { value: "none", label: "No Action" },
  { value: "warned", label: "Warning Issued" },
  { value: "suspended", label: "Suspended" },
  { value: "blocked", label: "Blocked" },
  { value: "deleted", label: "Deleted" },
];

interface Report {
  id: string;
  entity_type: string;
  entity_id: string;
  category: string;
  reason: string | null;
  status: string;
  admin_action: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  reporter: { id: string; first_name: string; last_name: string; photo_url: string | null } | null;
  reviewer: { id: string; first_name: string; last_name: string } | null;
}

function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => JSON.stringify(row[h] ?? "")).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ModeratorDashboard() {
  const { user, loading } = useAuth();
  const { member } = useMember();
  const { isModerator, isAnyAdmin, myChapterId } = useRoles();
  const { canVerifyMembers, canManageEvents } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [reportFilter, setReportFilter] = useState("pending");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [adminAction, setAdminAction] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

  const canAccess = isModerator || isAnyAdmin;

  const { data: stats } = useQuery({
    queryKey: ["moderator-stats", myChapterId],
    queryFn: async () => {
      const [pending, members, events, mentorships] = await Promise.all([
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("members").select("id", { count: "exact", head: true }).eq("onboarding_completed", true),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "published").gte("starts_at", new Date().toISOString()),
        supabase.from("mentorships").select("id", { count: "exact", head: true }),
      ]);
      return {
        pendingReports: pending.count ?? 0,
        totalMembers: members.count ?? 0,
        upcomingEvents: events.count ?? 0,
        mentorships: mentorships.count ?? 0,
      };
    },
    enabled: !!user && canAccess,
  });

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ["mod-reports", reportFilter],
    queryFn: async () => {
      let query = supabase
        .from("reports")
        .select(`
          id, entity_type, entity_id, category, reason, status, admin_action, admin_notes, reviewed_at, created_at,
          reporter:members!reports_reporter_member_id_fkey(id, first_name, last_name, photo_url),
          reviewer:members!reports_reviewed_by_fkey(id, first_name, last_name)
        `)
        .order("created_at", { ascending: false });
      if (reportFilter !== "all") query = query.eq("status", reportFilter);
      const { data, error } = await query.limit(50);
      if (error) throw error;
      return (data ?? []) as Report[];
    },
    enabled: !!user && canAccess,
  });

  const { data: dirMembers, isLoading: membersLoading } = useQuery({
    queryKey: ["mod-members", myChapterId, memberSearch],
    queryFn: async () => {
      let q = supabase
        .from("members")
        .select("id, first_name, last_name, verification_level, chapter_id, chapters(name)")
        .eq("onboarding_completed", true)
        .order("last_name");
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      if (memberSearch.trim()) q = q.or(`first_name.ilike.%${memberSearch}%,last_name.ilike.%${memberSearch}%`);
      const { data } = await q.limit(30);
      return data ?? [];
    },
    enabled: !!user && canAccess,
  });

  const resolveReport = useMutation({
    mutationFn: async ({ reportId, action, notes, newStatus }: { reportId: string; action: string; notes: string; newStatus: string }) => {
      if (!member) throw new Error("Not authenticated");
      const { error } = await supabase.from("reports").update({
        status: newStatus,
        admin_action: action,
        admin_notes: notes || null,
        reviewed_by: member.id,
        reviewed_at: new Date().toISOString(),
      }).eq("id", reportId);
      if (error) throw error;
      if (selectedReport && (action === "suspended" || action === "blocked")) {
        const now = new Date().toISOString();
        if (selectedReport.entity_type === "member") {
          if (action === "blocked") {
            await supabase.from("members").update({ blocked: true, blocked_at: now }).eq("id", selectedReport.entity_id);
          } else {
            await supabase.from("members").update({ suspended: true, suspended_at: now }).eq("id", selectedReport.entity_id);
          }
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Report resolved", description: "Action recorded." });
      setActionDialogOpen(false);
      setSelectedReport(null);
      setAdminAction("");
      setAdminNotes("");
      queryClient.invalidateQueries({ queryKey: ["mod-reports"] });
      queryClient.invalidateQueries({ queryKey: ["moderator-stats"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateLevel = useMutation({
    mutationFn: async ({ memberId, level }: { memberId: string; level: number }) => {
      const { error } = await supabase.from("members").update({ verification_level: level }).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Verification level updated" });
      queryClient.invalidateQueries({ queryKey: ["mod-members"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleExportCSV = () => {
    if (!dirMembers?.length) { toast({ title: "No data to export" }); return; }
    const rows = dirMembers.map(m => ({
      first_name: m.first_name ?? "",
      last_name: m.last_name ?? "",
      chapter: (m.chapters as { name: string } | null)?.name ?? "",
      verification_level: m.verification_level ?? 0,
    }));
    downloadCSV(rows as Record<string, unknown>[], `members-${new Date().toISOString().slice(0, 10)}.csv`);
    toast({ title: "CSV downloaded" });
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!canAccess) return (
    <AppLayout title="Moderator Dashboard">
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h1 className="text-2xl font-display font-bold">Access Denied</h1>
        <p className="text-muted-foreground mt-2">Moderator role required.</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title="Moderator Dashboard">
      <div className="p-3 sm:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" /> Moderator Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Review reports, verify members, and maintain community standards</p>
          </div>
          {stats?.pendingReports > 0 && (
            <Badge variant="destructive" className="text-sm gap-1">
              <Flag className="w-3.5 h-3.5" /> {stats.pendingReports} pending reports
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { icon: Flag, label: "Pending Reports", value: stats?.pendingReports ?? 0, accent: "text-destructive", bg: "bg-destructive/10" },
            { icon: Users, label: "Total Members", value: stats?.totalMembers ?? 0, accent: "text-primary", bg: "bg-primary/10" },
            { icon: Calendar, label: "Upcoming Events", value: stats?.upcomingEvents ?? 0, accent: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
            { icon: Handshake, label: "Mentorships", value: stats?.mentorships ?? 0, accent: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          ].map(({ icon: Icon, label, value, accent, bg }) => (
            <Card key={label} className="shadow-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${accent}`} />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="reports">
          <TabsList className="flex w-max gap-1 h-auto">
            <TabsTrigger value="reports" className="gap-1.5 text-xs sm:text-sm">
              <Flag className="w-3.5 h-3.5" /> Reports
              {(stats?.pendingReports ?? 0) > 0 && (
                <Badge variant="destructive" className="h-4 text-[10px] px-1 ml-1">{stats?.pendingReports}</Badge>
              )}
            </TabsTrigger>
            {canVerifyMembers && (
              <TabsTrigger value="members" className="gap-1.5 text-xs sm:text-sm">
                <Users className="w-3.5 h-3.5" /> Members
              </TabsTrigger>
            )}
            <TabsTrigger value="analytics" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="w-3.5 h-3.5" /> Analytics
            </TabsTrigger>
          </TabsList>

          {/* REPORTS TAB */}
          <TabsContent value="reports" className="mt-4 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {["pending", "reviewed", "resolved", "dismissed", "all"].map(s => (
                <Button
                  key={s}
                  size="sm"
                  variant={reportFilter === s ? "default" : "outline"}
                  onClick={() => setReportFilter(s)}
                  className="capitalize h-8 text-xs"
                >
                  {s}
                </Button>
              ))}
            </div>

            {reportsLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
            ) : !reports?.length ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Flag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No {reportFilter === "all" ? "" : reportFilter} reports</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => {
                  const EntityIcon = ENTITY_ICONS[report.entity_type] ?? Flag;
                  return (
                    <Card key={report.id} className="shadow-card hover:shadow-elevated transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                            <EntityIcon className="w-5 h-5 text-destructive" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={STATUS_COLORS[report.status]}>{report.status}</Badge>
                              <Badge variant="outline">{CATEGORY_LABELS[report.category] ?? report.category}</Badge>
                              <Badge variant="secondary" className="capitalize">{report.entity_type.replace("_", " ")}</Badge>
                            </div>
                            {report.reason && (
                              <p className="text-sm text-muted-foreground line-clamp-2">"{report.reason}"</p>
                            )}
                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                              <span>{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</span>
                              {report.reporter && (
                                <Link to={`/member/${report.reporter.id}`} className="flex items-center gap-1 hover:text-primary">
                                  <Avatar className="w-4 h-4">
                                    <AvatarImage src={report.reporter.photo_url ?? undefined} />
                                    <AvatarFallback className="text-[8px]">{report.reporter.first_name?.[0]}{report.reporter.last_name?.[0]}</AvatarFallback>
                                  </Avatar>
                                  {report.reporter.first_name} {report.reporter.last_name}
                                </Link>
                              )}
                            </div>
                            {report.admin_action && report.admin_action !== "none" && (
                              <div className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1">
                                <span className="font-medium">Action:</span>
                                <Badge variant="outline" className="capitalize">{report.admin_action}</Badge>
                                {report.reviewer && <span>by {report.reviewer.first_name} {report.reviewer.last_name}</span>}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {report.status === "pending" && (
                              <Dialog open={actionDialogOpen && selectedReport?.id === report.id} onOpenChange={(open) => {
                                setActionDialogOpen(open);
                                if (open) { setSelectedReport(report); setAdminAction(""); setAdminNotes(""); }
                              }}>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <Ban className="w-3.5 h-3.5 mr-1" /> Act
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Take Action on Report</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 py-2">
                                    <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                                      <p><strong>Category:</strong> {CATEGORY_LABELS[report.category]}</p>
                                      <p><strong>Entity:</strong> {report.entity_type.replace("_", " ")}</p>
                                      {report.reason && <p className="italic text-muted-foreground">"{report.reason}"</p>}
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Action</Label>
                                      <Select value={adminAction} onValueChange={setAdminAction}>
                                        <SelectTrigger><SelectValue placeholder="Select action..." /></SelectTrigger>
                                        <SelectContent>{ADMIN_ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Notes</Label>
                                      <Textarea placeholder="Document your decision..." value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={3} />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button variant="outline" onClick={() => resolveReport.mutate({ reportId: report.id, action: "none", notes: adminNotes, newStatus: "dismissed" })} disabled={resolveReport.isPending}>
                                        <XCircle className="w-4 h-4 mr-1" /> Dismiss
                                      </Button>
                                      <Button onClick={() => resolveReport.mutate({ reportId: report.id, action: adminAction || "none", notes: adminNotes, newStatus: "resolved" })} disabled={!adminAction || resolveReport.isPending} className="gradient-warm text-primary-foreground">
                                        <CheckCircle className="w-4 h-4 mr-1" /> Resolve
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* MEMBERS TAB — US-002/005 */}
          {canVerifyMembers && (
            <TabsContent value="members" className="mt-4 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                  <label htmlFor="mod-member-search" className="sr-only">Search members</label>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="mod-member-search"
                    placeholder="Search by name..."
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    className="pl-9"
                    maxLength={100}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 h-9 shrink-0">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </Button>
              </div>

              {membersLoading ? (
                <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>
              ) : !dirMembers?.length ? (
                <Card><CardContent className="py-12 text-center"><Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No members found</p></CardContent></Card>
              ) : (
                <Card className="shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Member</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Chapter</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Level</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {dirMembers.map((m) => (
                          <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <Link to={`/member/${m.id}`} className="font-medium hover:text-primary transition-colors">
                                {m.first_name} {m.last_name}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                              {(m.chapters as { name: string } | null)?.name ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant="outline" className="text-xs">L{m.verification_level ?? 0}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                  disabled={(m.verification_level ?? 0) >= 5 || updateLevel.isPending}
                                  onClick={() => updateLevel.mutate({ memberId: m.id, level: (m.verification_level ?? 0) + 1 })}
                                  aria-label={`Upgrade ${m.first_name} ${m.last_name} verification level`}
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0 text-muted-foreground"
                                  disabled={(m.verification_level ?? 0) <= 0 || updateLevel.isPending}
                                  onClick={() => updateLevel.mutate({ memberId: m.id, level: (m.verification_level ?? 0) - 1 })}
                                  aria-label={`Downgrade ${m.first_name} ${m.last_name} verification level`}
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </Button>
                                <Link to={`/member/${m.id}`}>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label="View profile">
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </TabsContent>
          )}

          {/* ANALYTICS TAB — US-006 */}
          <TabsContent value="analytics" className="mt-4">
            <ModeratorAnalytics myChapterId={myChapterId} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function ModeratorAnalytics({ myChapterId }: { myChapterId: string | null }) {
  const { data: analytics } = useQuery({
    queryKey: ["mod-analytics", myChapterId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [newMembers, rsvpTotal, donations, reports] = await Promise.all([
        supabase.from("members").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
        supabase.from("event_rsvps").select("id", { count: "exact", head: true }).eq("status", "going"),
        supabase.from("donations").select("amount, currency").eq("status", "completed"),
        supabase.from("reports").select("status"),
      ]);

      const donationTotal = (donations.data ?? []).reduce((sum, d) => sum + (d.amount ?? 0), 0);
      const reportBreakdown = (reports.data ?? []).reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
      }, {});

      return {
        newMembersLast30Days: newMembers.count ?? 0,
        totalRsvps: rsvpTotal.count ?? 0,
        totalDonations: donationTotal,
        reportBreakdown,
      };
    },
  });

  const cards = [
    {
      label: "New Members (30 days)",
      value: analytics?.newMembersLast30Days ?? 0,
      icon: UserCheck,
      accent: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Total Event RSVPs",
      value: analytics?.totalRsvps ?? 0,
      icon: Calendar,
      accent: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Total Donations (INR)",
      value: analytics?.totalDonations ? `₹${(analytics.totalDonations / 100).toLocaleString("en-IN")}` : "₹0",
      icon: GraduationCap,
      accent: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "Reports Resolved",
      value: analytics?.reportBreakdown?.resolved ?? 0,
      icon: CheckCircle,
      accent: "text-green-600",
      bg: "bg-green-50 dark:bg-green-900/20",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(({ label, value, icon: Icon, accent, bg }) => (
          <Card key={label} className="shadow-card">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4.5 h-4.5 ${accent}`} />
              </div>
              <p className="text-2xl font-display font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {analytics?.reportBreakdown && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Flag className="w-4 h-4 text-primary" /> Report Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(analytics.reportBreakdown).map(([status, count]) => (
                <div key={status} className="text-center p-3 rounded-xl bg-muted/40">
                  <p className="text-xl font-bold font-display">{count}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-1">{status}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
