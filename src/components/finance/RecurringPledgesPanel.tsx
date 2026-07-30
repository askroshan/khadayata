import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMember } from "@/hooks/useMember";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Plus, Pause, Play, X } from "lucide-react";
import { calculateAnnualPledge, formatCurrency } from "@/lib/finance-utils";

const INTERVALS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];
const CURRENCIES = ["INR", "USD", "GBP", "AED", "SGD", "AUD"];

export function RecurringPledgesPanel() {
  const { member } = useMember();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    fund_id: "", amount: "", currency: "INR", interval: "monthly", notes: "",
  });

  const { data: pledges } = useQuery({
    queryKey: ["my-pledges", member?.id],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase
        .from("recurring_pledges")
        .select("*, funds(name)")
        .eq("member_id", member.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!member,
  });

  const { data: funds } = useQuery({
    queryKey: ["funds"],
    queryFn: async () => {
      const { data } = await supabase.from("funds").select("*").eq("active", true);
      return data ?? [];
    },
  });

  const createPledge = useMutation({
    mutationFn: async () => {
      if (!member || !form.fund_id || !form.amount) throw new Error("Missing fields");
      const { error } = await supabase.from("recurring_pledges").insert({
        member_id: member.id,
        fund_id: form.fund_id,
        amount: parseFloat(form.amount),
        currency: form.currency,
        interval: form.interval,
        notes: form.notes.trim() || null,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Recurring pledge created!" });
      setForm({ fund_id: "", amount: "", currency: "INR", interval: "monthly", notes: "" });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["my-pledges", member?.id] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("recurring_pledges")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-pledges", member?.id] });
      toast({ title: "Pledge updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const activePledges = (pledges ?? []).filter(p => p.status === "active");
  const totalAnnual = activePledges.reduce(
    (sum, p) => sum + calculateAnnualPledge(Number(p.amount), p.interval),
    0
  );

  const STATUS_COLORS: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800",
    paused: "bg-gold/20 text-gold-foreground",
    cancelled: "bg-muted text-muted-foreground",
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display flex items-center gap-2 text-base">
            <RefreshCw className="w-4.5 h-4.5 text-primary" />
            Masik Sahayog (Recurring Pledges)
          </CardTitle>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1">
            <Plus className="w-3.5 h-3.5" />New Pledge
          </Button>
        </div>
        {activePledges.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Annual commitment: {formatCurrency(totalAnnual, "INR")}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {(pledges ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recurring pledges yet. Set up a standing contribution to support the community regularly.
          </p>
        ) : (
          (pledges ?? []).map((p) => {
            const fund = p.funds as { name: string } | null;
            return (
              <div key={p.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/30 border border-border text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{fund?.name ?? "Fund"}</p>
                    <Badge className={`text-[10px] border-0 capitalize ${STATUS_COLORS[p.status] ?? ""}`}>
                      {p.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatCurrency(Number(p.amount), p.currency)} / {p.interval}
                    {p.notes && <span className="ml-2 italic">{p.notes}</span>}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  {p.status === "active" && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                      aria-label="Pause pledge"
                      onClick={() => updateStatus.mutate({ id: p.id, status: "paused" })}>
                      <Pause className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {p.status === "paused" && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600"
                      aria-label="Resume pledge"
                      onClick={() => updateStatus.mutate({ id: p.id, status: "active" })}>
                      <Play className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {p.status !== "cancelled" && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                      aria-label="Cancel pledge"
                      onClick={() => updateStatus.mutate({ id: p.id, status: "cancelled" })}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Recurring Pledge</DialogTitle>
            <DialogDescription>Set up a standing contribution to a fund.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Fund *</Label>
              <Select value={form.fund_id} onValueChange={v => setForm({ ...form, fund_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select fund" /></SelectTrigger>
                <SelectContent>{funds?.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount *</Label>
                <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" min="1" />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Interval *</Label>
              <Select value={form.interval} onValueChange={v => setForm({ ...form, interval: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INTERVALS.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.amount && (
              <p className="text-xs text-muted-foreground">
                Annual total: {formatCurrency(calculateAnnualPledge(parseFloat(form.amount) || 0, form.interval), form.currency)}
              </p>
            )}
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional dedication or purpose" maxLength={500} />
            </div>
            <Button onClick={() => createPledge.mutate()} disabled={!form.fund_id || !form.amount || createPledge.isPending} className="w-full gradient-warm text-primary-foreground">
              Create Pledge
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
