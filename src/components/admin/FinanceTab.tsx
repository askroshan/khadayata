import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DollarSign, GraduationCap, Heart, Building, TrendingUp, CircleCheck as CheckCircle, Circle as XCircle, Clock, Plus, RefreshCw, Pencil, Trash2, Target, Landmark } from "lucide-react";
import { format } from "date-fns";
import { useChapters } from "@/hooks/useMember";
import { CampaignsPanel } from "@/components/finance/CampaignsPanel";
import { TrustCorpusPanel } from "@/components/finance/TrustCorpusPanel";

interface FinanceTabProps {
  myChapterId: string | null;
}

const CURRENCIES = ["INR", "USD", "GBP", "AED", "SGD", "AUD"];

export default function FinanceTab({ myChapterId }: FinanceTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: chapters } = useChapters();

  const [donationSearch, setDonationSearch] = useState("");
  const [fundFilter, setFundFilter] = useState("__all__");
  const [selectedAidRequest, setSelectedAidRequest] = useState<null | Record<string, unknown>>(null);
  const [aidApprovalAmount, setAidApprovalAmount] = useState("");
  const [aidApprovalNotes, setAidApprovalNotes] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<null | Record<string, unknown>>(null);
  const [appDecisionReason, setAppDecisionReason] = useState("");
  const [createFundOpen, setCreateFundOpen] = useState(false);
  const [newFund, setNewFund] = useState({ name: "", currency: "INR", scope: "chapter", chapter_id: "" });
  const [editFund, setEditFund] = useState<{ id: string; name: string; currency: string; scope: string; chapter_id: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "medical_aid" | "scholarship" | "hall_booking"; id: string; label: string } | null>(null);
  const [createAidOpen, setCreateAidOpen] = useState(false);
  const [newAid, setNewAid] = useState({ patient_name: "", relation: "self", condition_summary: "", amount_needed: "", currency: "INR" });
  const [createBookingOpen, setCreateBookingOpen] = useState(false);
  const [newBooking, setNewBooking] = useState({ hall_name: "", purpose: "", booking_date: "", start_time: "09:00", end_time: "12:00", guests: "" });

  const { data: funds } = useQuery({
    queryKey: ["admin-funds"],
    queryFn: async () => {
      let q = supabase.from("funds").select("*, chapters(name)");
      if (myChapterId) q = q.or(`chapter_id.eq.${myChapterId},scope.eq.global`);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: allDonations } = useQuery({
    queryKey: ["admin-donations", myChapterId],
    queryFn: async () => {
      const { data } = await supabase
        .from("donations")
        .select("*, funds(name, chapter_id), members(first_name, last_name)")
        .order("created_at", { ascending: false })
        .limit(500);
      return (data ?? []).filter(d => {
        if (!myChapterId) return true;
        const fund = d.funds as { chapter_id: string | null } | null;
        return !fund?.chapter_id || fund.chapter_id === myChapterId;
      });
    },
  });

  const { data: medicalAidRequests } = useQuery({
    queryKey: ["admin-medical-aid", myChapterId],
    queryFn: async () => {
      let q = supabase
        .from("medical_aid_requests")
        .select("*, members(first_name, last_name)")
        .order("created_at", { ascending: false });
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: scholarshipApplications } = useQuery({
    queryKey: ["admin-scholarship-applications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("scholarship_applications")
        .select("*, scholarships(name, amount, currency), members(first_name, last_name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: hallBookings } = useQuery({
    queryKey: ["admin-hall-bookings", myChapterId],
    queryFn: async () => {
      let q = supabase
        .from("hall_bookings")
        .select("*, members(first_name, last_name)")
        .order("created_at", { ascending: false });
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      const { data } = await q;
      return data ?? [];
    },
  });

  const approveMedicalAid = useMutation({
    mutationFn: async ({ id, status, amount }: { id: string; status: string; amount?: number }) => {
      const { error } = await supabase.from("medical_aid_requests").update({
        status,
        approved_by: user?.id ?? null,
        approved_amount: amount ?? null,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast({ title: status === "approved" ? "Medical aid request approved" : "Medical aid request rejected" });
      setSelectedAidRequest(null);
      setAidApprovalAmount("");
      setAidApprovalNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-medical-aid", myChapterId] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const reviewScholarshipApp = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("scholarship_applications").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast({ title: status === "approved" ? "Application approved" : status === "rejected" ? "Application rejected" : "Application updated" });
      setSelectedApplication(null);
      setAppDecisionReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-scholarship-applications"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const approveHallBooking = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("hall_bookings").update({
        status,
        approved_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Hall booking updated" });
      queryClient.invalidateQueries({ queryKey: ["admin-hall-bookings", myChapterId] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createFund = useMutation({
    mutationFn: async () => {
      if (!newFund.name.trim()) throw new Error("Fund name is required");
      const { error } = await supabase.from("funds").insert({
        name: newFund.name.trim(),
        currency: newFund.currency,
        scope: newFund.scope,
        chapter_id: newFund.scope === "chapter" ? (newFund.chapter_id || myChapterId || null) : null,
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Fund created!" });
      setNewFund({ name: "", currency: "INR", scope: "chapter", chapter_id: "" });
      setCreateFundOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-funds"] });
      queryClient.invalidateQueries({ queryKey: ["funds"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateFund = useMutation({
    mutationFn: async () => {
      if (!editFund) return;
      const { error } = await supabase.from("funds").update({
        name: editFund.name.trim(),
        currency: editFund.currency,
        scope: editFund.scope,
        chapter_id: editFund.scope === "chapter" ? (editFund.chapter_id || myChapterId || null) : null,
      }).eq("id", editFund.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Fund updated!" });
      setEditFund(null);
      queryClient.invalidateQueries({ queryKey: ["admin-funds"] });
      queryClient.invalidateQueries({ queryKey: ["funds"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteRecord = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      const table = type === "medical_aid" ? "medical_aid_requests" : type === "scholarship" ? "scholarship_applications" : "hall_bookings";
      const { error } = await supabase.from(table as "medical_aid_requests" | "scholarship_applications" | "hall_bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { type }) => {
      toast({ title: "Record deleted." });
      setDeleteTarget(null);
      if (type === "medical_aid") queryClient.invalidateQueries({ queryKey: ["admin-medical-aid", myChapterId] });
      if (type === "scholarship") queryClient.invalidateQueries({ queryKey: ["admin-scholarship-applications"] });
      if (type === "hall_booking") queryClient.invalidateQueries({ queryKey: ["admin-hall-bookings", myChapterId] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createAidMutation = useMutation({
    mutationFn: async () => {
      if (!newAid.patient_name.trim()) throw new Error("Patient name is required");
      const { data: member } = await supabase.from("members").select("id").eq("user_id", user?.id ?? "").maybeSingle();
      if (!member) throw new Error("Member profile not found");
      const { error } = await supabase.from("medical_aid_requests").insert({
        patient_name: newAid.patient_name.trim(),
        relation: newAid.relation,
        condition_summary: newAid.condition_summary.trim() || null,
        amount_needed: newAid.amount_needed ? Number(newAid.amount_needed) : null,
        currency: newAid.currency,
        member_id: member.id,
        chapter_id: myChapterId || null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Medical aid request created" });
      setNewAid({ patient_name: "", relation: "self", condition_summary: "", amount_needed: "", currency: "INR" });
      setCreateAidOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-medical-aid", myChapterId] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!newBooking.hall_name.trim()) throw new Error("Hall name is required");
      if (!newBooking.booking_date) throw new Error("Booking date is required");
      const { data: member } = await supabase.from("members").select("id").eq("user_id", user?.id ?? "").maybeSingle();
      if (!member) throw new Error("Member profile not found");
      const { error } = await supabase.from("hall_bookings").insert({
        hall_name: newBooking.hall_name.trim(),
        purpose: newBooking.purpose.trim() || null,
        booking_date: newBooking.booking_date,
        start_time: newBooking.start_time,
        end_time: newBooking.end_time,
        guests: newBooking.guests ? Number(newBooking.guests) : null,
        member_id: member.id,
        chapter_id: myChapterId || null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Hall booking request created" });
      setNewBooking({ hall_name: "", purpose: "", booking_date: "", start_time: "09:00", end_time: "12:00", guests: "" });
      setCreateBookingOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-hall-bookings", myChapterId] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleFund = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("funds").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-funds"] });
      queryClient.invalidateQueries({ queryKey: ["funds"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const filteredDonations = (allDonations ?? []).filter(d => {
    const fund = d.funds as { name: string } | null;
    const mem = d.members as { first_name: string; last_name: string } | null;
    const matchSearch = !donationSearch ||
      (d.donor_name as string ?? "").toLowerCase().includes(donationSearch.toLowerCase()) ||
      `${mem?.first_name ?? ""} ${mem?.last_name ?? ""}`.toLowerCase().includes(donationSearch.toLowerCase()) ||
      (fund?.name ?? "").toLowerCase().includes(donationSearch.toLowerCase());
    const matchFund = fundFilter === "__all__" || d.fund_id === fundFilter;
    return matchSearch && matchFund;
  });

  const totalDonations = (allDonations ?? []).filter(d => d.status === "succeeded").reduce((s, d) => s + Number(d.amount), 0);
  const pendingAid = (medicalAidRequests ?? []).filter(r => r.status === "pending").length;
  const pendingApps = (scholarshipApplications ?? []).filter(a => a.status === "submitted" || a.status === "reviewing").length;
  const pendingBookings = (hallBookings ?? []).filter(b => b.status === "pending").length;

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-gold/20 text-gold-foreground",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-destructive/20 text-destructive",
    completed: "bg-muted text-muted-foreground",
    submitted: "bg-gold/20 text-gold-foreground",
    reviewing: "bg-primary/20 text-primary",
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{(allDonations ?? []).length}</p>
                <p className="text-xs text-muted-foreground">Total Donations</p>
                <p className="text-xs font-semibold text-primary">INR {totalDonations.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-destructive to-destructive/70 flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{pendingAid}</p>
                <p className="text-xs text-muted-foreground">Pending Aid</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{pendingApps}</p>
                <p className="text-xs text-muted-foreground">Pending Applications</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold/70 flex items-center justify-center">
                <Building className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{pendingBookings}</p>
                <p className="text-xs text-muted-foreground">Pending Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="donations">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="donations"><DollarSign className="w-3.5 h-3.5 mr-1" />Donations</TabsTrigger>
          <TabsTrigger value="medical-aid"><Heart className="w-3.5 h-3.5 mr-1" />Medical Aid {pendingAid > 0 && <Badge className="ml-1 bg-destructive text-destructive-foreground text-[10px] px-1 h-4">{pendingAid}</Badge>}</TabsTrigger>
          <TabsTrigger value="scholarships"><GraduationCap className="w-3.5 h-3.5 mr-1" />Scholarships {pendingApps > 0 && <Badge className="ml-1 bg-gold text-primary-foreground text-[10px] px-1 h-4">{pendingApps}</Badge>}</TabsTrigger>
          <TabsTrigger value="hall-bookings"><Building className="w-3.5 h-3.5 mr-1" />Hall Bookings {pendingBookings > 0 && <Badge className="ml-1 bg-primary text-primary-foreground text-[10px] px-1 h-4">{pendingBookings}</Badge>}</TabsTrigger>
          <TabsTrigger value="campaigns"><Target className="w-3.5 h-3.5 mr-1" />Campaigns</TabsTrigger>
          <TabsTrigger value="trust-corpus"><Landmark className="w-3.5 h-3.5 mr-1" />Trust Corpus</TabsTrigger>
          <TabsTrigger value="funds"><TrendingUp className="w-3.5 h-3.5 mr-1" />Fund Management</TabsTrigger>
        </TabsList>

        {/* Donations Ledger */}
        <TabsContent value="donations" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input placeholder="Search donor, fund..." value={donationSearch} onChange={e => setDonationSearch(e.target.value)} className="flex-1" />
            <Select value={fundFilter} onValueChange={setFundFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Funds</SelectItem>
                {funds?.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between text-sm font-medium">
            <span className="text-muted-foreground">{filteredDonations.length} records</span>
            <span>Total Succeeded: INR {filteredDonations.filter(d => d.status === "succeeded").reduce((s, d) => s + Number(d.amount), 0).toLocaleString()}</span>
          </div>
          <div className="space-y-2">
            {filteredDonations.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No donations found</p>
            ) : filteredDonations.map((d) => {
              const fund = d.funds as { name: string } | null;
              const mem = d.members as { first_name: string; last_name: string } | null;
              return (
                <div key={d.id as string} className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/30 border border-border text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{d.donor_name as string || `${mem?.first_name ?? ""} ${mem?.last_name ?? ""}`}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span>{fund?.name}</span>
                      <span>•</span>
                      <span>{new Date(d.created_at as string).toLocaleDateString()}</span>
                      {d.payment_method && <span>• {d.payment_method as string}</span>}
                      {d.pan_number && <span>• PAN: {d.pan_number as string}</span>}
                      {d.type === "recurring" && <Badge variant="outline" className="text-[10px]"><RefreshCw className="w-2.5 h-2.5 mr-0.5" />{d.recurring_interval as string}</Badge>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <Badge variant={(d.status as string) === "succeeded" ? "default" : "secondary"} className="capitalize text-[10px]">{d.status as string}</Badge>
                    <p className="font-semibold text-sm mt-0.5">{d.currency as string} {Number(d.amount).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Medical Aid */}
        <TabsContent value="medical-aid" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setCreateAidOpen(true)} className="gradient-warm text-primary-foreground gap-1">
              <Plus className="w-3.5 h-3.5" />New Request
            </Button>
          </div>
          <div className="space-y-3">
            {(medicalAidRequests ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No medical aid requests</p>
            ) : (medicalAidRequests ?? []).map((r) => {
              const mem = r.members as { first_name: string; last_name: string } | null;
              return (
                <Card key={r.id as string} className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{r.patient_name as string}</p>
                          <span className="text-xs text-muted-foreground">({r.relation as string} of {mem?.first_name} {mem?.last_name})</span>
                          <Badge className={`text-[10px] border-0 capitalize ${STATUS_COLORS[r.status as string] ?? ""}`}>{r.status as string}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.condition_summary as string}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                          <span>Requested: {r.currency as string} {Number(r.amount_needed).toLocaleString()}</span>
                          {r.approved_amount && <span className="text-emerald-600 font-medium">Approved: {r.currency as string} {Number(r.approved_amount).toLocaleString()}</span>}
                          <span>{new Date(r.created_at as string).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {(r.status as string) === "pending" && (
                          <Button size="sm" variant="outline" onClick={() => { setSelectedAidRequest(r as Record<string, unknown>); setAidApprovalAmount(String(r.amount_needed ?? "")); }}>
                            Review
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          aria-label="Delete request"
                          onClick={() => setDeleteTarget({ type: "medical_aid", id: r.id as string, label: r.patient_name as string })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Scholarship Applications */}
        <TabsContent value="scholarships" className="mt-4 space-y-4">
          <div className="space-y-3">
            {(scholarshipApplications ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No scholarship applications</p>
            ) : (scholarshipApplications ?? []).map((app) => {
              const scholarship = app.scholarships as { name: string; amount: number | null; currency: string } | null;
              const mem = app.members as { first_name: string; last_name: string } | null;
              return (
                <Card key={app.id as string} className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{mem?.first_name} {mem?.last_name}</p>
                          <span className="text-xs text-muted-foreground">applied for</span>
                          <p className="font-medium text-sm">{scholarship?.name}</p>
                          <Badge className={`text-[10px] border-0 capitalize ${STATUS_COLORS[app.status as string] ?? ""}`}>{app.status as string}</Badge>
                        </div>
                        {scholarship?.amount && (
                          <p className="text-xs text-muted-foreground mt-1">{scholarship.currency} {Number(scholarship.amount).toLocaleString()}</p>
                        )}
                        {app.essay && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{app.essay as string}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(app.created_at as string), "MMM d, yyyy")}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {((app.status as string) === "submitted" || (app.status as string) === "reviewing") && (
                          <Button size="sm" variant="outline" onClick={() => setSelectedApplication(app as Record<string, unknown>)}>
                            Review
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          aria-label="Delete application"
                          onClick={() => {
                            const mem = app.members as { first_name: string; last_name: string } | null;
                            setDeleteTarget({ type: "scholarship", id: app.id as string, label: `${mem?.first_name} ${mem?.last_name}` });
                          }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Hall Bookings */}
        <TabsContent value="hall-bookings" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setCreateBookingOpen(true)} className="gradient-warm text-primary-foreground gap-1">
              <Plus className="w-3.5 h-3.5" />New Booking
            </Button>
          </div>
          <div className="space-y-3">
            {(hallBookings ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No hall booking requests</p>
            ) : (hallBookings ?? []).map((b) => {
              const mem = b.members as { first_name: string; last_name: string } | null;
              return (
                <Card key={b.id as string} className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{b.hall_name as string}</p>
                          <Badge className={`text-[10px] border-0 capitalize ${STATUS_COLORS[b.status as string] ?? ""}`}>{b.status as string}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {mem?.first_name} {mem?.last_name} • {new Date(b.booking_date as string).toLocaleDateString()} • {b.start_time as string}–{b.end_time as string}
                        </p>
                        {b.purpose && <p className="text-xs text-muted-foreground">{b.purpose as string}</p>}
                        {b.guests && <p className="text-xs text-muted-foreground">{b.guests as number} guests expected</p>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {(b.status as string) === "pending" && (
                          <>
                            <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200"
                              onClick={() => approveHallBooking.mutate({ id: b.id as string, status: "approved" })}>
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive border-destructive/30"
                              onClick={() => approveHallBooking.mutate({ id: b.id as string, status: "rejected" })}>
                              <XCircle className="w-3.5 h-3.5 mr-1" />Reject
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          aria-label="Delete booking"
                          onClick={() => {
                            const mem = b.members as { first_name: string; last_name: string } | null;
                            setDeleteTarget({ type: "hall_booking", id: b.id as string, label: `${b.hall_name as string} — ${mem?.first_name}` });
                          }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Campaigns */}
        <TabsContent value="campaigns" className="mt-4">
          <CampaignsPanel myChapterId={myChapterId} />
        </TabsContent>

        {/* Trust Corpus */}
        <TabsContent value="trust-corpus" className="mt-4">
          <TrustCorpusPanel myChapterId={myChapterId} />
        </TabsContent>

        {/* Fund Management */}
        <TabsContent value="funds" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setCreateFundOpen(true)} className="gradient-warm text-primary-foreground">
              <Plus className="w-4 h-4 mr-1" />Create Fund
            </Button>
          </div>
          <div className="space-y-3">
            {(funds ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No funds found</p>
            ) : (funds ?? []).map((f) => {
              const chap = f.chapters as { name: string } | null;
              const fundDonations = (allDonations ?? []).filter(d => d.fund_id === f.id && d.status === "succeeded");
              const fundTotal = fundDonations.reduce((s, d) => s + Number(d.amount), 0);
              return (
                <Card key={f.id as string} className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{f.name}</p>
                          <Badge variant="outline" className="text-[10px] capitalize">{f.scope}</Badge>
                          <Badge variant="outline" className="text-[10px]">{f.currency}</Badge>
                          {!f.active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                        </div>
                        {chap && <p className="text-xs text-muted-foreground mt-0.5">{chap.name}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">{fundDonations.length} donations • {f.currency} {fundTotal.toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          aria-label="Edit fund"
                          onClick={() => setEditFund({ id: f.id as string, name: f.name, currency: f.currency, scope: f.scope, chapter_id: (f as { chapter_id?: string }).chapter_id ?? "" })}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline"
                          onClick={() => toggleFund.mutate({ id: f.id as string, active: !f.active })}>
                          {f.active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Medical Aid Review Dialog */}
      <Dialog open={!!selectedAidRequest} onOpenChange={(open) => { if (!open) { setSelectedAidRequest(null); setAidApprovalAmount(""); setAidApprovalNotes(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Medical Aid Request</DialogTitle>
            <DialogDescription>
              {selectedAidRequest && `${selectedAidRequest.patient_name as string} — ${selectedAidRequest.relation as string}`}
            </DialogDescription>
          </DialogHeader>
          {selectedAidRequest && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p className="font-medium mb-1">Condition Summary</p>
                <p className="text-muted-foreground">{selectedAidRequest.condition_summary as string}</p>
                <p className="mt-2 font-medium">Amount Requested: {selectedAidRequest.currency as string} {Number(selectedAidRequest.amount_needed).toLocaleString()}</p>
              </div>
              <div>
                <Label>Approved Amount ({selectedAidRequest.currency as string})</Label>
                <Input type="number" value={aidApprovalAmount} onChange={e => setAidApprovalAmount(e.target.value)} placeholder="Enter approved amount" />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={aidApprovalNotes} onChange={e => setAidApprovalNotes(e.target.value)} rows={2} placeholder="Approval notes, conditions..." />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => approveMedicalAid.mutate({ id: selectedAidRequest.id as string, status: "approved", amount: aidApprovalAmount ? Number(aidApprovalAmount) : undefined })}
                  disabled={approveMedicalAid.isPending}>
                  <CheckCircle className="w-4 h-4 mr-1" />Approve
                </Button>
                <Button variant="destructive" className="flex-1"
                  onClick={() => approveMedicalAid.mutate({ id: selectedAidRequest.id as string, status: "rejected" })}
                  disabled={approveMedicalAid.isPending}>
                  <XCircle className="w-4 h-4 mr-1" />Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Scholarship Application Review Dialog */}
      <Dialog open={!!selectedApplication} onOpenChange={(open) => { if (!open) { setSelectedApplication(null); setAppDecisionReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Scholarship Application</DialogTitle>
            <DialogDescription>
              {selectedApplication && (() => {
                const mem = selectedApplication.members as { first_name: string; last_name: string } | null;
                const sch = selectedApplication.scholarships as { name: string } | null;
                return `${mem?.first_name} ${mem?.last_name} — ${sch?.name}`;
              })()}
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-4">
              {selectedApplication.essay && (
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p className="font-medium mb-1">Essay</p>
                  <p className="text-muted-foreground">{selectedApplication.essay as string}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1"
                  onClick={() => reviewScholarshipApp.mutate({ id: selectedApplication.id as string, status: "reviewing" })}
                  disabled={reviewScholarshipApp.isPending}>
                  <Clock className="w-3.5 h-3.5 mr-1" />Mark Reviewing
                </Button>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => reviewScholarshipApp.mutate({ id: selectedApplication.id as string, status: "approved" })}
                  disabled={reviewScholarshipApp.isPending}>
                  <CheckCircle className="w-4 h-4 mr-1" />Approve
                </Button>
                <Button variant="destructive" className="flex-1"
                  onClick={() => reviewScholarshipApp.mutate({ id: selectedApplication.id as string, status: "rejected" })}
                  disabled={reviewScholarshipApp.isPending}>
                  <XCircle className="w-4 h-4 mr-1" />Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Fund Dialog */}
      <Dialog open={!!editFund} onOpenChange={(open) => { if (!open) setEditFund(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Fund</DialogTitle>
            <DialogDescription>Update fund name, currency, or scope.</DialogDescription>
          </DialogHeader>
          {editFund && (
            <div className="space-y-3">
              <div>
                <Label>Fund Name *</Label>
                <Input value={editFund.name} onChange={e => setEditFund({ ...editFund, name: e.target.value })} maxLength={200} />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={editFund.currency} onValueChange={v => setEditFund({ ...editFund, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Scope</Label>
                <Select value={editFund.scope} onValueChange={v => setEditFund({ ...editFund, scope: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chapter">Chapter</SelectItem>
                    <SelectItem value="global">Global</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editFund.scope === "chapter" && (
                <div>
                  <Label>Chapter</Label>
                  <Select value={editFund.chapter_id} onValueChange={v => setEditFund({ ...editFund, chapter_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select chapter" /></SelectTrigger>
                    <SelectContent>{chapters?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={() => updateFund.mutate()} disabled={!editFund.name.trim() || updateFund.isPending} className="w-full gradient-warm text-primary-foreground">
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Record Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <strong>{deleteTarget?.label}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteRecord.mutate({ type: deleteTarget.type, id: deleteTarget.id })}
              disabled={deleteRecord.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Medical Aid Request Dialog */}
      <Dialog open={createAidOpen} onOpenChange={(open) => { if (!open) { setCreateAidOpen(false); setNewAid({ patient_name: "", relation: "self", condition_summary: "", amount_needed: "", currency: "INR" }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Medical Aid Request</DialogTitle>
            <DialogDescription>Submit a medical aid request on behalf of a member.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Patient Name *</Label><Input value={newAid.patient_name} onChange={e => setNewAid({ ...newAid, patient_name: e.target.value })} placeholder="Full name of patient" maxLength={200} /></div>
            <div>
              <Label>Relation to Member</Label>
              <Select value={newAid.relation} onValueChange={v => setNewAid({ ...newAid, relation: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["self", "spouse", "child", "parent", "sibling", "other"].map(r => (
                    <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Condition Summary</Label><Textarea value={newAid.condition_summary} onChange={e => setNewAid({ ...newAid, condition_summary: e.target.value })} rows={3} placeholder="Describe the medical condition and treatment needed..." maxLength={2000} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount Needed</Label><Input type="number" value={newAid.amount_needed} onChange={e => setNewAid({ ...newAid, amount_needed: e.target.value })} placeholder="0" min="0" /></div>
              <div>
                <Label>Currency</Label>
                <Select value={newAid.currency} onValueChange={v => setNewAid({ ...newAid, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => createAidMutation.mutate()} disabled={!newAid.patient_name.trim() || createAidMutation.isPending} className="w-full gradient-warm text-primary-foreground">
              <Plus className="w-4 h-4 mr-1" /> Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Hall Booking Dialog */}
      <Dialog open={createBookingOpen} onOpenChange={(open) => { if (!open) { setCreateBookingOpen(false); setNewBooking({ hall_name: "", purpose: "", booking_date: "", start_time: "09:00", end_time: "12:00", guests: "" }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Hall Booking</DialogTitle>
            <DialogDescription>Create a hall booking request.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Hall Name *</Label><Input value={newBooking.hall_name} onChange={e => setNewBooking({ ...newBooking, hall_name: e.target.value })} placeholder="e.g. Community Hall, Banquet Hall" maxLength={200} /></div>
            <div><Label>Purpose</Label><Input value={newBooking.purpose} onChange={e => setNewBooking({ ...newBooking, purpose: e.target.value })} placeholder="e.g. Wedding reception, Cultural event" maxLength={500} /></div>
            <div><Label>Booking Date *</Label><Input type="date" value={newBooking.booking_date} onChange={e => setNewBooking({ ...newBooking, booking_date: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Time</Label><Input type="time" value={newBooking.start_time} onChange={e => setNewBooking({ ...newBooking, start_time: e.target.value })} /></div>
              <div><Label>End Time</Label><Input type="time" value={newBooking.end_time} onChange={e => setNewBooking({ ...newBooking, end_time: e.target.value })} /></div>
            </div>
            <div><Label>Expected Guests</Label><Input type="number" value={newBooking.guests} onChange={e => setNewBooking({ ...newBooking, guests: e.target.value })} placeholder="Number of guests" min="1" /></div>
            <Button onClick={() => createBookingMutation.mutate()} disabled={!newBooking.hall_name.trim() || !newBooking.booking_date || createBookingMutation.isPending} className="w-full gradient-warm text-primary-foreground">
              <Plus className="w-4 h-4 mr-1" /> Submit Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Fund Dialog */}
      <Dialog open={createFundOpen} onOpenChange={setCreateFundOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Fund</DialogTitle>
            <DialogDescription>Set up a new donation fund for the community.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Fund Name *</Label>
              <Input value={newFund.name} onChange={e => setNewFund({...newFund, name: e.target.value})} placeholder="e.g. Education Fund 2026" maxLength={200} />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={newFund.currency} onValueChange={v => setNewFund({...newFund, currency: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scope</Label>
              <Select value={newFund.scope} onValueChange={v => setNewFund({...newFund, scope: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="chapter">Chapter</SelectItem>
                  <SelectItem value="global">Global</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newFund.scope === "chapter" && (
              <div>
                <Label>Chapter</Label>
                <Select value={newFund.chapter_id} onValueChange={v => setNewFund({...newFund, chapter_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select chapter" /></SelectTrigger>
                  <SelectContent>
                    {chapters?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={() => createFund.mutate()} disabled={!newFund.name.trim() || createFund.isPending} className="w-full gradient-warm text-primary-foreground">
              Create Fund
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
