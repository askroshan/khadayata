import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMember, useChapters } from "@/hooks/useMember";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Calendar, DollarSign, FileText, CircleCheck as CheckCircle, Clock, Send, Plus } from "lucide-react";
import { format } from "date-fns";
import { usePermissions } from "@/hooks/useRoles";

export default function Scholarships() {
  const { user, loading } = useAuth();
  const { member } = useMember();
  const { canManageScholarships } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [essay, setEssay] = useState("");
  const [selectedScholarship, setSelectedScholarship] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newScholarship, setNewScholarship] = useState({
    name: "", description: "", amount: "", currency: "INR", deadline: "", chapter_id: "", eligibility: "",
  });
  const { data: chapters } = useChapters();

  const { data: scholarships } = useQuery({
    queryKey: ["scholarships"],
    queryFn: async () => {
      const { data } = await supabase
        .from("scholarships")
        .select("id, name, description, amount, currency, deadline, chapter_id, eligibility, chapters(name)")
        .eq("status", "active")
        .order("deadline", { ascending: true });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: myApplications } = useQuery({
    queryKey: ["my-scholarship-applications"],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase
        .from("scholarship_applications")
        .select("*, scholarships(name, amount, currency, deadline)")
        .eq("member_id", member.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!member,
  });

  const applyScholarship = useMutation({
    mutationFn: async () => {
      if (!member || !selectedScholarship) throw new Error("Not ready");
      const { error } = await supabase.from("scholarship_applications").insert({
        scholarship_id: selectedScholarship,
        member_id: member.id,
        essay: essay.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Application submitted!" });
      setEssay("");
      setSelectedScholarship(null);
      queryClient.invalidateQueries({ queryKey: ["my-scholarship-applications"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createScholarship = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("scholarships").insert({
        name: newScholarship.name.trim(),
        description: newScholarship.description.trim() || null,
        amount: newScholarship.amount ? Number(newScholarship.amount) : null,
        currency: newScholarship.currency,
        deadline: newScholarship.deadline || null,
        chapter_id: newScholarship.chapter_id || null,
        eligibility: newScholarship.eligibility.trim() || null,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Scholarship created!" });
      setNewScholarship({ name: "", description: "", amount: "", currency: "INR", deadline: "", chapter_id: "", eligibility: "" });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["scholarships"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const appliedIds = myApplications?.map(a => a.scholarship_id) ?? [];

  return (
    <AppLayout title="Scholarships">
      <div className="space-y-6">
        {/* Hero */}
        <div className="gradient-jewel p-6 sm:p-8 text-primary-foreground">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-3xl font-display font-bold flex items-center gap-2">
                <GraduationCap className="w-6 h-6" /> Scholarship Programs
              </h1>
              <p className="text-primary-foreground/70 mt-1 max-w-md">
                Community-funded scholarships to support education and skill development for deserving members.
              </p>
            </div>
            {canManageScholarships && (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 border shrink-0">
                    <Plus className="w-4 h-4 mr-1" /> Create Scholarship
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create Scholarship Program</DialogTitle>
                    <DialogDescription>Set up a new scholarship with eligibility criteria, deadline, and award amount.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Name *</Label><Input value={newScholarship.name} onChange={e => setNewScholarship({...newScholarship, name: e.target.value})} maxLength={200} /></div>
                    <div><Label>Description</Label><Textarea value={newScholarship.description} onChange={e => setNewScholarship({...newScholarship, description: e.target.value})} rows={3} maxLength={2000} /></div>
                    <div><Label>Eligibility Criteria</Label><Textarea value={newScholarship.eligibility} onChange={e => setNewScholarship({...newScholarship, eligibility: e.target.value})} rows={2} maxLength={2000} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Amount</Label><Input type="number" value={newScholarship.amount} onChange={e => setNewScholarship({...newScholarship, amount: e.target.value})} /></div>
                      <div><Label>Currency</Label>
                        <Select value={newScholarship.currency} onValueChange={v => setNewScholarship({...newScholarship, currency: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{["INR", "USD", "GBP", "KES", "AED"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div><Label>Application Deadline</Label><Input type="date" value={newScholarship.deadline} onChange={e => setNewScholarship({...newScholarship, deadline: e.target.value})} /></div>
                    <div><Label>Chapter (optional)</Label>
                      <Select value={newScholarship.chapter_id} onValueChange={v => setNewScholarship({...newScholarship, chapter_id: v})}>
                        <SelectTrigger><SelectValue placeholder="All chapters (global)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All chapters (global)</SelectItem>
                          {chapters?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={() => createScholarship.mutate()} disabled={!newScholarship.name.trim() || createScholarship.isPending} className="w-full gradient-warm text-primary-foreground">Create Scholarship</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="px-3 sm:px-6 pb-6 space-y-6">
          <Tabs defaultValue="available">
            <TabsList>
              <TabsTrigger value="available">Available ({scholarships?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="my">My Applications ({myApplications?.length ?? 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="available" className="space-y-4 mt-4">
              {scholarships?.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="text-center py-16">
                    <GraduationCap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No active scholarships at the moment. Check back later!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {scholarships?.map((s) => {
                    const alreadyApplied = appliedIds.includes(s.id);
                    const deadlinePassed = s.deadline && new Date(s.deadline) < new Date();
                    
                    return (
                      <Card key={s.id} className="shadow-card hover:shadow-elevated transition-all overflow-hidden">
                        <div className="h-2 gradient-warm" />
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-display font-bold text-lg">{s.name}</h3>
                              {(s.chapters as { name: string } | null)?.name && (
                                <p className="text-xs text-muted-foreground">{(s.chapters as { name: string } | null)?.name}</p>
                              )}
                            </div>
                            {s.amount && (
                              <Badge className="gradient-warm text-primary-foreground">
                                <DollarSign className="w-3 h-3 mr-0.5" />
                                {s.currency} {Number(s.amount).toLocaleString()}
                              </Badge>
                            )}
                          </div>
                          {s.description && (
                            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{s.description}</p>
                          )}
                          {(s as { eligibility?: string }).eligibility && (
                            <p className="text-xs text-muted-foreground/70 mt-2 line-clamp-2 italic">{(s as { eligibility?: string }).eligibility}</p>
                          )}
                          <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
                            {s.deadline && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                Deadline: {format(new Date(s.deadline), "MMM d, yyyy")}
                              </span>
                            )}
                          </div>
                          <div className="mt-4">
                            {alreadyApplied ? (
                              <Badge variant="outline" className="w-full justify-center py-2">
                                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Applied
                              </Badge>
                            ) : deadlinePassed ? (
                              <Badge variant="secondary" className="w-full justify-center py-2">
                                <Clock className="w-3.5 h-3.5 mr-1" /> Deadline Passed
                              </Badge>
                            ) : (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    className="w-full gradient-hero text-primary-foreground"
                                    onClick={() => setSelectedScholarship(s.id)}
                                  >
                                    <Send className="w-4 h-4 mr-1" /> Apply Now
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle>Apply for {s.name}</DialogTitle>
                                    <DialogDescription>
                                      Submit your application with an optional essay explaining why you deserve this scholarship.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <Textarea
                                      placeholder="Write your essay (optional but recommended)..."
                                      value={essay}
                                      onChange={(e) => setEssay(e.target.value)}
                                      rows={6}
                                      maxLength={5000}
                                    />
                                    <p className="text-xs text-muted-foreground">{essay.length}/5000 characters</p>
                                    <Button
                                      onClick={() => applyScholarship.mutate()}
                                      disabled={applyScholarship.isPending}
                                      className="w-full gradient-warm text-primary-foreground"
                                    >
                                      Submit Application
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="my" className="space-y-4 mt-4">
              {(!myApplications || myApplications.length === 0) ? (
                <Card className="shadow-card">
                  <CardContent className="text-center py-16">
                    <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">You haven't applied for any scholarships yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {myApplications.map((app) => {
                    const scholarship = app.scholarships as { name: string; amount: number | null; currency: string; deadline: string | null } | null;
                    const STATUS_COLORS: Record<string, string> = {
                      submitted: "bg-gold/20 text-gold-foreground",
                      reviewing: "bg-primary/20 text-primary",
                      approved: "bg-success/20 text-success",
                      rejected: "bg-destructive/20 text-destructive",
                    };

                    return (
                      <Card key={app.id} className="shadow-card">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-display font-semibold">{scholarship?.name}</h3>
                              <p className="text-xs text-muted-foreground mt-1">
                                Applied {format(new Date(app.created_at), "MMM d, yyyy")}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge className={`${STATUS_COLORS[app.status] ?? ""} capitalize`}>
                                {app.status}
                              </Badge>
                              {scholarship?.amount && (
                                <p className="text-sm font-semibold mt-1">
                                  {scholarship.currency} {Number(scholarship.amount).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                          {app.essay && (
                            <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                              <p className="line-clamp-3">{app.essay}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
