import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMember } from "@/hooks/useMember";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Heart, Calendar, Briefcase, Shield, Handshake } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface NotificationItem {
  id: string;
  type: "vouch" | "rsvp" | "mentorship" | "verification" | "announcement";
  title: string;
  description: string;
  created_at: string;
  read: boolean;
}

function notifIcon(type: NotificationItem["type"]) {
  switch (type) {
    case "vouch": return <Heart className="w-3.5 h-3.5 text-rose-500" />;
    case "rsvp": return <Calendar className="w-3.5 h-3.5 text-blue-500" />;
    case "mentorship": return <Handshake className="w-3.5 h-3.5 text-emerald-500" />;
    case "verification": return <Shield className="w-3.5 h-3.5 text-primary" />;
    case "announcement": return <Briefcase className="w-3.5 h-3.5 text-amber-500" />;
  }
}

export function NotificationsPanel() {
  const { user } = useAuth();
  const { member } = useMember();
  const [open, setOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ["notifications-panel", member?.id],
    queryFn: async (): Promise<NotificationItem[]> => {
      if (!member) return [];
      const items: NotificationItem[] = [];

      const { data: vouches } = await supabase
        .from("vouches")
        .select("id, created_at, voucher:members!vouches_voucher_member_id_fkey(first_name, last_name)")
        .eq("member_id", member.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (vouches) {
        for (const v of vouches) {
          const voucher = v.voucher as { first_name: string; last_name: string } | null;
          items.push({
            id: `vouch-${v.id}`,
            type: "vouch",
            title: "New Vouch Received",
            description: `${voucher?.first_name ?? "Someone"} ${voucher?.last_name ?? ""} vouched for you`,
            created_at: v.created_at,
            read: false,
          });
        }
      }

      const { data: rsvps } = await supabase
        .from("event_rsvps")
        .select("id, created_at, status, events(name)")
        .eq("member_id", member.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (rsvps) {
        for (const r of rsvps) {
          const event = r.events as { name: string } | null;
          items.push({
            id: `rsvp-${r.id}`,
            type: "rsvp",
            title: "Event RSVP Confirmed",
            description: `Your RSVP for "${event?.name ?? "an event"}" is confirmed`,
            created_at: r.created_at,
            read: false,
          });
        }
      }

      const { data: mentorships } = await supabase
        .from("mentorships")
        .select("id, created_at, status, mentor:members!mentorships_mentor_member_id_fkey(first_name, last_name)")
        .eq("mentee_member_id", member.id)
        .order("created_at", { ascending: false })
        .limit(3);
      if (mentorships) {
        for (const m of mentorships) {
          const mentor = m.mentor as { first_name: string; last_name: string } | null;
          items.push({
            id: `mentorship-${m.id}`,
            type: "mentorship",
            title: `Mentorship ${m.status === "active" ? "Accepted" : "Request"}`,
            description: `${mentor?.first_name ?? "A mentor"} ${mentor?.last_name ?? ""} ${m.status === "active" ? "accepted your request" : "connected with you"}`,
            created_at: m.created_at,
            read: false,
          });
        }
      }

      const { data: verReqs } = await supabase
        .from("verification_requests")
        .select("id, created_at, status")
        .eq("member_id", member.id)
        .order("created_at", { ascending: false })
        .limit(3);
      if (verReqs) {
        for (const vr of verReqs) {
          items.push({
            id: `ver-${vr.id}`,
            type: "verification",
            title: "Verification Update",
            description: `Your verification request is: ${vr.status}`,
            created_at: vr.created_at,
            read: false,
          });
        }
      }

      return items
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
    },
    enabled: !!member && !!user && open,
  });

  const count = notifications?.length ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={count > 0 ? `Notifications (${count} unread)` : "Notifications"}
          className="h-8 relative"
        >
          <Bell className="w-3.5 h-3.5" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 shadow-elevated">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-display font-semibold text-sm">Notifications</h3>
          {count > 0 && (
            <Badge variant="secondary" className="text-xs">{count} recent</Badge>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {!notifications || notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No recent notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    {notifIcon(n.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground leading-snug">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.description}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
