import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMember } from "@/hooks/useMember";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, MessageSquare, Clock } from "lucide-react";

export interface MemberEmailMessage {
  id: string;
  from_member_id: string;
  to_member_id: string;
  context_type: "matrimonial" | "chapter" | "general";
  context_id: string | null;
  subject: string;
  body: string;
  read_at: string | null;
  created_at: string;
  from_member?: { id: string; first_name: string; last_name: string } | null;
  to_member?: { id: string; first_name: string; last_name: string } | null;
}

interface EmailMessageThreadsProps {
  /** Optional filter to show only messages with a specific member (e.g. on a profile page) */
  partnerMemberId?: string;
  /** Optional context filter */
  contextType?: "matrimonial" | "chapter" | "general";
  /** Optional callback to send a reply when viewing a single partner thread */
  onSendReply?: (message: string) => Promise<void>;
  /** Compact mode for embedding inside a profile detail card */
  compact?: boolean;
}

export function EmailMessageThreads({
  partnerMemberId,
  contextType,
  onSendReply,
  compact = false,
}: EmailMessageThreadsProps) {
  const { member } = useMember();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(partnerMemberId ?? null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["member-email-messages", member?.id, partnerMemberId, contextType],
    queryFn: async () => {
      if (!member) return [];
      let query = supabase
        .from("member_email_messages" as never)
        .select(
          "*, from_member:members!member_email_messages_from_member_id_fkey(id, first_name, last_name), to_member:members!member_email_messages_to_member_id_fkey(id, first_name, last_name)"
        )
        .or(`from_member_id.eq.${member.id},to_member_id.eq.${member.id}`)
        .order("created_at", { ascending: true });

      if (contextType) {
        query = query.eq("context_type", contextType);
      }

      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as unknown as MemberEmailMessage[];
      if (partnerMemberId) {
        return rows.filter(
          (r) =>
            (r.from_member_id === member.id && r.to_member_id === partnerMemberId) ||
            (r.from_member_id === partnerMemberId && r.to_member_id === member.id)
        );
      }
      return rows;
    },
    enabled: !!member,
  });

  const threads = useMemo(() => {
    if (!member) return [];
    const map = new Map<
      string,
      {
        partnerId: string;
        partnerName: string;
        messages: MemberEmailMessage[];
        lastMessageAt: string;
      }
    >();

    for (const msg of messages) {
      const isSent = msg.from_member_id === member.id;
      const partnerId = isSent ? msg.to_member_id : msg.from_member_id;
      const partnerObj = isSent ? msg.to_member : msg.from_member;
      const partnerName = partnerObj
        ? `${partnerObj.first_name} ${partnerObj.last_name}`.trim()
        : "Community Member";

      const existing = map.get(partnerId);
      if (existing) {
        existing.messages.push(msg);
        existing.lastMessageAt = msg.created_at;
      } else {
        map.set(partnerId, {
          partnerId,
          partnerName,
          messages: [msg],
          lastMessageAt: msg.created_at,
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }, [messages, member]);

  const activePartnerId = partnerMemberId ?? selectedPartnerId ?? threads[0]?.partnerId ?? null;
  const activeThread = threads.find((t) => t.partnerId === activePartnerId) ?? null;

  const markRead = useMutation({
    mutationFn: async (messageIds: string[]) => {
      if (!messageIds.length) return;
      await supabase
        .from("member_email_messages" as never)
        .update({ read_at: new Date().toISOString() } as never)
        .in("id", messageIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-email-messages"] });
    },
  });

  const handleReply = async () => {
    if (!replyText.trim() || !onSendReply) return;
    setSendingReply(true);
    try {
      await onSendReply(replyText.trim());
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["member-email-messages"] });
    } catch (err) {
      toast({
        title: "Could not send message",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingReply(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Loading communication history...
      </div>
    );
  }

  if (partnerMemberId) {
    return (
      <Card className={compact ? "border-border" : "shadow-card"}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            Email Communication Thread
            {messages.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {messages.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Messages sent privately via KhadayataOnline email relay
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No email messages exchanged yet. Use &ldquo;Email Candidate (Private)&rdquo; to start a thread.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {messages.map((msg) => {
                const isSent = msg.from_member_id === member?.id;
                return (
                  <div
                    key={msg.id}
                    className={`rounded-lg p-3 text-sm border ${
                      isSent
                        ? "bg-primary/5 border-primary/20 ml-6"
                        : "bg-muted/40 border-border mr-6"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold">
                        {isSent ? "You" : `${msg.from_member?.first_name ?? "Member"} ${msg.from_member?.last_name ?? ""}`.trim()}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    {msg.subject && (
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Subject: {msg.subject}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                  </div>
                );
              })}
            </div>
          )}

          {onSendReply && (
            <div className="pt-2 border-t border-border space-y-2">
              <Textarea
                rows={2}
                placeholder="Write a follow-up message..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleReply}
                  disabled={sendingReply || !replyText.trim()}
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {sendingReply ? "Sending..." : "Send Follow-Up"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-secondary" />
          Email Communication Threads
        </CardTitle>
        <CardDescription>
          View all private email messages sent to or received from community members
        </CardDescription>
      </CardHeader>
      <CardContent>
        {threads.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No email conversations yet. When you email a member or matrimonial profile, your thread will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Thread List */}
            <div className="space-y-2 border-r-0 md:border-r border-border md:pr-4">
              {threads.map((thread) => {
                const lastMsg = thread.messages[thread.messages.length - 1];
                const unreadIds = thread.messages
                  .filter((m) => m.to_member_id === member?.id && !m.read_at)
                  .map((m) => m.id);
                const isActive = thread.partnerId === activePartnerId;

                return (
                  <button
                    key={thread.partnerId}
                    type="button"
                    onClick={() => {
                      setSelectedPartnerId(thread.partnerId);
                      if (unreadIds.length > 0) {
                        markRead.mutate(unreadIds);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isActive
                        ? "bg-primary/10 border-primary/40"
                        : "bg-muted/20 border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{thread.partnerName}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {unreadIds.length > 0 && (
                          <Badge className="text-[10px] px-1.5 py-0">{unreadIds.length} new</Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {lastMsg.context_type}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {lastMsg.body}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(thread.lastMessageAt).toLocaleDateString()}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Active Thread Messages */}
            <div className="md:col-span-2 space-y-3">
              {activeThread ? (
                <>
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h4 className="font-display font-semibold text-sm">
                      Conversation with {activeThread.partnerName}
                    </h4>
                    <Badge variant="secondary" className="text-xs">
                      {activeThread.messages.length} message{activeThread.messages.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {activeThread.messages.map((msg) => {
                      const isSent = msg.from_member_id === member?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`rounded-lg p-3 text-sm border ${
                            isSent
                              ? "bg-primary/5 border-primary/20 ml-8"
                              : "bg-muted/40 border-border mr-8"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-semibold">
                              {isSent ? "You" : activeThread.partnerName}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(msg.created_at).toLocaleString()}
                            </span>
                          </div>
                          {msg.subject && (
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              {msg.subject}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Select a conversation to view messages.
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
