import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMember } from "@/hooks/useMember";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Bell, Heart, Calendar, Briefcase, Shield, Handshake,
  CalendarX, CalendarClock, MessageSquare, CheckCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { NotificationType } from "@/lib/notification-utils";

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  created_at: string;
  read: boolean;
  entity_id?: string | null;
  entity_type?: string | null;
}

function notifIcon(type: NotificationType) {
  switch (type) {
    case "vouch": return <Heart className="w-3.5 h-3.5 text-rose-500" />;
    case "rsvp": return <Calendar className="w-3.5 h-3.5 text-blue-500" />;
    case "mentorship": return <Handshake className="w-3.5 h-3.5 text-emerald-500" />;
    case "verification": return <Shield className="w-3.5 h-3.5 text-primary" />;
    case "announcement": return <Briefcase className="w-3.5 h-3.5 text-amber-500" />;
    case "event_created": return <Calendar className="w-3.5 h-3.5 text-secondary" />;
    case "event_cancelled": return <CalendarX className="w-3.5 h-3.5 text-destructive" />;
    case "event_updated": return <CalendarClock className="w-3.5 h-3.5 text-amber-500" />;
    case "event_reminder": return <CalendarClock className="w-3.5 h-3.5 text-blue-500" />;
    case "chapter_message": return <MessageSquare className="w-3.5 h-3.5 text-primary" />;
    default: return <Bell className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

function notifHref(n: NotificationItem): string | undefined {
  switch (n.type) {
    case "vouch": return "/profile";
    case "rsvp":
    case "event_created":
    case "event_cancelled":
    case "event_updated":
    case "event_reminder":
      return "/events";
    case "mentorship":
      return n.entity_id ? `/member/${n.entity_id}` : "/mentorship";
    case "verification": return "/settings?tab=verification";
    case "chapter_message": return "/dashboard";
    case "announcement": return "/dashboard";
    default: return undefined;
  }
}

export function NotificationsPanel() {
  const { user } = useAuth();
  const { member } = useMember();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: unreadCount } = useQuery({
    queryKey: ["notifications-count", member?.id],
    queryFn: async (): Promise<number> => {
      if (!member) return 0;
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("member_id", member.id)
        .eq("read", false);
      if (error) throw error;
      return Math.min(count ?? 0, 99);
    },
    enabled: !!member && !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications-panel", member?.id],
    queryFn: async (): Promise<NotificationItem[]> => {
      if (!member) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, description, created_at, read, entity_id, entity_type")
        .eq("member_id", member.id)
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return (data ?? []) as NotificationItem[];
    },
    enabled: !!member && !!user && open,
    staleTime: 60_000,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!member) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("member_id", member.id)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-panel"] });
    },
  });

  const markOneRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-panel"] });
    },
  });

  const displayCount = unreadCount ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={displayCount > 0 ? `Notifications (${displayCount} unread)` : "Notifications"}
          className="h-8 relative"
        >
          <Bell className="w-3.5 h-3.5" />
          {displayCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center animate-in fade-in zoom-in duration-300">
              {displayCount > 9 ? "9+" : displayCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 shadow-elevated">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-display font-semibold text-sm">Notifications</h3>
          <div className="flex items-center gap-2">
            {displayCount > 0 && (
              <Badge variant="secondary" className="text-xs">{displayCount} unread</Badge>
            )}
            {displayCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <CheckCheck className="w-3 h-3 mr-1" /> Mark all read
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {!notifications || notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No recent notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => {
                const href = notifHref(n);
                const inner = (
                  <>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${n.read ? "bg-muted/50" : "bg-muted"}`}>
                      {notifIcon(n.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs leading-snug ${n.read ? "text-muted-foreground" : "font-semibold text-foreground"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.description}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" aria-label="Unread" />
                    )}
                  </>
                );
                const handleClick = () => {
                  if (!n.read) markOneRead.mutate(n.id);
                  setOpen(false);
                };
                return href ? (
                  <Link
                    key={n.id}
                    to={href}
                    onClick={handleClick}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div
                    key={n.id}
                    onClick={handleClick}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                  >
                    {inner}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
