import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, HeartPulse, Calendar, Clock, Users, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Send } from "lucide-react";
import { format } from "date-fns";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-gold/20 text-gold-foreground",
  approved: "bg-emerald-500/20 text-emerald-700",
  rejected: "bg-destructive/20 text-destructive",
  completed: "bg-primary/20 text-primary",
};

export default function Services() {
  const { user, loading } = useAuth();
  const { member } = useMember();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.hash === "#medical" ? "medical" : "hall");

  useEffect(() => {
    const tab = location.hash === "#medical" ? "medical" : location.hash === "#hall" ? "hall" : null;
    if (tab) setActiveTab(tab);
  }, [location.hash]);

  // Hall booking form
  const [hallForm, setHallForm] = useState({ hall_name: "", purpose: "", booking_date: "", start_time: "09:00", end_time: "17:00", guests: 0, notes: "" });
  const [hallErrors, setHallErrors] = useState<{ hall_name?: string; booking_date?: string }>({});
  // Medical aid form
  const [medForm, setMedForm] = useState({ patient_name: "", relation: "self", condition_summary: "", amount_needed: "", currency: "INR" });

  const { data: bookings } = useQuery({
    queryKey: ["hall-bookings"],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase.from("hall_bookings").select("*, chapters(name)").eq("member_id", member.id).order("booking_date", { ascending: false });
      return data ?? [];
    },
    enabled: !!member,
  });

  const { data: medRequests } = useQuery({
    queryKey: ["medical-aid-requests"],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase.from("medical_aid_requests").select("*").eq("member_id", member.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!member,
  });

  const createBooking = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error("Not a member");
      const { error } = await supabase.from("hall_bookings").insert({
        member_id: member.id,
        chapter_id: member.chapter_id,
        hall_name: hallForm.hall_name,
        purpose: hallForm.purpose || null,
        booking_date: hallForm.booking_date,
        start_time: hallForm.start_time,
        end_time: hallForm.end_time,
        guests: hallForm.guests,
        notes: hallForm.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Booking request submitted!" });
      setHallForm({ hall_name: "", purpose: "", booking_date: "", start_time: "09:00", end_time: "17:00", guests: 0, notes: "" });
      queryClient.invalidateQueries({ queryKey: ["hall-bookings"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createMedAid = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error("Not a member");
      const { error } = await supabase.from("medical_aid_requests").insert({
        member_id: member.id,
        chapter_id: member.chapter_id,
        patient_name: medForm.patient_name,
        relation: medForm.relation,
        condition_summary: medForm.condition_summary || null,
        amount_needed: medForm.amount_needed ? Number(medForm.amount_needed) : null,
        currency: medForm.currency,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Medical aid request submitted!" });
      setMedForm({ patient_name: "", relation: "self", condition_summary: "", amount_needed: "", currency: "INR" });
      queryClient.invalidateQueries({ queryKey: ["medical-aid-requests"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleSubmitHallBooking = () => {
    const errors: { hall_name?: string; booking_date?: string } = {};
    if (!hallForm.hall_name.trim()) errors.hall_name = "Hall / Venue Name is required.";
    if (!hallForm.booking_date) errors.booking_date = "Booking Date is required.";
    if (Object.keys(errors).length > 0) {
      setHallErrors(errors);
      return;
    }
    setHallErrors({});
    createBooking.mutate();
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppLayout title="Chapter Services">
      <div className="space-y-6">
        <div className="gradient-jewel p-6 sm:p-8 text-primary-foreground">
          <h1 className="text-xl sm:text-3xl font-display font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6" /> Chapter Services
          </h1>
          <p className="text-primary-foreground/70 mt-1 max-w-md text-sm">
            Hall bookings, medical aid requests, and community services from your chapter.
          </p>
        </div>

        <div className="px-3 sm:px-6 pb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="hall"><Calendar className="w-3.5 h-3.5 mr-1" />Hall Booking</TabsTrigger>
              <TabsTrigger value="medical"><HeartPulse className="w-3.5 h-3.5 mr-1" />Medical Aid</TabsTrigger>
            </TabsList>

            {/* Hall Booking Tab */}
            <TabsContent value="hall" className="space-y-4">
              <div className="flex justify-end">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="gradient-warm text-primary-foreground"><Calendar className="w-4 h-4 mr-1" />Book Hall</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Request Hall Booking</DialogTitle>
                      <DialogDescription>Submit a booking request for a community hall. Your chapter admin will review it.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label>Hall / Venue Name *</Label>
                        <Input value={hallForm.hall_name} onChange={(e) => { setHallForm({ ...hallForm, hall_name: e.target.value }); if (e.target.value.trim()) setHallErrors(p => ({ ...p, hall_name: undefined })); }} placeholder="e.g. Community Hall, Meeting Room" className={hallErrors.hall_name ? "border-destructive" : ""} />
                        {hallErrors.hall_name && <p className="text-xs text-destructive mt-1">{hallErrors.hall_name}</p>}
                      </div>
                      <div><Label>Purpose</Label><Input value={hallForm.purpose} onChange={(e) => setHallForm({ ...hallForm, purpose: e.target.value })} placeholder="e.g. Wedding, Meeting, Seminar" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Date *</Label>
                          <Input type="date" value={hallForm.booking_date} onChange={(e) => { setHallForm({ ...hallForm, booking_date: e.target.value }); if (e.target.value) setHallErrors(p => ({ ...p, booking_date: undefined })); }} className={hallErrors.booking_date ? "border-destructive" : ""} />
                          {hallErrors.booking_date && <p className="text-xs text-destructive mt-1">{hallErrors.booking_date}</p>}
                        </div>
                        <div><Label>Guests</Label><Input type="number" value={hallForm.guests} onChange={(e) => setHallForm({ ...hallForm, guests: Number(e.target.value) })} min={0} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Start Time *</Label><Input type="time" value={hallForm.start_time} onChange={(e) => setHallForm({ ...hallForm, start_time: e.target.value })} /></div>
                        <div><Label>End Time *</Label><Input type="time" value={hallForm.end_time} onChange={(e) => setHallForm({ ...hallForm, end_time: e.target.value })} /></div>
                      </div>
                      <div><Label>Notes</Label><Textarea value={hallForm.notes} onChange={(e) => setHallForm({ ...hallForm, notes: e.target.value })} placeholder="Any special requirements..." rows={3} maxLength={1000} /></div>
                      <Button onClick={handleSubmitHallBooking} disabled={createBooking.isPending} className="w-full gradient-hero text-primary-foreground">
                        <Send className="w-4 h-4 mr-1" />Submit Request
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {(!bookings || bookings.length === 0) ? (
                <Card className="shadow-card"><CardContent className="text-center py-16"><Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No hall bookings yet.</p></CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {bookings.map((b) => (
                    <Card key={b.id} className="shadow-card hover:shadow-elevated transition-all">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-display font-semibold">{b.hall_name}</h3>
                            {b.purpose && <p className="text-sm text-muted-foreground">{b.purpose}</p>}
                          </div>
                          <Badge className={`${STATUS_STYLES[b.status] ?? ""} capitalize`}>{b.status}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{format(new Date(b.booking_date), "MMM d, yyyy")}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{b.start_time?.slice(0, 5)} – {b.end_time?.slice(0, 5)}</span>
                          {b.guests > 0 && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{b.guests} guests</span>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Medical Aid Tab */}
            <TabsContent value="medical" className="space-y-4">
              <div className="flex justify-end">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="gradient-warm text-primary-foreground"><HeartPulse className="w-4 h-4 mr-1" />Request Aid</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Request Medical Aid</DialogTitle>
                      <DialogDescription>Submit a request for financial assistance for medical treatment. Your chapter committee will review it.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Patient Name *</Label><Input value={medForm.patient_name} onChange={(e) => setMedForm({ ...medForm, patient_name: e.target.value })} /></div>
                      <div>
                        <Label>Relation to Member</Label>
                        <Select value={medForm.relation} onValueChange={(v) => setMedForm({ ...medForm, relation: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["self", "spouse", "child", "parent", "sibling", "other"].map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Condition Summary</Label><Textarea value={medForm.condition_summary} onChange={(e) => setMedForm({ ...medForm, condition_summary: e.target.value })} placeholder="Brief description of medical condition..." rows={3} maxLength={2000} /></div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2"><Label>Amount Needed</Label><Input type="number" value={medForm.amount_needed} onChange={(e) => setMedForm({ ...medForm, amount_needed: e.target.value })} /></div>
                        <div>
                          <Label>Currency</Label>
                          <Select value={medForm.currency} onValueChange={(v) => setMedForm({ ...medForm, currency: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["INR", "USD", "GBP", "KES"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button onClick={() => createMedAid.mutate()} disabled={createMedAid.isPending || !medForm.patient_name} className="w-full gradient-hero text-primary-foreground">
                        <Send className="w-4 h-4 mr-1" />Submit Request
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {(!medRequests || medRequests.length === 0) ? (
                <Card className="shadow-card"><CardContent className="text-center py-16"><HeartPulse className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No medical aid requests.</p></CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {medRequests.map((r) => (
                    <Card key={r.id} className="shadow-card hover:shadow-elevated transition-all">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-display font-semibold">{r.patient_name}</h3>
                            <p className="text-xs text-muted-foreground capitalize">{r.relation} • {format(new Date(r.created_at), "MMM d, yyyy")}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={`${STATUS_STYLES[r.status] ?? ""} capitalize`}>{r.status}</Badge>
                            {r.amount_needed && <p className="text-sm font-semibold mt-1">{r.currency} {Number(r.amount_needed).toLocaleString()}</p>}
                          </div>
                        </div>
                        {r.condition_summary && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{r.condition_summary}</p>}
                        {r.approved_amount && <div className="mt-2 p-2 rounded bg-emerald-500/10 text-sm"><CheckCircle className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />Approved: {r.currency} {Number(r.approved_amount).toLocaleString()}</div>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
