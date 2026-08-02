import { useState } from "react";
import { useMember } from "@/hooks/useMember";
import { useChapterCommittee } from "@/hooks/useChapter";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, MessageSquare, Send, Users } from "lucide-react";
import { validateChapterMessage, formatCommitteeLabel } from "@/lib/chapter-contact-utils";
import type { CommitteeMember } from "@/lib/chapter-contact-utils";

export function ChapterContact() {
  const { member } = useMember();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const { data: committee } = useChapterCommittee(member?.chapter_id);

  const committeeMembers: CommitteeMember[] = (committee ?? []).map((c) => {
    const role = c.roles as { name: string } | null;
    const m = c.members as { id: string; first_name: string; last_name: string } | null;
    return {
      id: m?.id ?? "",
      first_name: m?.first_name ?? "",
      last_name: m?.last_name ?? "",
      role_name: role?.name ?? "Committee Member",
      phone: null,
      email: null,
    };
  }).filter((m) => m.id && m.id !== member?.id);

  // Fetch contact info for committee members
  const { data: contactsData } = useQuery({
    queryKey: ["committee-contacts", member?.chapter_id],
    queryFn: async () => {
      const memberIds = committeeMembers.map((m) => m.id);
      if (memberIds.length === 0) return [];
      const { data } = await supabase
        .from("member_contacts")
        .select("member_id, phone, email")
        .in("member_id", memberIds);
      return data ?? [];
    },
    enabled: !!committee && committeeMembers.length > 0,
  });

  // Merge contact info into committee members
  const enrichedMembers: CommitteeMember[] = committeeMembers.map((m) => {
    const contact = contactsData?.find((c) => c.member_id === m.id);
    return {
      ...m,
      phone: contact?.phone ?? null,
      email: contact?.email ?? null,
    };
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error("Not a member");
      const target = enrichedMembers.find((m) => m.id === selectedMemberId);
      if (!target) throw new Error("Please select a committee member");

      const validation = validateChapterMessage({
        from_member_id: member.id,
        to_member_id: selectedMemberId,
        chapter_id: member.chapter_id ?? "",
        subject,
        body,
      });
      if (!validation.valid) throw new Error(validation.errors[0]);

      // Save message to chapter_messages table
      const { error: dbError } = await supabase.from("chapter_messages").insert({
        from_member_id: member.id,
        to_member_id: selectedMemberId,
        chapter_id: member.chapter_id,
        subject: subject.trim(),
        body: body.trim(),
      });
      if (dbError) throw dbError;

      // Create a bell notification for the recipient
      await supabase.rpc("create_notification", {
        p_member_id: selectedMemberId,
        p_type: "chapter_message",
        p_title: "New Chapter Message",
        p_description: `${member.first_name} ${member.last_name}: "${subject.trim()}"`,
        p_entity_id: member.id,
        p_entity_type: "member",
      });

      // Send email via edge function if the recipient has an email
      if (target.email) {
        try {
          await supabase.functions.invoke("send-email", {
            body: {
              to: target.email,
              template: "chapter_member_message",
              data: {
                from_name: `${member.first_name} ${member.last_name}`,
                subject: subject.trim(),
                body: body.trim(),
              },
            },
          });
        } catch {
          // Email failure is non-blocking — bell notification already created
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Message sent!", description: "The committee member will be notified." });
      setOpen(false);
      setSelectedMemberId("");
      setSubject("");
      setBody("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (!member?.chapter_id) {
    return (
      <Card className="shadow-card border-dashed border-primary/30">
        <CardContent className="p-5 text-center">
          <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">You are not part of a chapter yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Join a chapter to connect with your local committee.</p>
        </CardContent>
      </Card>
    );
  }

  if (enrichedMembers.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          Contact Chapter Committee
        </CardTitle>
        <CardDescription>Reach out to your local chapter leaders</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Committee member list with phone */}
          <div className="space-y-2">
            {enrichedMembers.slice(0, 4).map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {m.first_name[0]}{m.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.first_name} {m.last_name}</p>
                  <p className="text-xs text-muted-foreground">{m.role_name}</p>
                </div>
                {m.phone && (
                  <a
                    href={`tel:${m.phone}`}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                    aria-label={`Call ${m.first_name} ${m.last_name}`}
                  >
                    <Phone className="w-3 h-3" />
                    Call
                  </a>
                )}
              </div>
            ))}
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Mail className="w-4 h-4 mr-2" /> Send a Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Message a Committee Member</DialogTitle>
                <DialogDescription>Select a committee member and write your message. They will receive it as an email and a notification.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="mb-1.5 block">To</Label>
                  <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                    <SelectTrigger><SelectValue placeholder="Select committee member..." /></SelectTrigger>
                    <SelectContent>
                      {enrichedMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {formatCommitteeLabel(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block">Subject</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief subject..."
                    maxLength={200}
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block">Message</Label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your message..."
                    maxLength={5000}
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">{body.length}/5000</p>
                </div>
                <Button
                  onClick={() => sendMessage.mutate()}
                  disabled={sendMessage.isPending || !selectedMemberId || !subject.trim() || !body.trim()}
                  className="w-full gradient-warm text-primary-foreground"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendMessage.isPending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
