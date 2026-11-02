import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMember } from "@/hooks/useMember";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Target, Plus, Calendar, TrendingUp } from "lucide-react";
import { getCampaignProgress, getCampaignDaysRemaining, formatCurrency } from "@/lib/finance-utils";
import { format } from "date-fns";

const CAMPAIGN_TYPES = [
  { value: "general", label: "General" },
  { value: "paryushan", label: "Paryushan" },
  { value: "construction", label: "Construction" },
  { value: "education", label: "Education" },
  { value: "medical", label: "Medical Relief" },
];
const CURRENCIES = ["INR", "USD", "GBP", "AED", "SGD", "AUD"];

interface CampaignsPanelProps {
  myChapterId: string | null;
}

export function CampaignsPanel({ myChapterId }: CampaignsPanelProps) {
  const { member } = useMember();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", goal_amount: "", currency: "INR",
    start_date: "", end_date: "", campaign_type: "general", cover_image_url: "",
  });

  const { data: campaigns } = useQuery({
    queryKey: ["campaigns", myChapterId],
    queryFn: async () => {
      let q = supabase.from("fundraising_campaigns").select("*").order("created_at", { ascending: false });
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: campaignDonations } = useQuery({
    queryKey: ["campaign-donations", myChapterId],
    queryFn: async () => {
      const { data } = await supabase
        .from("campaign_donations")
        .select("campaign_id, donation_id, donations(amount, currency, status)");
      return data ?? [];
    },
  });

  const createCampaign = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.goal_amount || !form.start_date || !form.end_date) {
        throw new Error("Fill in all required fields");
      }
      if (!member?.id) throw new Error("Member profile required to create a campaign");
      const { error } = await supabase.from("fundraising_campaigns").insert({
        title: form.title.trim(),
        description: form.description.trim(),
        goal_amount: parseFloat(form.goal_amount),
        currency: form.currency,
        start_date: form.start_date,
        end_date: form.end_date,
        campaign_type: form.campaign_type,
        chapter_id: myChapterId || null,
        created_by: member.id,
        cover_image_url: form.cover_image_url.trim() || null,
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Campaign created!" });
      setForm({ title: "", description: "", goal_amount: "", currency: "INR", start_date: "", end_date: "", campaign_type: "general", cover_image_url: "" });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["campaigns", myChapterId] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("fundraising_campaigns")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", myChapterId] });
      toast({ title: "Campaign updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function getRaised(campaignId: string, currency: string): number {
    if (!campaignDonations) return 0;
    return campaignDonations
      .filter(cd => cd.campaign_id === campaignId)
      .reduce((sum, cd) => {
        const donation = cd.donations as { amount: number; currency: string; status: string } | null;
        if (!donation || donation.status !== "succeeded" || donation.currency !== currency) return sum;
        return sum + Number(donation.amount);
      }, 0);
  }

  const STATUS_COLORS: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-emerald-100 text-emerald-800",
    completed: "bg-primary/20 text-primary",
    cancelled: "bg-destructive/20 text-destructive",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Target className="w-4.5 h-4.5 text-primary" />
          Fundraising Campaigns
        </h3>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1">
          <Plus className="w-3.5 h-3.5" />New Campaign
        </Button>
      </div>

      {(campaigns ?? []).length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="p-6 text-center">
            <Target className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No campaigns yet. Create a Paryushan or general fundraising campaign.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(campaigns ?? []).map((c) => {
            const raised = getRaised(c.id, c.currency);
            const progress = getCampaignProgress(raised, Number(c.goal_amount));
            const daysLeft = getCampaignDaysRemaining(c.end_date);
            return (
              <Card key={c.id} className="shadow-card overflow-hidden">
                {c.cover_image_url && (
                  <div className="h-28 overflow-hidden">
                    <img src={c.cover_image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-medium text-sm">{c.title}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge className={`text-[10px] border-0 capitalize ${STATUS_COLORS[c.status] ?? ""}`}>{c.status}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{c.campaign_type}</Badge>
                      </div>
                    </div>
                  </div>

                  {c.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                  )}

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{formatCurrency(raised, c.currency)} raised</span>
                      <span className="text-muted-foreground">of {formatCurrency(Number(c.goal_amount), c.currency)}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-[10px] text-muted-foreground mt-1">{progress}% complete</p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(c.start_date), "MMM d")} — {format(new Date(c.end_date), "MMM d, yyyy")}
                    </span>
                    {c.status === "active" && (
                      <span className="font-medium text-primary">{daysLeft}d left</span>
                    )}
                  </div>

                  <div className="flex gap-1.5 pt-1">
                    {c.status === "draft" && (
                      <Button size="sm" variant="outline" className="text-xs h-7 text-emerald-600"
                        onClick={() => updateStatus.mutate({ id: c.id, status: "active" })}>
                        Activate
                      </Button>
                    )}
                    {c.status === "active" && (
                      <Button size="sm" variant="outline" className="text-xs h-7"
                        onClick={() => updateStatus.mutate({ id: c.id, status: "completed" })}>
                        Mark Complete
                      </Button>
                    )}
                    {(c.status === "draft" || c.status === "active") && (
                      <Button size="sm" variant="outline" className="text-xs h-7 text-destructive"
                        onClick={() => updateStatus.mutate({ id: c.id, status: "cancelled" })}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Fundraising Campaign</DialogTitle>
            <DialogDescription>Launch a time-bound fundraising campaign for the community.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Campaign Title *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Paryushan Mahaparv 2026" maxLength={200} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Campaign purpose and goals..." maxLength={2000} />
            </div>
            <div>
              <Label>Campaign Type</Label>
              <Select value={form.campaign_type} onValueChange={v => setForm({ ...form, campaign_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CAMPAIGN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Goal Amount *</Label>
                <Input type="number" value={form.goal_amount} onChange={e => setForm({ ...form, goal_amount: e.target.value })} placeholder="0" min="1" />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date *</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Cover Image URL</Label>
              <Input value={form.cover_image_url} onChange={e => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://..." />
            </div>
            <Button onClick={() => createCampaign.mutate()} disabled={!form.title.trim() || !form.goal_amount || !form.start_date || !form.end_date || createCampaign.isPending} className="w-full gradient-warm text-primary-foreground">
              <TrendingUp className="w-4 h-4 mr-1" />Create Campaign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
