import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMember } from "@/hooks/useMember";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Flag, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Circle as XCircle, Eye, Ban, Trash2, User, Building2, Briefcase, Calendar, Newspaper, Heart, Mic, GraduationCap } from "lucide-react";

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

export default function ReportsTab() {
  const { member } = useMember();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [adminAction, setAdminAction] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const { data: reports, isLoading } = useQuery({
    queryKey: ["admin-reports", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("reports")
        .select(`
          id, entity_type, entity_id, category, reason, status, admin_action, admin_notes, reviewed_at, created_at,
          reporter:members!reports_reporter_member_id_fkey(id, first_name, last_name, photo_url),
          reviewer:members!reports_reviewed_by_fkey(id, first_name, last_name)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return (data ?? []) as Report[];
    },
  });

  const resolveReport = useMutation({
    mutationFn: async ({ reportId, action, notes, newStatus }: { reportId: string; action: string; notes: string; newStatus: string }) => {
      if (!member) throw new Error("Not authenticated");

      // Update the report
      const { error: reportError } = await supabase
        .from("reports")
        .update({
          status: newStatus,
          admin_action: action,
          admin_notes: notes || null,
          reviewed_by: member.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (reportError) throw reportError;

      // If action is suspend/block/delete, update the entity
      if (selectedReport && (action === "suspended" || action === "blocked" || action === "deleted")) {
        await applyEntityAction(selectedReport.entity_type, selectedReport.entity_id, action);
      }
    },
    onSuccess: () => {
      toast({ title: "Report resolved", description: "Action has been recorded." });
      setActionDialogOpen(false);
      setSelectedReport(null);
      setAdminAction("");
      setAdminNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const applyEntityAction = async (entityType: string, entityId: string, action: string) => {
    const now = new Date().toISOString();
    
    if (action === "deleted") {
      // For delete, we just mark as suspended (soft delete)
      action = "suspended";
    }

    // Apply suspension/block based on entity type
    if (entityType === "member") {
      if (action === "blocked") {
        await supabase.from("members").update({ blocked: true, blocked_at: now }).eq("id", entityId);
      } else {
        await supabase.from("members").update({ suspended: true, suspended_at: now }).eq("id", entityId);
      }
    } else if (entityType === "business") {
      await supabase.from("businesses").update({ suspended: true, suspended_at: now }).eq("id", entityId);
    } else if (entityType === "job") {
      await supabase.from("jobs").update({ suspended: true }).eq("id", entityId);
    } else if (entityType === "event") {
      await supabase.from("events").update({ suspended: true }).eq("id", entityId);
    } else if (entityType === "news") {
      await supabase.from("content_news").update({ suspended: true }).eq("id", entityId);
    } else if (entityType === "matrimonial_profile") {
      await supabase.from("matrimonial_profiles").update({ suspended: true }).eq("id", entityId);
    } else if (entityType === "oral_history") {
      await supabase.from("oral_histories").update({ status: "pending" }).eq("id", entityId);
    } else if (entityType === "mentorship") {
      await supabase.from("mentorships").update({ status: "suspended" }).eq("id", entityId);
    }
  };

  const getEntityLink = (type: string, id: string) => {
    const links: Record<string, string> = {
      member: `/member/${id}`,
      business: `/business?id=${id}`,
      job: `/business?job=${id}`,
      event: `/events?id=${id}`,
      news: `/news/${id}`,
      matrimonial_profile: `/matrimonial?id=${id}`,
      oral_history: `/archives`,
      mentorship: `/mentorship`,
    };
    return links[type] || "#";
  };

  const pendingCount = reports?.filter(r => r.status === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <Flag className="w-5 h-5 text-primary" />
            Content Reports
          </h2>
          <p className="text-sm text-muted-foreground">
            Review and take action on reported content
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-sm">
            {pendingCount} pending
          </Badge>
        )}
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Pending
          </TabsTrigger>
          <TabsTrigger value="reviewed" className="gap-1">
            <Eye className="w-3.5 h-3.5" /> Reviewed
          </TabsTrigger>
          <TabsTrigger value="resolved" className="gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Resolved
          </TabsTrigger>
          <TabsTrigger value="dismissed" className="gap-1">
            <XCircle className="w-3.5 h-3.5" /> Dismissed
          </TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading reports...</div>
          ) : !reports || reports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Flag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No {statusFilter === "all" ? "" : statusFilter} reports</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => {
                const EntityIcon = ENTITY_ICONS[report.entity_type] || Flag;
                return (
                  <Card key={report.id} className="shadow-card hover:shadow-elevated transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Entity icon */}
                        <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                          <EntityIcon className="w-5 h-5 text-destructive" />
                        </div>

                        {/* Report details */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={STATUS_COLORS[report.status]}>{report.status}</Badge>
                            <Badge variant="outline">{CATEGORY_LABELS[report.category] || report.category}</Badge>
                            <Badge variant="secondary" className="capitalize">{report.entity_type.replace("_", " ")}</Badge>
                          </div>

                          {report.reason && (
                            <p className="text-sm text-muted-foreground line-clamp-2">"{report.reason}"</p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span>Reported {format(new Date(report.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                            {report.reporter && (
                              <Link to={`/member/${report.reporter.id}`} className="flex items-center gap-1 hover:text-primary">
                                <Avatar className="w-4 h-4">
                                  <AvatarImage src={report.reporter.photo_url ?? undefined} />
                                  <AvatarFallback className="text-[8px]">
                                    {report.reporter.first_name?.[0]}{report.reporter.last_name?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                {report.reporter.first_name} {report.reporter.last_name}
                              </Link>
                            )}
                          </div>

                          {report.admin_action && report.admin_action !== "none" && (
                            <div className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1">
                              <span className="font-medium">Action taken:</span>
                              <Badge variant="outline" className="capitalize">{report.admin_action}</Badge>
                              {report.reviewer && (
                                <span>by {report.reviewer.first_name} {report.reviewer.last_name}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Link to={getEntityLink(report.entity_type, report.entity_id)}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-3.5 h-3.5 mr-1" /> View
                            </Button>
                          </Link>

                          {report.status === "pending" && (
                            <Dialog open={actionDialogOpen && selectedReport?.id === report.id} onOpenChange={(open) => {
                              setActionDialogOpen(open);
                              if (open) {
                                setSelectedReport(report);
                                setAdminAction("");
                                setAdminNotes("");
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  <Ban className="w-3.5 h-3.5 mr-1" /> Take Action
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Take Action on Report</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                                    <p><strong>Category:</strong> {CATEGORY_LABELS[report.category]}</p>
                                    <p><strong>Entity:</strong> {report.entity_type.replace("_", " ")}</p>
                                    {report.reason && <p className="mt-2 italic">"{report.reason}"</p>}
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Action to take</Label>
                                    <Select value={adminAction} onValueChange={setAdminAction}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select action..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ADMIN_ACTIONS.map((a) => (
                                          <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Admin notes</Label>
                                    <Textarea
                                      placeholder="Document your decision..."
                                      value={adminNotes}
                                      onChange={(e) => setAdminNotes(e.target.value)}
                                      rows={3}
                                    />
                                  </div>
                                </div>

                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => resolveReport.mutate({
                                      reportId: report.id,
                                      action: "none",
                                      notes: adminNotes,
                                      newStatus: "dismissed",
                                    })}
                                    disabled={resolveReport.isPending}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" /> Dismiss
                                  </Button>
                                  <Button
                                    onClick={() => resolveReport.mutate({
                                      reportId: report.id,
                                      action: adminAction || "none",
                                      notes: adminNotes,
                                      newStatus: "resolved",
                                    })}
                                    disabled={!adminAction || resolveReport.isPending}
                                    className="gradient-warm text-primary-foreground"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" /> Resolve
                                  </Button>
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
      </Tabs>
    </div>
  );
}
