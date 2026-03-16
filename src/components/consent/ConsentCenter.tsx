import { useMember } from "@/hooks/useMember";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Cookie, FileText, Download, Trash2, Clock, CircleCheck as CheckCircle } from "lucide-react";
import { useState } from "react";

const CONSENT_CONTEXTS = [
  { key: "cookie_consent", label: "Cookie & Analytics", desc: "Allow usage tracking and analytics cookies" },
  { key: "directory_visibility", label: "Directory Visibility", desc: "Appear in the global member directory" },
  { key: "matrimonial_display", label: "Matrimonial Display", desc: "Show profile in matrimonial listings" },
  { key: "photo_tagging", label: "Photo Tagging", desc: "Allow others to tag you in event photos" },
  { key: "marketing_emails", label: "Marketing Communications", desc: "Receive newsletters and promotional content" },
];

export function ConsentCenter() {
  const { member } = useMember();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: consents } = useQuery({
    queryKey: ["my-consents-all", member?.id],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase
        .from("consents")
        .select("*")
        .eq("member_id", member.id)
        .order("captured_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!member,
  });

  const { data: dataRequests } = useQuery({
    queryKey: ["data-requests", member?.id],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase
        .from("data_requests")
        .select("*")
        .eq("member_id", member.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!member,
  });

  // Get latest consent status per context
  const getConsentStatus = (context: string) => {
    const latest = consents?.find((c) => c.context === context);
    if (!latest) return false;
    const payload = latest.payload as { accepted?: boolean } | null;
    return payload?.accepted ?? false;
  };

  const detectedRegion = (() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes("Europe")) return "EU";
    if (tz.includes("Asia/Kolkata") || tz.includes("Asia/Calcutta")) return "IN";
    return "US";
  })();

  const toggleConsent = useMutation({
    mutationFn: async ({ context, accepted }: { context: string; accepted: boolean }) => {
      if (!member) throw new Error("Not a member");
      const { error } = await supabase.from("consents").insert({
        member_id: member.id,
        context,
        policy_version: "1.0",
        region: detectedRegion,
        payload: { accepted, timestamp: new Date().toISOString() },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-consents-all"] });
      toast({ title: "Consent preference updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const requestExport = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error("Not a member");
      const { error } = await supabase.from("data_requests").insert({ member_id: member.id, type: "export" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Data export request submitted!" });
      queryClient.invalidateQueries({ queryKey: ["data-requests"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const requestDeletion = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error("Not a member");
      const { error } = await supabase.from("data_requests").insert({ member_id: member.id, type: "deletion" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Deletion request submitted. We'll process it within the required timeframe." });
      queryClient.invalidateQueries({ queryKey: ["data-requests"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      {/* Region detection */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Privacy Compliance
          </CardTitle>
          <CardDescription>
            Your detected region: <Badge variant="outline" className="ml-1">{detectedRegion === "EU" ? "GDPR (EU)" : detectedRegion === "IN" ? "DPDP Act (India)" : "US Privacy Laws"}</Badge>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Consent toggles */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Cookie className="w-5 h-5 text-primary" /> Consent Preferences
          </CardTitle>
          <CardDescription>Manage what data processing you consent to</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {CONSENT_CONTEXTS.map((ctx) => {
            const isAccepted = getConsentStatus(ctx.key);
            return (
              <div key={ctx.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <Label className="font-medium">{ctx.label}</Label>
                  <p className="text-xs text-muted-foreground">{ctx.desc}</p>
                </div>
                <Switch
                  checked={isAccepted}
                  onCheckedChange={(checked) => toggleConsent.mutate({ context: ctx.key, accepted: checked })}
                  disabled={toggleConsent.isPending}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Data rights */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Data Rights
          </CardTitle>
          <CardDescription>Exercise your privacy rights under GDPR / DPDP Act</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Export my data</p>
              <p className="text-xs text-muted-foreground">Download all personal data in machine-readable format</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => requestExport.mutate()} disabled={requestExport.isPending}>
              <Download className="w-3.5 h-3.5 mr-1" /> Request Export
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-destructive">Delete my account</p>
              <p className="text-xs text-muted-foreground">Permanently erase all personal data</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm("Are you sure? This action is irreversible. All your data will be permanently deleted.")) {
                  requestDeletion.mutate();
                }
              }}
              disabled={requestDeletion.isPending}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Request Deletion
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Request history */}
      {dataRequests && dataRequests.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Request History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dataRequests.map((dr) => (
                <div key={dr.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    {dr.status === "completed" ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    <span className="capitalize">{dr.type}</span>
                    <span className="text-muted-foreground text-xs">{new Date(dr.created_at).toLocaleDateString()}</span>
                  </div>
                  <Badge variant={dr.status === "completed" ? "default" : "secondary"} className="capitalize text-xs">
                    {dr.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consent audit log */}
      {consents && consents.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">Consent Audit Log</CardTitle>
            <CardDescription>Full history of your consent decisions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {consents.map((c) => {
                const payload = c.payload as { accepted?: boolean } | null;
                return (
                  <div key={c.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
                    <span className="capitalize">{c.context.replace("_", " ")}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={payload?.accepted ? "default" : "secondary"} className="text-[10px]">
                        {payload?.accepted ? "Accepted" : "Declined"}
                      </Badge>
                      <span className="text-muted-foreground">{new Date(c.captured_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
