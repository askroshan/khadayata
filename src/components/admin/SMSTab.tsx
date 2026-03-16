import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Users, CircleCheck as CheckCircle, Circle as XCircle, Clock, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SmsMessage {
  id: string;
  recipient_phone: string;
  body: string;
  status: string;
  sent_at: string | null;
  error: string | null;
  created_at: string;
}

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

export default function SMSTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [singlePhone, setSinglePhone] = useState("");
  const [singleCountryCode, setSingleCountryCode] = useState("1");
  const [singleBody, setSingleBody] = useState("");
  const [blastGroupId, setBlastGroupId] = useState("");
  const [blastCampaignName, setBlastCampaignName] = useState("");
  const [blastBody, setBlastBody] = useState("");

  const { data: history } = useQuery({
    queryKey: ["sms-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sms_messages")
        .select("id, recipient_phone, body, status, sent_at, error, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as SmsMessage[];
    },
    enabled: !!user,
  });

  const sendSingle = useMutation({
    mutationFn: async () => {
      if (!singlePhone.trim() || !singleBody.trim()) throw new Error("Phone and message are required");
      const token = await getToken();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          to: singlePhone.trim(),
          body: singleBody.trim(),
          country_code: singleCountryCode.trim() || "1",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send SMS");
      return json;
    },
    onSuccess: () => {
      toast({ title: "SMS sent successfully" });
      setSinglePhone("");
      setSingleBody("");
      queryClient.invalidateQueries({ queryKey: ["sms-history"] });
    },
    onError: (err: Error) => toast({ title: "Failed to send", description: err.message, variant: "destructive" }),
  });

  const sendCampaign = useMutation({
    mutationFn: async () => {
      if (!blastGroupId.trim() || !blastBody.trim()) throw new Error("Group ID and message are required");
      const token = await getToken();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms-campaign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          group_id: blastGroupId.trim(),
          message: blastBody.trim(),
          campaign_name: blastCampaignName.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send campaign");
      return json;
    },
    onSuccess: () => {
      toast({ title: "Campaign sent via Easify" });
      setBlastGroupId("");
      setBlastCampaignName("");
      setBlastBody("");
      queryClient.invalidateQueries({ queryKey: ["sms-history"] });
    },
    onError: (err: Error) => toast({ title: "Campaign failed", description: err.message, variant: "destructive" }),
  });

  const statusIcon = (status: string) => {
    if (status === "sent") return <CheckCircle className="w-3.5 h-3.5 text-success" />;
    if (status === "failed") return <XCircle className="w-3.5 h-3.5 text-destructive" />;
    return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-blue-600" />
        <div>
          <h2 className="text-base font-display font-semibold">SMS Alerts</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Send SMS alerts and blasts via Easify from +1 (682) 432-9400.</p>
        </div>
      </div>

      <Card className="shadow-card border-blue-200/50 bg-blue-50/30">
        <CardContent className="p-4 flex gap-3">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-700">
            Requires <strong>EASIFY_API_TOKEN</strong> configured in Supabase secrets (Settings &rarr; API Settings in your Easify dashboard).
            Messages are sent from <strong>+1 (682) 432-9400</strong>.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="single">
        <TabsList>
          <TabsTrigger value="single">Single Message</TabsTrigger>
          <TabsTrigger value="blast">
            <Users className="w-3.5 h-3.5 mr-1" /> Campaign Blast
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-sm font-display">Send to Single Recipient</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="w-24">
                  <Label htmlFor="single-cc">Country Code</Label>
                  <Input
                    id="single-cc"
                    value={singleCountryCode}
                    onChange={(e) => setSingleCountryCode(e.target.value)}
                    placeholder="1"
                    className="mt-1"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="single-phone">Phone Number (digits only) *</Label>
                  <Input
                    id="single-phone"
                    value={singlePhone}
                    onChange={(e) => setSinglePhone(e.target.value)}
                    placeholder="9876543210"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="single-body">Message *</Label>
                <Textarea
                  id="single-body"
                  value={singleBody}
                  onChange={(e) => setSingleBody(e.target.value)}
                  placeholder="Enter your message..."
                  maxLength={160}
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">{singleBody.length}/160</p>
              </div>
              <Button
                onClick={() => sendSingle.mutate()}
                disabled={!singlePhone.trim() || !singleBody.trim() || sendSingle.isPending}
                className="gradient-hero text-primary-foreground"
              >
                <Send className="w-4 h-4 mr-1" /> {sendSingle.isPending ? "Sending..." : "Send SMS"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blast" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Send Campaign to Easify Contact Group
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="blast-group">Easify Contact Group ID *</Label>
                <Input
                  id="blast-group"
                  value={blastGroupId}
                  onChange={(e) => setBlastGroupId(e.target.value)}
                  placeholder="e.g. 12345"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Find this in your Easify dashboard under Contact Groups.</p>
              </div>
              <div>
                <Label htmlFor="blast-name">Campaign Name (optional)</Label>
                <Input
                  id="blast-name"
                  value={blastCampaignName}
                  onChange={(e) => setBlastCampaignName(e.target.value)}
                  placeholder="e.g. Diwali Announcement 2026"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="blast-body">Message *</Label>
                <Textarea
                  id="blast-body"
                  value={blastBody}
                  onChange={(e) => setBlastBody(e.target.value)}
                  placeholder="Urgent community announcement..."
                  maxLength={160}
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">{blastBody.length}/160</p>
              </div>
              <Button
                onClick={() => sendCampaign.mutate()}
                disabled={!blastGroupId.trim() || !blastBody.trim() || sendCampaign.isPending}
                className="gradient-hero text-primary-foreground"
              >
                <Send className="w-4 h-4 mr-1" />
                {sendCampaign.isPending ? "Sending Campaign..." : "Send Campaign"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-2">
          {!history?.length ? (
            <Card className="shadow-card">
              <CardContent className="py-10 text-center text-muted-foreground text-sm">No SMS messages sent yet.</CardContent>
            </Card>
          ) : (
            history.map((m) => (
              <div key={m.id} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0 text-sm">
                <div className="mt-0.5">{statusIcon(m.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.recipient_phone}</span>
                    <Badge variant="outline" className="text-xs capitalize">{m.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{m.body}</p>
                  {m.error && <p className="text-xs text-destructive mt-0.5">{m.error}</p>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {m.sent_at
                    ? formatDistanceToNow(new Date(m.sent_at), { addSuffix: true })
                    : formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                </span>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
