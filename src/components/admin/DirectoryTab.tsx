import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Briefcase, Search, CircleCheck as CheckCircle, CircleX, Clock, MapPin, Phone, ExternalLink, Pencil, Trash2, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DirectoryTabProps {
  myChapterId: string | null;
}

export default function DirectoryTab({ myChapterId }: DirectoryTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bizSearch, setBizSearch] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const [editBiz, setEditBiz] = useState<{ id: string; name: string; description: string; phone: string; website: string; sector: string } | null>(null);
  const [editJob, setEditJob] = useState<{ id: string; title: string; description: string; location: string; employment_type: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "business" | "job"; id: string; name: string } | null>(null);
  const [createBizOpen, setCreateBizOpen] = useState(false);
  const [newBiz, setNewBiz] = useState({ name: "", sector: "", description: "", phone: "", website: "" });
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [newJob, setNewJob] = useState({ title: "", description: "", location: "", employment_type: "full_time" });

  const { data: businesses, isLoading: bizLoading } = useQuery({
    queryKey: ["admin-businesses", myChapterId, bizSearch],
    queryFn: async () => {
      let q = supabase
        .from("businesses")
        .select("*, owner:members!businesses_owner_member_id_fkey(id, first_name, last_name), chapters(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      if (bizSearch.trim()) q = q.or(`name.ilike.%${bizSearch}%,sector.ilike.%${bizSearch}%`);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["admin-jobs", myChapterId, jobSearch],
    queryFn: async () => {
      let q = supabase
        .from("jobs")
        .select("*, employer:members!jobs_employer_member_id_fkey(id, first_name, last_name), chapters(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      if (jobSearch.trim()) q = q.or(`title.ilike.%${jobSearch}%,location.ilike.%${jobSearch}%`);
      const { data } = await q;
      return data ?? [];
    },
  });

  const verifyBizMutation = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await supabase.from("businesses").update({ verified }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { verified }) => {
      toast({ title: verified ? "Business verified" : "Verification removed" });
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateBizMutation = useMutation({
    mutationFn: async (biz: { id: string; name: string; description: string; phone: string; website: string; sector: string }) => {
      const { error } = await supabase.from("businesses").update({
        name: biz.name.trim(),
        description: biz.description.trim() || null,
        phone: biz.phone.trim() || null,
        website: biz.website.trim() || null,
        sector: biz.sector.trim() || null,
      }).eq("id", biz.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Business updated" });
      setEditBiz(null);
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteBizMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("businesses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Business deleted" });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateJobMutation = useMutation({
    mutationFn: async (job: { id: string; title: string; description: string; location: string; employment_type: string }) => {
      const { error } = await supabase.from("jobs").update({
        title: job.title.trim(),
        description: job.description.trim() || null,
        location: job.location.trim() || null,
        employment_type: job.employment_type || null,
      }).eq("id", job.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Job updated" });
      setEditJob(null);
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Job deleted" });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createBizMutation = useMutation({
    mutationFn: async () => {
      if (!newBiz.name.trim()) throw new Error("Business name is required");
      const { error } = await supabase.from("businesses").insert({
        name: newBiz.name.trim(),
        sector: newBiz.sector.trim() || null,
        description: newBiz.description.trim() || null,
        phone: newBiz.phone.trim() || null,
        website: newBiz.website.trim() || null,
        chapter_id: myChapterId || null,
        verified: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Business listing created" });
      setNewBiz({ name: "", sector: "", description: "", phone: "", website: "" });
      setCreateBizOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createJobMutation = useMutation({
    mutationFn: async () => {
      if (!newJob.title.trim()) throw new Error("Job title is required");
      const { error } = await supabase.from("jobs").insert({
        title: newJob.title.trim(),
        description: newJob.description.trim() || null,
        location: newJob.location.trim() || null,
        employment_type: newJob.employment_type,
        chapter_id: myChapterId || null,
        status: "open",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Job listing created" });
      setNewJob({ title: "", description: "", location: "", employment_type: "full_time" });
      setCreateJobOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateJobStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("jobs").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Job status updated" });
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const pendingBiz = businesses?.filter((b) => !b.verified) ?? [];
  const verifiedBiz = businesses?.filter((b) => b.verified) ?? [];
  const openJobs = jobs?.filter((j) => j.status === "open") ?? [];
  const closedJobs = jobs?.filter((j) => j.status !== "open") ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingBiz.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Pending Verification</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{verifiedBiz.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Verified Businesses</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{openJobs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Open Jobs</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{(businesses?.length ?? 0) + (jobs?.length ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Listings</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="businesses">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList>
            <TabsTrigger value="businesses" className="gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Businesses
              {pendingBiz.length > 0 && (
                <Badge className="ml-1 h-4 px-1.5 text-[9px] bg-amber-500 text-white border-0">{pendingBiz.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              Jobs ({openJobs.length})
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setCreateBizOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Business
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setCreateJobOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Job
            </Button>
          </div>
        </div>

        {/* Businesses Tab */}
        <TabsContent value="businesses" className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search businesses..."
              value={bizSearch}
              onChange={(e) => setBizSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {pendingBiz.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Pending Verification ({pendingBiz.length})
              </p>
              <div className="space-y-2">
                {pendingBiz.map((b) => (
                  <Card key={b.id} className="shadow-card border-amber-200/60">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm">{b.name}</h4>
                            {b.sector && <Badge variant="secondary" className="text-xs">{b.sector}</Badge>}
                          </div>
                          {b.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.description}</p>}
                          <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                            {b.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{b.phone}</span>}
                            {b.website && <a href={b.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><ExternalLink className="w-3 h-3" />Website</a>}
                          </div>
                          {b.owner && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Owner:{" "}
                              <Link to={`/member/${(b.owner as { id: string }).id}`} className="text-primary hover:underline">
                                {(b.owner as { first_name: string; last_name: string }).first_name} {(b.owner as { first_name: string; last_name: string }).last_name}
                              </Link>
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Edit business"
                            onClick={() => setEditBiz({ id: b.id, name: b.name, description: b.description ?? "", phone: b.phone ?? "", website: b.website ?? "", sector: b.sector ?? "" })}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => verifyBizMutation.mutate({ id: b.id, verified: true })}
                            disabled={verifyBizMutation.isPending}
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Verify
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" aria-label="Delete business"
                            onClick={() => setDeleteTarget({ type: "business", id: b.id, name: b.name })}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {verifiedBiz.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> Verified ({verifiedBiz.length})
              </p>
              <div className="space-y-2">
                {verifiedBiz.map((b) => (
                  <Card key={b.id} className="shadow-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="font-medium text-sm truncate">{b.name}</span>
                          {b.sector && <Badge variant="outline" className="text-xs shrink-0">{b.sector}</Badge>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label="Edit business"
                            onClick={() => setEditBiz({ id: b.id, name: b.name, description: b.description ?? "", phone: b.phone ?? "", website: b.website ?? "", sector: b.sector ?? "" })}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                            onClick={() => verifyBizMutation.mutate({ id: b.id, verified: false })}
                            disabled={verifyBizMutation.isPending}
                          >
                            <CircleX className="w-3.5 h-3.5 mr-1" /> Revoke
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" aria-label="Delete business"
                            onClick={() => setDeleteTarget({ type: "business", id: b.id, name: b.name })}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {!bizLoading && (!businesses || businesses.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No business listings found</p>
            </div>
          )}
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {openJobs.map((j) => (
            <Card key={j.id} className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm">{j.title}</h4>
                      <Badge variant="outline" className="text-xs capitalize">
                        {(j.employment_type ?? "full_time").replace("_", " ")}
                      </Badge>
                      <Badge className="text-xs bg-emerald-100 text-emerald-700 border-0">Open</Badge>
                    </div>
                    {j.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{j.description}</p>}
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                      {j.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{j.location}</span>}
                    </div>
                    {j.employer && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Posted by:{" "}
                        <Link to={`/member/${(j.employer as { id: string }).id}`} className="text-primary hover:underline">
                          {(j.employer as { first_name: string; last_name: string }).first_name} {(j.employer as { first_name: string; last_name: string }).last_name}
                        </Link>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Edit job"
                      onClick={() => setEditJob({ id: j.id, title: j.title, description: j.description ?? "", location: j.location ?? "", employment_type: j.employment_type ?? "full_time" })}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm" variant="outline"
                      className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                      onClick={() => updateJobStatusMutation.mutate({ id: j.id, status: "closed" })}
                      disabled={updateJobStatusMutation.isPending}
                    >
                      <CircleX className="w-3.5 h-3.5 mr-1" /> Close
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" aria-label="Delete job"
                      onClick={() => setDeleteTarget({ type: "job", id: j.id, name: j.title })}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {closedJobs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Closed / Filled ({closedJobs.length})</p>
              <div className="space-y-2">
                {closedJobs.map((j) => (
                  <Card key={j.id} className="shadow-card opacity-60">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{j.title}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs capitalize">{j.status}</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => updateJobStatusMutation.mutate({ id: j.id, status: "open" })}
                            disabled={updateJobStatusMutation.isPending}
                          >
                            Reopen
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {!jobsLoading && (!jobs || jobs.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No job listings found</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Business Dialog */}
      <Dialog open={createBizOpen} onOpenChange={(open) => { if (!open) { setCreateBizOpen(false); setNewBiz({ name: "", sector: "", description: "", phone: "", website: "" }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Business Listing</DialogTitle>
            <DialogDescription>Create a new business listing for the directory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Business Name *</Label><Input value={newBiz.name} onChange={e => setNewBiz({ ...newBiz, name: e.target.value })} placeholder="e.g. Patel & Sons Trading Co." maxLength={200} /></div>
            <div><Label>Sector</Label><Input value={newBiz.sector} onChange={e => setNewBiz({ ...newBiz, sector: e.target.value })} placeholder="e.g. Technology, Retail, Healthcare" maxLength={100} /></div>
            <div><Label>Description</Label><Textarea value={newBiz.description} onChange={e => setNewBiz({ ...newBiz, description: e.target.value })} rows={3} maxLength={2000} /></div>
            <div><Label>Phone</Label><Input value={newBiz.phone} onChange={e => setNewBiz({ ...newBiz, phone: e.target.value })} placeholder="+1 555 000 0000" maxLength={30} /></div>
            <div><Label>Website</Label><Input value={newBiz.website} onChange={e => setNewBiz({ ...newBiz, website: e.target.value })} placeholder="https://..." maxLength={200} /></div>
            <Button onClick={() => createBizMutation.mutate()} disabled={!newBiz.name.trim() || createBizMutation.isPending} className="w-full gradient-warm text-primary-foreground">
              <Plus className="w-4 h-4 mr-1" /> Create Listing
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Job Dialog */}
      <Dialog open={createJobOpen} onOpenChange={(open) => { if (!open) { setCreateJobOpen(false); setNewJob({ title: "", description: "", location: "", employment_type: "full_time" }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Job Listing</DialogTitle>
            <DialogDescription>Create a new job posting for the community.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Job Title *</Label><Input value={newJob.title} onChange={e => setNewJob({ ...newJob, title: e.target.value })} placeholder="e.g. Software Engineer" maxLength={200} /></div>
            <div>
              <Label>Employment Type</Label>
              <Select value={newJob.employment_type} onValueChange={v => setNewJob({ ...newJob, employment_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["full_time", "part_time", "contract", "internship", "volunteer"].map(t => (
                    <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Location</Label><Input value={newJob.location} onChange={e => setNewJob({ ...newJob, location: e.target.value })} placeholder="City, Country or Remote" maxLength={200} /></div>
            <div><Label>Description</Label><Textarea value={newJob.description} onChange={e => setNewJob({ ...newJob, description: e.target.value })} rows={4} maxLength={3000} /></div>
            <Button onClick={() => createJobMutation.mutate()} disabled={!newJob.title.trim() || createJobMutation.isPending} className="w-full gradient-warm text-primary-foreground">
              <Plus className="w-4 h-4 mr-1" /> Post Job
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Business Dialog */}
      <Dialog open={!!editBiz} onOpenChange={(open) => { if (!open) setEditBiz(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Business</DialogTitle>
            <DialogDescription>Update business details.</DialogDescription>
          </DialogHeader>
          {editBiz && (
            <div className="space-y-3">
              <div><Label>Business Name *</Label><Input value={editBiz.name} onChange={e => setEditBiz({ ...editBiz, name: e.target.value })} maxLength={200} /></div>
              <div><Label>Sector</Label><Input value={editBiz.sector} onChange={e => setEditBiz({ ...editBiz, sector: e.target.value })} placeholder="e.g. Technology, Retail" maxLength={100} /></div>
              <div><Label>Description</Label><Textarea value={editBiz.description} onChange={e => setEditBiz({ ...editBiz, description: e.target.value })} rows={3} maxLength={2000} /></div>
              <div><Label>Phone</Label><Input value={editBiz.phone} onChange={e => setEditBiz({ ...editBiz, phone: e.target.value })} placeholder="+1 555 000 0000" maxLength={30} /></div>
              <div><Label>Website</Label><Input value={editBiz.website} onChange={e => setEditBiz({ ...editBiz, website: e.target.value })} placeholder="https://..." maxLength={200} /></div>
              <Button onClick={() => updateBizMutation.mutate(editBiz)} disabled={!editBiz.name.trim() || updateBizMutation.isPending} className="w-full gradient-warm text-primary-foreground">
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Job Dialog */}
      <Dialog open={!!editJob} onOpenChange={(open) => { if (!open) setEditJob(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
            <DialogDescription>Update job listing details.</DialogDescription>
          </DialogHeader>
          {editJob && (
            <div className="space-y-3">
              <div><Label>Job Title *</Label><Input value={editJob.title} onChange={e => setEditJob({ ...editJob, title: e.target.value })} maxLength={200} /></div>
              <div>
                <Label>Employment Type</Label>
                <select className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm" value={editJob.employment_type} onChange={e => setEditJob({ ...editJob, employment_type: e.target.value })}>
                  {["full_time", "part_time", "contract", "internship", "volunteer"].map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                </select>
              </div>
              <div><Label>Location</Label><Input value={editJob.location} onChange={e => setEditJob({ ...editJob, location: e.target.value })} placeholder="City, Country or Remote" maxLength={200} /></div>
              <div><Label>Description</Label><Textarea value={editJob.description} onChange={e => setEditJob({ ...editJob, description: e.target.value })} rows={4} maxLength={3000} /></div>
              <Button onClick={() => updateJobMutation.mutate(editJob)} disabled={!editJob.title.trim() || updateJobMutation.isPending} className="w-full gradient-warm text-primary-foreground">
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "business" ? "Business" : "Job"}</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteTarget.type === "business") deleteBizMutation.mutate(deleteTarget.id);
                else deleteJobMutation.mutate(deleteTarget.id);
              }}
              disabled={deleteBizMutation.isPending || deleteJobMutation.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
