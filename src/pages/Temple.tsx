import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMember } from "@/hooks/useMember";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Heart, DollarSign, RefreshCw, Star } from "lucide-react";
import { useState, useEffect } from "react";
import heroTemple from "@/assets/hero-temple.jpg";
import diyaLamp from "@/assets/diya-lamp.png";
import { LiveAartiPlayer } from "@/components/temple/LiveAartiPlayer";
import { usePermissions } from "@/hooks/useRoles";

const PAYMENT_METHODS = ["UPI", "Bank Transfer", "Cash", "Card", "Cheque", "Online"];
const CURRENCIES = ["INR", "USD", "GBP", "AED", "SGD", "AUD"];
const DONATION_TYPES = [
  { value: "one_time", label: "One Time" },
  { value: "recurring", label: "Recurring (Masik Sahayog)" },
];
const RECURRING_INTERVALS = ["weekly", "monthly", "quarterly", "yearly"];

const QUICK_AMOUNTS: Record<string, string[]> = {
  INR: ["100", "500", "1000", "5000"],
  USD: ["5", "25", "50", "200"],
  GBP: ["5", "20", "50", "200"],
  AED: ["20", "100", "200", "750"],
  SGD: ["10", "50", "100", "500"],
  AUD: ["10", "50", "100", "500"],
};

const SEVA_THRESHOLDS = [
  { min: 100000, label: "Maha Patron", color: "bg-gold text-primary-foreground", icon: "✦" },
  { min: 10000, label: "Dharmaada Patron", color: "bg-primary/20 text-primary", icon: "◆" },
  { min: 1000, label: "Sahayogi", color: "bg-secondary/20 text-secondary-foreground", icon: "●" },
  { min: 0, label: "Donor", color: "bg-muted text-muted-foreground", icon: "○" },
];

function getSevaLevel(totalAmount: number) {
  return SEVA_THRESHOLDS.find(t => totalAmount >= t.min) ?? SEVA_THRESHOLDS[SEVA_THRESHOLDS.length - 1];
}

interface FormErrors {
  selectedFund?: string;
  amount?: string;
  donor_email?: string;
  donor_phone?: string;
  donor_address?: string;
  payment_method?: string;
}

export default function Temple() {
  const { user, loading } = useAuth();
  const { member } = useMember();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canViewAllDonations } = usePermissions();

  const [donation, setDonation] = useState({
    amount: "", selectedFund: "", donorWall: false,
    donor_name: "", donor_email: "", donor_phone: "", donor_address: "",
    pan_number: "", payment_method: "", notes: "",
    type: "one_time", recurring_interval: "",
    currency: "INR",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (member) {
      setDonation(prev => ({
        ...prev,
        donor_name: prev.donor_name || `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim(),
        donor_email: prev.donor_email || (((member as Record<string, unknown>).email as string) ?? ""),
      }));
    }
  }, [member?.id]);

  const { data: funds } = useQuery({
    queryKey: ["funds"],
    queryFn: async () => {
      const { data } = await supabase.from("funds").select("*").eq("active", true);
      return data ?? [];
    },
  });

  const { data: myDonations } = useQuery({
    queryKey: ["my-donations"],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase.from("donations").select("*, funds(name)").eq("member_id", member.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!member,
  });

  const { data: donorWallList } = useQuery({
    queryKey: ["donor-wall"],
    queryFn: async () => {
      const { data } = await supabase
        .from("donations")
        .select("amount, currency, donor_name, members(first_name, last_name)")
        .eq("donor_wall_opt_in", true)
        .eq("status", "succeeded")
        .order("amount", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["temple-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("*").eq("key", "temple_aarti_schedule").maybeSingle();
      return data?.value as { morning?: string; evening?: string; stream_url?: string } | null;
    },
  });

  const { data: memberTotalDonations } = useQuery({
    queryKey: ["member-total-donations", member?.id],
    queryFn: async () => {
      if (!member) return 0;
      const { data } = await supabase.from("donations").select("amount").eq("member_id", member.id).eq("status", "succeeded").eq("currency", "INR");
      return (data ?? []).reduce((sum, d) => sum + Number(d.amount), 0);
    },
    enabled: !!member,
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!donation.selectedFund) newErrors.selectedFund = "Please select a fund";
    if (!donation.amount || parseFloat(donation.amount) <= 0) newErrors.amount = "Please enter a valid amount";
    if (!donation.donor_email.trim()) newErrors.donor_email = "Email is required for 80G receipt";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donation.donor_email.trim())) newErrors.donor_email = "Please enter a valid email address";
    if (!donation.donor_phone.trim()) newErrors.donor_phone = "Phone number is required";
    if (!donation.donor_address.trim()) newErrors.donor_address = "Address is required";
    if (!donation.payment_method) newErrors.payment_method = "Please select a payment method";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const donate = useMutation({
    mutationFn: async () => {
      if (!member || !donation.selectedFund || !donation.amount) throw new Error("Missing data");
      const { error } = await supabase.from("donations").insert({
        fund_id: donation.selectedFund,
        member_id: member.id,
        amount: parseFloat(donation.amount),
        currency: donation.currency,
        type: donation.type,
        provider: "manual",
        status: "succeeded",
        donor_wall_opt_in: donation.donorWall,
        donor_name: donation.donor_name.trim() || `${member.first_name} ${member.last_name}`,
        donor_email: donation.donor_email.trim(),
        donor_phone: donation.donor_phone.trim(),
        donor_address: donation.donor_address.trim(),
        pan_number: donation.pan_number.trim() || null,
        payment_method: donation.payment_method,
        notes: donation.notes.trim() || null,
        recurring_interval: donation.type === "recurring" ? (donation.recurring_interval || "monthly") : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Donation recorded! Thank you for your generosity." });
      setDonation(prev => ({
        amount: "",
        selectedFund: "",
        donorWall: false,
        donor_name: `${member?.first_name ?? ""} ${member?.last_name ?? ""}`.trim(),
        donor_email: (member as Record<string, unknown>)?.email as string ?? "",
        donor_phone: "",
        donor_address: "",
        pan_number: "",
        payment_method: "",
        notes: "",
        type: "one_time",
        recurring_interval: "",
        currency: prev.currency,
      }));
      setErrors({});
      queryClient.invalidateQueries({ queryKey: ["my-donations"] });
      queryClient.invalidateQueries({ queryKey: ["donor-wall"] });
      queryClient.invalidateQueries({ queryKey: ["member-total-donations", member?.id] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleDonate = () => {
    if (validateForm()) {
      donate.mutate();
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const sevaLevel = getSevaLevel(memberTotalDonations ?? 0);
  const quickAmounts = QUICK_AMOUNTS[donation.currency] ?? QUICK_AMOUNTS["INR"];

  return (
    <AppLayout title="Kotyark Temple">
      <div className="space-y-6">
        <div className="relative h-64 overflow-hidden">
          <img src={heroTemple} alt="Kotyark Temple" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8">
            <div className="flex items-end gap-3 sm:gap-4">
              <img src={diyaLamp} alt="" className="w-10 sm:w-14 h-10 sm:h-14 drop-shadow-lg" aria-hidden="true" />
              <div>
                <h1 className="text-xl sm:text-3xl font-display font-bold text-primary-foreground">Kotyark Temple</h1>
                <p className="text-primary-foreground/70">Sacred heritage • Live Aarti • Donations</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-3 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-6">
          <LiveAartiPlayer schedule={settings ?? null} />

          {/* Seva Points Card */}
          {(memberTotalDonations ?? 0) > 0 && (
            <Card className="shadow-card border-gold/30 bg-gradient-to-r from-gold/5 to-primary/5">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full ${sevaLevel.color} flex items-center justify-center text-xl font-bold`}>{sevaLevel.icon}</div>
                <div>
                  <p className="font-display font-semibold">{sevaLevel.label}</p>
                  <p className="text-xs text-muted-foreground">Total contributed: INR {(memberTotalDonations ?? 0).toLocaleString()}</p>
                </div>
                <div className="ml-auto">
                  <Star className="w-5 h-5 text-gold" />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Donation Form */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />Make a Donation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Fund *</Label>
                  <Select value={donation.selectedFund} onValueChange={v => { setDonation({...donation, selectedFund: v}); setErrors({...errors, selectedFund: ""}); }}>
                    <SelectTrigger className={errors.selectedFund ? "border-destructive" : ""}><SelectValue placeholder="Select fund" /></SelectTrigger>
                    <SelectContent>{funds?.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {errors.selectedFund && <p className="text-xs text-destructive mt-1">{errors.selectedFund}</p>}
                </div>

                <div>
                  <Label>Currency</Label>
                  <Select value={donation.currency} onValueChange={v => setDonation({...donation, currency: v, amount: ""})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map(v => (
                    <Button key={v} variant={donation.amount === v ? "default" : "outline"} size="sm"
                      onClick={() => { setDonation({...donation, amount: v}); setErrors({...errors, amount: ""}); }}
                      className={donation.amount === v ? "gradient-warm text-primary-foreground" : ""}>
                      {donation.currency === "INR" ? "₹" : donation.currency}{v}
                    </Button>
                  ))}
                </div>

                <div>
                  <Label>Amount *</Label>
                  <Input type="number" placeholder="Custom amount"
                    value={donation.amount}
                    onChange={e => { setDonation({...donation, amount: e.target.value}); setErrors({...errors, amount: ""}); }}
                    min="1"
                    className={errors.amount ? "border-destructive" : ""}
                  />
                  {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount}</p>}
                </div>

                <div>
                  <Label>Donation Type</Label>
                  <Select value={donation.type} onValueChange={v => setDonation({...donation, type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DONATION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {donation.type === "recurring" && (
                  <div>
                    <Label>Recurring Interval</Label>
                    <Select value={donation.recurring_interval} onValueChange={v => setDonation({...donation, recurring_interval: v})}>
                      <SelectTrigger><SelectValue placeholder="Select interval" /></SelectTrigger>
                      <SelectContent>{RECURRING_INTERVALS.map(i => <SelectItem key={i} value={i} className="capitalize">{i}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Donor Name</Label>
                    <Input value={donation.donor_name}
                      onChange={e => setDonation({...donation, donor_name: e.target.value})}
                      placeholder={`${member?.first_name ?? ""} ${member?.last_name ?? ""}`} />
                  </div>
                  <div>
                    <Label>Email * <span className="text-xs text-muted-foreground">(required for 80G)</span></Label>
                    <Input type="email" value={donation.donor_email}
                      onChange={e => { setDonation({...donation, donor_email: e.target.value}); setErrors({...errors, donor_email: ""}); }}
                      className={errors.donor_email ? "border-destructive" : ""}
                    />
                    {errors.donor_email && <p className="text-xs text-destructive mt-1">{errors.donor_email}</p>}
                  </div>
                  <div>
                    <Label>Phone *</Label>
                    <Input value={donation.donor_phone}
                      onChange={e => { setDonation({...donation, donor_phone: e.target.value}); setErrors({...errors, donor_phone: ""}); }}
                      placeholder="+91..."
                      className={errors.donor_phone ? "border-destructive" : ""}
                    />
                    {errors.donor_phone && <p className="text-xs text-destructive mt-1">{errors.donor_phone}</p>}
                  </div>
                  <div>
                    <Label>PAN Number</Label>
                    <Input value={donation.pan_number}
                      onChange={e => setDonation({...donation, pan_number: e.target.value.toUpperCase()})}
                      placeholder="e.g. ABCDE1234F"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div>
                  <Label>Address *</Label>
                  <Input value={donation.donor_address}
                    onChange={e => { setDonation({...donation, donor_address: e.target.value}); setErrors({...errors, donor_address: ""}); }}
                    className={errors.donor_address ? "border-destructive" : ""}
                  />
                  {errors.donor_address && <p className="text-xs text-destructive mt-1">{errors.donor_address}</p>}
                </div>

                <div>
                  <Label>Payment Method *</Label>
                  <Select value={donation.payment_method} onValueChange={v => { setDonation({...donation, payment_method: v}); setErrors({...errors, payment_method: ""}); }}>
                    <SelectTrigger className={errors.payment_method ? "border-destructive" : ""}><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                  {errors.payment_method && <p className="text-xs text-destructive mt-1">{errors.payment_method}</p>}
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea value={donation.notes}
                    onChange={e => setDonation({...donation, notes: e.target.value})}
                    rows={2}
                    placeholder="Purpose, dedication, special instructions..."
                    maxLength={1000}
                  />
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input type="checkbox" checked={donation.donorWall} onChange={e => setDonation({...donation, donorWall: e.target.checked})} className="rounded" />
                  Show my name on the Dharmaada Patron Wall
                </label>

                <Button onClick={handleDonate} disabled={donate.isPending} className="w-full gradient-warm text-primary-foreground shadow-glow" aria-label="Donate">
                  {donate.isPending ? "Processing..." : "Donate"}
                  <span aria-hidden="true"> 🙏</span>
                </Button>
              </CardContent>
            </Card>

            {/* Donor Wall */}
            <Card className="shadow-card overflow-hidden">
              <div className="gradient-jewel p-4">
                <h3 className="font-display font-semibold text-primary-foreground flex items-center gap-2">
                  <Heart className="w-5 h-5 fill-current" aria-hidden="true" /> Dharmaada Patron Wall
                </h3>
                <p className="text-xs text-primary-foreground/70 mt-0.5">Recognizing our generous community donors</p>
                <p className="text-xs text-primary-foreground/50 mt-1">Check "Show on donor wall" when donating to appear here</p>
              </div>
              <CardContent className="p-4">
                {donorWallList?.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" aria-hidden="true" />
                    <p className="text-muted-foreground text-sm">Be the first Dharmaada Patron!</p>
                    <p className="text-xs text-muted-foreground mt-1">Enable "Show on donor wall" when making a donation</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {donorWallList?.map((d, i) => {
                      const amt = Number(d.amount);
                      const tier = getSevaLevel(amt);
                      return (
                        <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 border border-border text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-gold text-primary-foreground" : i === 1 ? "bg-muted-foreground/40 text-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                            <div>
                              <p>{d.donor_name || `${(d.members as { first_name: string; last_name: string } | null)?.first_name ?? ""} ${(d.members as { first_name: string; last_name: string } | null)?.last_name ?? ""}`}</p>
                              <Badge className={`text-[10px] border-0 ${tier.color}`}>{tier.label}</Badge>
                            </div>
                          </div>
                          <Badge variant="outline" className="font-mono text-xs">{d.currency} {Number(d.amount).toLocaleString()}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* My Donations / Chapter Ledger */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display">{canViewAllDonations ? "Donation Ledger" : "My Donations"}</CardTitle>
            </CardHeader>
            <CardContent>
              {canViewAllDonations ? (
                <ChapterDonationLedger />
              ) : (
                <>
                  {myDonations?.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No donations yet</p>
                  ) : (
                    <div className="space-y-2">
                      {myDonations?.map((d) => (
                        <DonationRow key={d.id} d={d} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function DonationRow({ d }: { d: Record<string, unknown> }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/30 border border-border text-sm">
      <div>
        <p className="font-medium">{(d.funds as { name: string } | null)?.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span>{new Date(d.created_at as string).toLocaleDateString()}</span>
          {d.payment_method && <span>• {d.payment_method as string}</span>}
          {d.donor_name && <span>• {d.donor_name as string}</span>}
          {d.type === "recurring" && (
            <Badge variant="outline" className="text-[10px]">
              <RefreshCw className="w-2.5 h-2.5 mr-0.5" aria-hidden="true" />{d.recurring_interval as string}
            </Badge>
          )}
        </div>
      </div>
      <div className="text-right">
        <Badge variant={(d.status as string) === "succeeded" ? "default" : "secondary"} className="capitalize">{d.status as string}</Badge>
        <p className="font-semibold mt-0.5">{d.currency as string} {Number(d.amount).toLocaleString()}</p>
      </div>
    </div>
  );
}

function ChapterDonationLedger() {
  const [search, setSearch] = useState("");
  const [fundFilter, setFundFilter] = useState("__all__");

  const { data: allDonations } = useQuery({
    queryKey: ["all-donations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("donations")
        .select("*, funds(name), members(first_name, last_name)")
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const { data: funds } = useQuery({
    queryKey: ["funds"],
    queryFn: async () => {
      const { data } = await supabase.from("funds").select("*").eq("active", true);
      return data ?? [];
    },
  });

  const filtered = (allDonations ?? []).filter(d => {
    const fund = d.funds as { name: string } | null;
    const member = d.members as { first_name: string; last_name: string } | null;
    const matchSearch = !search || (d.donor_name as string ?? "").toLowerCase().includes(search.toLowerCase()) ||
      `${member?.first_name ?? ""} ${member?.last_name ?? ""}`.toLowerCase().includes(search.toLowerCase()) ||
      (fund?.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchFund = fundFilter === "__all__" || d.fund_id === fundFilter;
    return matchSearch && matchFund;
  });

  const totalAmount = filtered.filter(d => d.status === "succeeded").reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="Search donor or fund..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1" />
        <Select value={fundFilter} onValueChange={setFundFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Funds</SelectItem>
            {funds?.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{filtered.length} transactions</span>
        <span className="font-semibold">Total: INR {totalAmount.toLocaleString()}</span>
      </div>
      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-4">No donations found</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => <DonationRow key={d.id as string} d={d as Record<string, unknown>} />)}
        </div>
      )}
    </div>
  );
}
