import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMember } from "@/hooks/useMember";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Bell, Shield, Eye, Key } from "lucide-react";
import { useState, useEffect } from "react";
import { VerificationCenter } from "@/components/verification/VerificationCenter";
import { ConsentCenter } from "@/components/consent/ConsentCenter";

const PRIVACY_LEVELS = ["public", "members", "chapter", "private"] as const;
const PRIVACY_FIELDS = ["dob", "phone", "email", "birth_place", "employment"] as const;
const VALID_TABS = ["privacy", "verification", "consent", "notifications", "account"] as const;
type Tab = (typeof VALID_TABS)[number];

export default function Settings() {
  const { user, loading } = useAuth();
  const { member } = useMember();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab") as Tab | null;
  const activeTab: Tab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : "privacy";

  const [privacy, setPrivacy] = useState<Record<string, string>>({});
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [notifLocal, setNotifLocal] = useState<{ email_enabled: boolean; whatsapp_enabled: boolean; push_enabled: boolean; chapter_notifications_enabled: boolean } | null>(null);

  const { data: notifPrefs } = useQuery({
    queryKey: ["notif-prefs"],
    queryFn: async () => {
      if (!member) return null;
      const { data } = await supabase.from("notification_preferences").select("*").eq("member_id", member.id).maybeSingle();
      return data;
    },
    enabled: !!member,
  });

  useEffect(() => {
    if (member) {
      setPrivacy((member.privacy as Record<string, string>) ?? {});
    }
  }, [member?.id]);

  useEffect(() => {
    if (!notifLocal) {
      setNotifLocal({
        email_enabled: notifPrefs?.email_enabled ?? true,
        whatsapp_enabled: notifPrefs?.whatsapp_enabled ?? false,
        push_enabled: notifPrefs?.push_enabled ?? false,
        chapter_notifications_enabled: notifPrefs?.chapter_notifications_enabled ?? true,
      });
    }
  }, [notifPrefs?.email_enabled, notifPrefs?.whatsapp_enabled, notifPrefs?.push_enabled]);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  const savePrivacy = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error("Not a member");
      const { error } = await supabase
        .from("members")
        .update({ privacy })
        .eq("user_id", member.user_id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Privacy settings saved!" });
      queryClient.invalidateQueries({ queryKey: ["member"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const saveNotifPrefs = useMutation({
    mutationFn: async (prefs: { email_enabled: boolean; whatsapp_enabled: boolean; push_enabled: boolean; chapter_notifications_enabled: boolean }) => {
      if (!member) throw new Error("Not a member");
      const { error } = await supabase.from("notification_preferences").upsert({
        member_id: member.id,
        ...prefs,
      }, { onConflict: "member_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Notification preferences saved!" }); queryClient.invalidateQueries({ queryKey: ["notif-prefs"] }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 8) throw new Error("Password must be at least 8 characters.");
      if (!PASSWORD_REGEX.test(newPassword)) throw new Error("Password must contain at least one uppercase letter, one number, and one special character.");
      if (newPassword !== confirmPassword) throw new Error("Passwords do not match.");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Password updated successfully!" });
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
    },
    onError: (err: Error) => {
      setPasswordError(err.message);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppLayout title="Settings">
      <div className="space-y-6">
        <div className="gradient-hero p-6 sm:p-8 text-primary-foreground">
          <h1 className="text-xl sm:text-3xl font-display font-bold">Settings & Privacy</h1>
          <p className="text-primary-foreground/70 mt-1 text-sm">Privacy controls, verification, consent, and notifications</p>
        </div>

        <div className="px-3 sm:px-6 pb-6 max-w-2xl">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-4 flex-wrap h-auto gap-1">
              <TabsTrigger value="privacy"><Eye className="w-3.5 h-3.5 mr-1" />Privacy</TabsTrigger>
              <TabsTrigger value="verification"><Shield className="w-3.5 h-3.5 mr-1" />Verification</TabsTrigger>
              <TabsTrigger value="consent"><Shield className="w-3.5 h-3.5 mr-1" />Consent & Data</TabsTrigger>
              <TabsTrigger value="notifications"><Bell className="w-3.5 h-3.5 mr-1" />Notifications</TabsTrigger>
              <TabsTrigger value="account"><Key className="w-3.5 h-3.5 mr-1" />Account</TabsTrigger>
            </TabsList>

            <TabsContent value="privacy" className="space-y-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2"><Eye className="w-5 h-5 text-primary" />Field-Level Privacy</CardTitle>
                  <CardDescription>Control who can see each piece of your information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {PRIVACY_FIELDS.map((field) => (
                    <div key={field} className="flex items-center justify-between select-none" onMouseDown={(e) => { if ((e.target as HTMLElement).closest('[role="combobox"]')) e.preventDefault(); }}>
                      <Label className="capitalize select-none">{field.replace("_", " ")}</Label>
                      <Select value={privacy[field] || "members"} onValueChange={(val) => setPrivacy({ ...privacy, [field]: val })}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PRIVACY_LEVELS.map((l) => <SelectItem key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  <Button onClick={() => savePrivacy.mutate()} disabled={savePrivacy.isPending} className="gradient-warm text-primary-foreground">
                    Save Privacy Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="verification">
              <VerificationCenter />
            </TabsContent>

            <TabsContent value="consent">
              <ConsentCenter />
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2"><Bell className="w-5 h-5 text-primary" />Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Email notifications</Label>
                    <Switch checked={notifLocal?.email_enabled ?? notifPrefs?.email_enabled ?? true} onCheckedChange={(v) => setNotifLocal(p => ({ ...p ?? { email_enabled: true, whatsapp_enabled: false, push_enabled: false, chapter_notifications_enabled: true }, email_enabled: v }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Chapter event notifications</Label>
                    <Switch checked={notifLocal?.chapter_notifications_enabled ?? notifPrefs?.chapter_notifications_enabled ?? true} onCheckedChange={(v) => setNotifLocal(p => ({ ...p ?? { email_enabled: true, whatsapp_enabled: false, push_enabled: false, chapter_notifications_enabled: true }, chapter_notifications_enabled: v }))} />
                  </div>
                  <p className="text-xs text-muted-foreground -mt-2">Get emailed when your chapter posts or updates events. Turn off to silence chapter event emails only.</p>
                  <div className="flex items-center justify-between">
                    <Label>WhatsApp notifications</Label>
                    <Switch checked={notifLocal?.whatsapp_enabled ?? notifPrefs?.whatsapp_enabled ?? false} onCheckedChange={(v) => setNotifLocal(p => ({ ...p ?? { email_enabled: true, whatsapp_enabled: false, push_enabled: false, chapter_notifications_enabled: true }, whatsapp_enabled: v }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Push notifications</Label>
                    <Switch checked={notifLocal?.push_enabled ?? notifPrefs?.push_enabled ?? false} onCheckedChange={(v) => setNotifLocal(p => ({ ...p ?? { email_enabled: true, whatsapp_enabled: false, push_enabled: false, chapter_notifications_enabled: true }, push_enabled: v }))} />
                  </div>
                  <Button
                    onClick={() => notifLocal && saveNotifPrefs.mutate(notifLocal)}
                    disabled={saveNotifPrefs.isPending || !notifLocal}
                    className="gradient-warm text-primary-foreground"
                  >
                    Save Preferences
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="account" className="space-y-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2"><Key className="w-5 h-5 text-primary" />Change Password</CardTitle>
                  <CardDescription>Must be at least 8 characters with one uppercase letter, one number, and one special character.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }}
                      className={passwordError ? "border-destructive" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm New Password</Label>
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }}
                      className={passwordError ? "border-destructive" : ""}
                    />
                  </div>
                  {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className={newPassword.length >= 8 ? "text-success" : ""}>• At least 8 characters</p>
                    <p className={/[A-Z]/.test(newPassword) ? "text-success" : ""}>• At least one uppercase letter</p>
                    <p className={/[0-9]/.test(newPassword) ? "text-success" : ""}>• At least one number</p>
                    <p className={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword) ? "text-success" : ""}>• At least one special character</p>
                  </div>
                  <Button
                    onClick={() => changePassword.mutate()}
                    disabled={changePassword.isPending || !newPassword}
                    className="gradient-warm text-primary-foreground"
                  >
                    Update Password
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
