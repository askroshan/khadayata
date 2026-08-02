import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMember } from "@/hooks/useMember";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Users, Plus, MessageSquare, CircleCheck as CheckCircle, Clock, Handshake, Search, Sparkles, Star } from "lucide-react";
import { ReportDialog } from "@/components/ReportDialog";

export default function Mentorship() {
  const { user, loading } = useAuth();
  const { member } = useMember();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [skills, setSkills] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [selectedMentorship, setSelectedMentorship] = useState<string | null>(null);
  const [skillSearch, setSkillSearch] = useState("");
  const [skillError, setSkillError] = useState("");

  const { data: mentorships } = useQuery({
    queryKey: ["mentorships"],
    queryFn: async () => {
      const { data } = await supabase
        .from("mentorships")
        .select("*, mentor:members!mentorships_mentor_member_id_fkey(id, first_name, last_name, photo_url, verification_level, chapters(name)), mentee:members!mentorships_mentee_member_id_fkey(first_name, last_name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: myMentorships } = useQuery({
    queryKey: ["my-mentorships"],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase
        .from("mentorships")
        .select("*, mentor:members!mentorships_mentor_member_id_fkey(first_name, last_name), mentee:members!mentorships_mentee_member_id_fkey(first_name, last_name), mentorship_sessions(*)")
        .or(`mentor_member_id.eq.${member.id},mentee_member_id.eq.${member.id}`)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!member,
  });

  // Aggregate all skills from available mentors for the marketplace
  const allSkills = Array.from(new Set(
    mentorships
      ?.filter(m => m.status === "available")
      .flatMap(m => (m.skills as string[]) ?? []) ?? []
  )).sort();

  const offerMentorship = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error("Not a member");
      const skillList = skills.split(",").map(s => s.trim()).filter(Boolean);
      if (skillList.length === 0) throw new Error("Add at least one skill");

      const { data: existing } = await supabase
        .from("mentorships")
        .select("id, skills, status")
        .eq("mentor_member_id", member.id)
        .eq("status", "available")
        .maybeSingle();

      const existingMentorship = existing as { id: string; skills: string[]; status: string } | null;

      if (existingMentorship) {
        const existingSkills = (existingMentorship.skills as string[]) ?? [];
        const merged = [...existingSkills];
        for (const s of skillList) {
          if (!merged.some(e => e.toLowerCase() === s.toLowerCase())) {
            merged.push(s);
          }
        }
        const { error } = await supabase
          .from("mentorships")
          .update({ skills: merged })
          .eq("id", existingMentorship.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("mentorships").insert({
          mentor_member_id: member.id,
          skills: skillList,
          status: "available",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Mentorship offer created!" });
      setShowOfferForm(false);
      setOfferDialogOpen(false);
      setSkills("");
      queryClient.invalidateQueries({ queryKey: ["mentorships"] });
      queryClient.invalidateQueries({ queryKey: ["my-mentorships"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const requestMentorship = useMutation({
    mutationFn: async (mentorshipId: string) => {
      if (!member) throw new Error("Not a member");
      const { error } = await supabase.from("mentorships").update({
        mentee_member_id: member.id,
        status: "pending",
      }).eq("id", mentorshipId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Mentorship request sent! Check 'My Mentorships' for status." });
      queryClient.invalidateQueries({ queryKey: ["mentorships"] });
      queryClient.invalidateQueries({ queryKey: ["my-mentorships"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const logSession = useMutation({
    mutationFn: async () => {
      if (!selectedMentorship) throw new Error("No mentorship selected");
      const { error } = await supabase.from("mentorship_sessions").insert({
        mentorship_id: selectedMentorship,
        notes: sessionNotes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Session logged!" });
      setSessionNotes("");
      setSelectedMentorship(null);
      queryClient.invalidateQueries({ queryKey: ["my-mentorships"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const availableMentors = mentorships?.filter(m => m.status === "available" && m.mentor_member_id !== member?.id) ?? [];
  const filteredMentors = skillSearch
    ? availableMentors.filter(m => (m.skills as string[])?.some(s => s.toLowerCase().includes(skillSearch.toLowerCase())))
    : availableMentors;

  return (
    <>
    <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Offer Mentorship</DialogTitle>
          <DialogDescription>List the skills you can mentor others in (comma-separated).</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Input
              placeholder="e.g. React, Business Strategy, Gujarati"
              value={skills}
              onChange={(e) => { setSkills(e.target.value); if (e.target.value.trim()) setSkillError(""); }}
              maxLength={500}
              className={skillError ? "border-destructive" : ""}
            />
            {skillError && <p className="text-xs text-destructive">{skillError}</p>}
          </div>
          <Button
            onClick={() => { if (!skills.trim()) { setSkillError("Please enter at least one skill."); return; } offerMentorship.mutate(); }}
            disabled={offerMentorship.isPending}
            className="w-full gradient-warm text-primary-foreground"
          >
            Offer to Mentor
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    <AppLayout title="Mentorship">
      <div className="space-y-6">
        <div className="gradient-hero p-6 sm:p-8 text-primary-foreground">
          <h1 className="text-xl sm:text-3xl font-display font-bold flex items-center gap-2">
            <Handshake className="w-6 h-6" /> Skills & Mentorship Marketplace
          </h1>
          <p className="text-primary-foreground/70 mt-1 max-w-lg">
            Connect with experienced community members for guidance, share your expertise, or find skill-specific mentors.
          </p>
        </div>

        <div className="px-3 sm:px-6 pb-6 space-y-6">
          <Tabs defaultValue="marketplace">
            <TabsList>
              <TabsTrigger value="marketplace"><Sparkles className="w-3.5 h-3.5 mr-1" />Marketplace</TabsTrigger>
              <TabsTrigger value="browse"><Users className="w-3.5 h-3.5 mr-1" />All Mentors</TabsTrigger>
              <TabsTrigger value="my"><Star className="w-3.5 h-3.5 mr-1" />My Mentorships</TabsTrigger>
            </TabsList>

            {/* Skills Marketplace */}
            <TabsContent value="marketplace" className="space-y-4 mt-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-display">Skills Available</CardTitle>
                  <CardDescription>{allSkills.length} unique skills offered by community mentors</CardDescription>
                </CardHeader>
                <CardContent>
                  {allSkills.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No skills listed yet. Be the first to offer mentorship!</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {allSkills.map((skill) => {
                        const mentorCount = availableMentors.filter(m => (m.skills as string[])?.includes(skill)).length;
                        return (
                          <button
                            key={skill}
                            onClick={() => setSkillSearch(skill === skillSearch ? "" : skill)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                              skillSearch === skill
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "bg-muted hover:bg-muted/80 text-foreground"
                            }`}
                          >
                            {skill}
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{mentorCount}</Badge>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {skillSearch && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Mentors for "{skillSearch}" ({filteredMentors.length})
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {filteredMentors.map((m) => {
                      const mentor = m.mentor as { id: string; first_name: string; last_name: string; photo_url: string | null; verification_level: number; chapters: { name: string } | null } | null;
                      return (
                        <Card key={m.id} className="shadow-card hover:shadow-elevated transition-all">
                          <CardContent className="p-5">
                            <div className="flex items-start gap-3">
                              <Link to={`/member/${mentor?.id}`}>
                                <div className="w-12 h-12 rounded-full gradient-jewel flex items-center justify-center text-primary-foreground font-bold shrink-0 hover:scale-110 transition-transform">
                                  {mentor?.first_name?.[0]}{mentor?.last_name?.[0]}
                                </div>
                              </Link>
                              <div className="flex-1 min-w-0">
                                <Link to={`/member/${mentor?.id}`} className="font-display font-bold hover:text-primary transition-colors">
                                  {mentor?.first_name} {mentor?.last_name}
                                </Link>
                                <p className="text-xs text-muted-foreground">{mentor?.chapters?.name}</p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {(m.skills as string[])?.map((s) => (
                                    <Badge key={s} variant={s === skillSearch ? "default" : "secondary"} className="text-xs">{s}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                            <Button
                              size="sm"
                              className="flex-1 gradient-warm text-primary-foreground"
                              onClick={() => requestMentorship.mutate(m.id)}
                              disabled={requestMentorship.isPending}
                            >
                              <MessageSquare className="w-3.5 h-3.5 mr-1" /> Request Mentorship
                            </Button>
                            <ReportDialog
                              entityType="mentorship"
                              entityId={m.id}
                              entityName={`${mentor?.first_name ?? ""} ${mentor?.last_name ?? ""}`.trim()}
                              variant="icon"
                            />
                          </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CTA to offer */}
              <Card className="shadow-card border-dashed border-2 border-primary/20">
                <CardContent className="text-center py-8">
                  <Sparkles className="w-8 h-8 text-primary/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Have expertise to share?</p>
                  <Button onClick={() => setOfferDialogOpen(true)} className="gradient-hero text-primary-foreground">
                    <Plus className="w-4 h-4 mr-1" /> Offer Mentorship
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Browse all mentors */}
            <TabsContent value="browse" className="space-y-4 mt-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by skill..."
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    className="pl-9"
                    maxLength={100}
                  />
                </div>
                <Button onClick={() => setShowOfferForm(!showOfferForm)} className="gradient-hero text-primary-foreground shrink-0">
                  <Plus className="w-4 h-4 mr-1" /> Offer Mentorship
                </Button>
              </div>

              {showOfferForm && (
                <Card className="shadow-card animate-fade-in border-primary/20">
                  <CardContent className="p-5 space-y-3">
                    <div className="space-y-1">
                      <Input
                        placeholder="Skills you can mentor in (comma-separated)"
                        value={skills}
                        onChange={(e) => { setSkills(e.target.value); if (e.target.value.trim()) setSkillError(""); }}
                        maxLength={500}
                        className={skillError ? "border-destructive" : ""}
                      />
                      {skillError && <p className="text-xs text-destructive">{skillError}</p>}
                    </div>
                    <Button onClick={() => { if (!skills.trim()) { setSkillError("Please enter at least one skill."); return; } offerMentorship.mutate(); }} disabled={offerMentorship.isPending} className="gradient-warm text-primary-foreground">
                      Offer to Mentor
                    </Button>
                  </CardContent>
                </Card>
              )}

              <p className="text-sm text-muted-foreground">{filteredMentors.length} mentors available</p>

              {filteredMentors.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="text-center py-16">
                    <GraduationCap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      {skillSearch ? "No mentors found for this skill." : "No mentors available yet. Be the first!"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredMentors.map((m) => {
                    const mentor = m.mentor as { id: string; first_name: string; last_name: string; verification_level: number; chapters: { name: string } | null } | null;
                    return (
                      <Card key={m.id} className="shadow-card hover:shadow-elevated transition-all">
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3">
                            <Link to={`/member/${mentor?.id}`}>
                              <div className="w-12 h-12 rounded-full gradient-jewel flex items-center justify-center text-primary-foreground font-bold hover:scale-110 transition-transform">
                                {mentor?.first_name?.[0]}{mentor?.last_name?.[0]}
                              </div>
                            </Link>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Link to={`/member/${mentor?.id}`} className="font-display font-bold hover:text-primary transition-colors">
                                  {mentor?.first_name} {mentor?.last_name}
                                </Link>
                                {(mentor?.verification_level ?? 0) >= 1 && (
                                  <Badge variant="outline" className="text-[10px]">L{mentor?.verification_level}</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{mentor?.chapters?.name}</p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {(m.skills as string[])?.map((s) => (
                                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button
                              size="sm"
                              className="flex-1 gradient-warm text-primary-foreground"
                              onClick={() => requestMentorship.mutate(m.id)}
                              disabled={requestMentorship.isPending}
                            >
                              <MessageSquare className="w-3.5 h-3.5 mr-1" /> Request Mentorship
                            </Button>
                            <ReportDialog
                              entityType="mentorship"
                              entityId={m.id}
                              entityName={`${mentor?.first_name ?? ""} ${mentor?.last_name ?? ""}`.trim()}
                              variant="icon"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* My mentorships */}
            <TabsContent value="my" className="space-y-4 mt-4">
              {(!myMentorships || myMentorships.length === 0) ? (
                <Card className="shadow-card">
                  <CardContent className="text-center py-16">
                    <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No mentorships yet. Find a mentor or offer to mentor others!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {myMentorships.map((m) => {
                    const isMentor = m.mentor_member_id === member?.id;
                    const other = isMentor
                      ? (m.mentee as { first_name: string; last_name: string } | null)
                      : (m.mentor as { first_name: string; last_name: string } | null);
                    const sessions = (m.mentorship_sessions as { id: string; session_date: string; notes: string | null }[]) ?? [];

                    return (
                      <Card key={m.id} className="shadow-card">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant={m.status === "active" ? "default" : "secondary"} className="capitalize">
                                  {m.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {isMentor ? "Mentoring" : "Learning from"}
                                </span>
                              </div>
                              <h3 className="font-display font-semibold mt-2">
                                {other ? `${other.first_name} ${other.last_name}` : "Waiting for mentee..."}
                              </h3>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {(m.skills as string[])?.map((s) => (
                                  <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                                ))}
                              </div>
                            </div>
                            {m.status === "active" && isMentor && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" onClick={() => setSelectedMentorship(m.id)}>
                                    <Plus className="w-3.5 h-3.5 mr-1" /> Log Session
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Log Mentorship Session</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <Textarea
                                      placeholder="Session notes (optional)"
                                      value={sessionNotes}
                                      onChange={(e) => setSessionNotes(e.target.value)}
                                      maxLength={2000}
                                    />
                                    <Button onClick={() => logSession.mutate()} disabled={logSession.isPending} className="w-full gradient-warm text-primary-foreground">
                                      Save Session
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                          {sessions.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-border">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {sessions.length} session{sessions.length !== 1 ? "s" : ""} logged
                              </p>
                              <div className="space-y-2">
                                {sessions.slice(0, 3).map((s) => (
                                  <div key={s.id} className="text-xs text-muted-foreground">
                                    {new Date(s.session_date).toLocaleDateString()} {s.notes && `— ${s.notes.slice(0, 50)}...`}
                                  </div>
                                ))}
                              </div>
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
    </>
  );
}
