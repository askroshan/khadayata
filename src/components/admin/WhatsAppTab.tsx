import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNITY_FULL_NAME } from "@/lib/community";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MessageSquare, Send, Plus, Clock, CircleCheck as CheckCircle, Circle as XCircle, ChevronRight, Users, Pencil, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Template {
  id: string;
  name: string;
  language: string;
  category: string;
  header_text: string | null;
  body_text: string;
  footer_text: string | null;
  status: string;
  created_at: string;
}

interface WaMessage {
  id: string;
  recipient_phone: string;
  status: string;
  sent_at: string | null;
  error: string | null;
  created_at: string;
  template: { name: string } | null;
}

export default function WhatsAppTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [sendOpen, setSendOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [params, setParams] = useState<Record<string, string>>({});
  const [bulkMode, setBulkMode] = useState(false);

  const [newTemplate, setNewTemplate] = useState({
    name: "", language: "en", category: "UTILITY", header_text: "", body_text: "", footer_text: "",
  });
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);

  const { data: templates } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .order("created_at", { ascending: false });
      return (data ?? []) as Template[];
    },
    enabled: !!user,
  });

  const { data: messages } = useQuery({
    queryKey: ["whatsapp-messages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_messages")
        .select("id, recipient_phone, status, sent_at, error, created_at, template:whatsapp_templates(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as WaMessage[];
    },
    enabled: !!user,
  });

  const { data: members } = useQuery({
    queryKey: ["whatsapp-member-phones"],
    queryFn: async () => {
      const { data } = await supabase
        .from("members")
        .select("id, first_name, last_name, member_contacts(value)")
        .eq("onboarding_completed", true)
        .not("member_contacts.value", "is", null)
        .limit(200);
      return (data ?? []).map((m) => {
        const contacts = (m.member_contacts ?? []) as { value: string | null }[];
        return {
          id: m.id,
          first_name: m.first_name,
          last_name: m.last_name,
          phone: contacts.find((c) => c.value)?.value ?? null,
        };
      });
    },
    enabled: !!user && bulkMode,
  });

  const updateTemplate = useMutation({
    mutationFn: async () => {
      if (!editTemplate) return;
      const { error } = await supabase.from("whatsapp_templates").update({
        name: editTemplate.name.trim().toLowerCase().replace(/\s+/g, "_"),
        language: editTemplate.language,
        category: editTemplate.category,
        header_text: editTemplate.header_text?.trim() || null,
        body_text: editTemplate.body_text.trim(),
        footer_text: editTemplate.footer_text?.trim() || null,
      }).eq("id", editTemplate.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Template updated" });
      setEditTemplate(null);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Template deleted" });
      setDeleteTemplateId(null);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Message removed from history" });
      setDeleteMessageId(null);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createTemplate = useMutation({
    mutationFn: async () => {
      const { data: member } = await supabase.from("members").select("id").eq("user_id", user!.id).maybeSingle();
      const { error } = await supabase.from("whatsapp_templates").insert({
        name: newTemplate.name.trim().toLowerCase().replace(/\s+/g, "_"),
        language: newTemplate.language,
        category: newTemplate.category,
        header_text: newTemplate.header_text.trim() || null,
        body_text: newTemplate.body_text.trim(),
        footer_text: newTemplate.footer_text.trim() || null,
        status: "pending",
        created_by: member?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Template saved (pending Meta approval)" });
      setNewTemplate({ name: "", language: "en", category: "UTILITY", header_text: "", body_text: "", footer_text: "" });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const sendMessage = useMutation({
    mutationFn: async (phone: string) => {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            template_id: selectedTemplate,
            recipient_phone: phone,
            parameters: params,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send");
      return json;
    },
    onSuccess: () => {
      toast({ title: "Message sent!" });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages"] });
    },
    onError: (err: Error) => toast({ title: "Send failed", description: err.message, variant: "destructive" }),
  });

  const handleSendSingle = async () => {
    if (!recipientPhone.trim() || !selectedTemplate) return;
    await sendMessage.mutateAsync(recipientPhone.trim());
    setSendOpen(false);
    setRecipientPhone("");
    setParams({});
  };

  const handleSendBlast = async () => {
    if (!members?.length || !selectedTemplate) return;
    let sent = 0;
    for (const m of members) {
      if (m.phone) {
        try {
          await sendMessage.mutateAsync(m.phone);
          sent++;
        } catch {
          // continue
        }
      }
    }
    toast({ title: `Blast complete — ${sent} messages sent` });
    setSendOpen(false);
    setParams({});
  };

  const selectedTpl = templates?.find((t) => t.id === selectedTemplate);

  const statusIcon = (status: string) => {
    if (status === "sent") return <CheckCircle className="w-3.5 h-3.5 text-success" />;
    if (status === "failed") return <XCircle className="w-3.5 h-3.5 text-destructive" />;
    return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-display font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-green-600" /> WhatsApp Messaging
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Send WhatsApp template messages to community members.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Template
          </Button>
          <Button size="sm" className="gradient-hero text-primary-foreground" onClick={() => setSendOpen(true)}>
            <Send className="w-3.5 h-3.5 mr-1" /> Send
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">Message History</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-3 mt-3">
          {!templates?.length ? (
            <Card className="shadow-card">
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                No templates yet. Create one to get started.
              </CardContent>
            </Card>
          ) : (
            templates.map((t) => (
              <Card key={t.id} className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm font-mono">{t.name}</span>
                        <Badge variant="outline" className="text-xs">{t.category}</Badge>
                        <Badge variant="outline" className="text-xs">{t.language}</Badge>
                        <Badge
                          className={`text-xs ${t.status === "approved" ? "bg-success/20 text-success" : t.status === "rejected" ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"}`}
                        >
                          {t.status}
                        </Badge>
                      </div>
                      {t.header_text && <p className="text-xs font-semibold mt-1.5">{t.header_text}</p>}
                      <p className="text-sm mt-1 text-muted-foreground">{t.body_text}</p>
                      {t.footer_text && <p className="text-xs text-muted-foreground/60 mt-1">{t.footer_text}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Edit template" onClick={() => setEditTemplate(t)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" aria-label="Delete template" onClick={() => setDeleteTemplateId(t.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedTemplate(t.id); setSendOpen(true); }}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3 mt-3">
          {!messages?.length ? (
            <Card className="shadow-card">
              <CardContent className="py-10 text-center text-muted-foreground text-sm">No messages sent yet.</CardContent>
            </Card>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 text-sm">
                {statusIcon(m.status)}
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{m.recipient_phone}</span>
                  {m.template && <span className="text-muted-foreground ml-2 text-xs">via {(m.template as { name: string }).name}</span>}
                  {m.error && <p className="text-xs text-destructive mt-0.5 truncate">{m.error}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {m.sent_at ? formatDistanceToNow(new Date(m.sent_at), { addSuffix: true }) : "—"}
                  </span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" aria-label="Delete message" onClick={() => setDeleteMessageId(m.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Send dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Send WhatsApp Message</DialogTitle>
            <DialogDescription>Choose a template and enter recipient details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-select">Template *</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger id="template-select" className="mt-1"><SelectValue placeholder="Choose template..." /></SelectTrigger>
                <SelectContent>
                  {templates?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} — {t.category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTpl && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm">
                {selectedTpl.header_text && <p className="font-semibold text-green-800 mb-1">{selectedTpl.header_text}</p>}
                <p className="text-green-700">{selectedTpl.body_text}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setBulkMode(false)}
                className={`flex-1 text-xs py-2 rounded-lg border font-medium transition-colors ${!bulkMode ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                Single Recipient
              </button>
              <button
                onClick={() => setBulkMode(true)}
                className={`flex-1 text-xs py-2 rounded-lg border font-medium transition-colors flex items-center justify-center gap-1 ${bulkMode ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                <Users className="w-3.5 h-3.5" /> Blast All Members
              </button>
            </div>

            {!bulkMode ? (
              <div>
                <Label htmlFor="recipient-phone">Phone (with country code) *</Label>
                <Input
                  id="recipient-phone"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="mt-1"
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
                This will send to all <strong>{members?.length ?? "..."}</strong> members with registered phone numbers.
              </p>
            )}

            <Button
              onClick={bulkMode ? handleSendBlast : handleSendSingle}
              disabled={!selectedTemplate || sendMessage.isPending || (!bulkMode && !recipientPhone.trim())}
              className="w-full gradient-hero text-primary-foreground"
            >
              <Send className="w-4 h-4 mr-1" />
              {bulkMode ? `Send to All Members` : "Send Message"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={(open) => { if (!open) setEditTemplate(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Template</DialogTitle>
            <DialogDescription>Changes will take effect immediately in the system, but Meta approval is required for sending.</DialogDescription>
          </DialogHeader>
          {editTemplate && (
            <div className="space-y-3">
              <div>
                <Label>Template Name (lowercase, underscores)</Label>
                <Input value={editTemplate.name} onChange={e => setEditTemplate({ ...editTemplate, name: e.target.value })} className="mt-1" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label>Language</Label>
                  <Select value={editTemplate.language} onValueChange={v => setEditTemplate({ ...editTemplate, language: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="gu">Gujarati</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>Category</Label>
                  <Select value={editTemplate.category} onValueChange={v => setEditTemplate({ ...editTemplate, category: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTILITY">Utility</SelectItem>
                      <SelectItem value="MARKETING">Marketing</SelectItem>
                      <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Header (optional)</Label>
                <Input value={editTemplate.header_text ?? ""} onChange={e => setEditTemplate({ ...editTemplate, header_text: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>{"Body * (use {{1}}, {{2}} for variables)"}</Label>
                <Textarea value={editTemplate.body_text} onChange={e => setEditTemplate({ ...editTemplate, body_text: e.target.value })} rows={3} className="mt-1" />
              </div>
              <div>
                <Label>Footer (optional)</Label>
                <Input value={editTemplate.footer_text ?? ""} onChange={e => setEditTemplate({ ...editTemplate, footer_text: e.target.value })} className="mt-1" />
              </div>
              <Button onClick={() => updateTemplate.mutate()} disabled={!editTemplate.name.trim() || !editTemplate.body_text.trim() || updateTemplate.isPending} className="w-full gradient-hero text-primary-foreground">
                Save Template
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirmation */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={(open) => { if (!open) setDeleteTemplateId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>Permanently delete this WhatsApp template? It cannot be recovered.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTemplateId && deleteTemplate.mutate(deleteTemplateId)} disabled={deleteTemplate.isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Message Confirmation */}
      <AlertDialog open={!!deleteMessageId} onOpenChange={(open) => { if (!open) setDeleteMessageId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from History</AlertDialogTitle>
            <AlertDialogDescription>Remove this message record from history? This only removes the log entry, not any message already delivered.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMessageId && deleteMessage.mutate(deleteMessageId)} disabled={deleteMessage.isPending}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create template dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Create Template</DialogTitle>
            <DialogDescription>Templates require approval from Meta before they can be used.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="tpl-name">Template Name * (lowercase, underscores)</Label>
              <Input id="tpl-name" value={newTemplate.name} onChange={(e) => setNewTemplate((f) => ({ ...f, name: e.target.value }))} placeholder="event_reminder" className="mt-1" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="tpl-lang">Language</Label>
                <Select value={newTemplate.language} onValueChange={(v) => setNewTemplate((f) => ({ ...f, language: v }))}>
                  <SelectTrigger id="tpl-lang" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="gu">Gujarati</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label htmlFor="tpl-cat">Category</Label>
                <Select value={newTemplate.category} onValueChange={(v) => setNewTemplate((f) => ({ ...f, category: v }))}>
                  <SelectTrigger id="tpl-cat" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTILITY">Utility</SelectItem>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="tpl-header">Header (optional)</Label>
              <Input id="tpl-header" value={newTemplate.header_text} onChange={(e) => setNewTemplate((f) => ({ ...f, header_text: e.target.value }))} placeholder="Event Reminder" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="tpl-body">{"Body * (use {{1}}, {{2}} for variables)"}</Label>
              <Textarea id="tpl-body" value={newTemplate.body_text} onChange={(e) => setNewTemplate((f) => ({ ...f, body_text: e.target.value }))} placeholder={"Dear {{1}}, you are invited to {{2}} on {{3}}."} rows={3} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="tpl-footer">Footer (optional)</Label>
              <Input id="tpl-footer" value={newTemplate.footer_text} onChange={(e) => setNewTemplate((f) => ({ ...f, footer_text: e.target.value }))} placeholder={COMMUNITY_FULL_NAME} className="mt-1" />
            </div>
            <Button
              onClick={() => createTemplate.mutate()}
              disabled={!newTemplate.name.trim() || !newTemplate.body_text.trim() || createTemplate.isPending}
              className="w-full gradient-hero text-primary-foreground"
            >
              Save Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
