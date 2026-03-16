import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, Clock, Flame, Globe } from "lucide-react";

interface AartiSchedule {
  morning?: string;
  evening?: string;
  stream_url?: string;
  timezone?: string;
}

interface LiveAartiPlayerProps {
  schedule: AartiSchedule | null;
}

const AARTI_TIMES_IST = {
  morning: { start: 6, end: 7 },   // 6-7 AM IST
  evening: { start: 19, end: 20 }, // 7-8 PM IST
};

function getISTHour(): number {
  const now = new Date();
  // IST is UTC+5:30
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  return utcHours + 5 + (utcMinutes + 30) / 60;
}

function isAartiLive(): { live: boolean; session: string } {
  const istHour = getISTHour();
  if (istHour >= AARTI_TIMES_IST.morning.start && istHour < AARTI_TIMES_IST.morning.end) {
    return { live: true, session: "Morning Aarti" };
  }
  if (istHour >= AARTI_TIMES_IST.evening.start && istHour < AARTI_TIMES_IST.evening.end) {
    return { live: true, session: "Evening Aarti" };
  }
  return { live: false, session: "" };
}

function getNextAarti(): string {
  const istHour = getISTHour();
  if (istHour < AARTI_TIMES_IST.morning.start) return "Morning Aarti at 6:00 AM IST";
  if (istHour < AARTI_TIMES_IST.evening.start) return "Evening Aarti at 7:00 PM IST";
  return "Morning Aarti tomorrow at 6:00 AM IST";
}

function formatTimeForTimezone(timeIST: string): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const [hours, minutes] = timeIST.split(":").map(Number);
    const now = new Date();
    // Create a date in IST (UTC+5:30)
    const utcDate = new Date(Date.UTC(
      now.getFullYear(), now.getMonth(), now.getDate(),
      hours - 5, minutes - 30
    ));
    return utcDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  } catch {
    return timeIST + " IST";
  }
}

export function LiveAartiPlayer({ schedule }: LiveAartiPlayerProps) {
  const [liveStatus, setLiveStatus] = useState(isAartiLive());

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveStatus(isAartiLive());
    }, 60000); // check every minute
    return () => clearInterval(interval);
  }, []);

  const morningLocal = formatTimeForTimezone(schedule?.morning ?? "06:00");
  const eveningLocal = formatTimeForTimezone(schedule?.evening ?? "19:00");

  return (
    <Card className="shadow-elevated overflow-hidden border-0">
      <div className="gradient-hero p-6 text-primary-foreground">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg">Live Aarti</h3>
              <p className="text-xs opacity-70">Kotyark Temple • Daily Darshan</p>
            </div>
          </div>
          {liveStatus.live && (
            <Badge className="bg-destructive text-destructive-foreground border-0 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white mr-1.5 inline-block" />
              LIVE
            </Badge>
          )}
        </div>

        {/* Schedule with timezone */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-1.5 bg-primary-foreground/10 rounded-lg px-3 py-1.5 text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>Morning: {morningLocal}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-primary-foreground/10 rounded-lg px-3 py-1.5 text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>Evening: {eveningLocal}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-primary-foreground/10 rounded-lg px-3 py-1.5 text-xs">
            <Globe className="w-3.5 h-3.5" />
            <span>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
          </div>
        </div>

        {/* Video player */}
        {liveStatus.live && schedule?.stream_url ? (
          <div className="aspect-video rounded-xl overflow-hidden bg-foreground/10">
            <iframe
              src={schedule.stream_url}
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media"
            />
          </div>
        ) : schedule?.stream_url ? (
          <div className="aspect-video rounded-xl overflow-hidden bg-foreground/10 relative">
            <iframe
              src={schedule.stream_url}
              className="w-full h-full opacity-50"
              allowFullScreen
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-foreground/30 backdrop-blur-sm">
              <Flame className="w-12 h-12 opacity-60 mb-2" />
              <p className="text-sm font-medium">Next: {getNextAarti()}</p>
            </div>
          </div>
        ) : (
          <div className="aspect-video rounded-xl bg-foreground/10 flex flex-col items-center justify-center text-primary-foreground/50 gap-3">
            <Flame className="w-12 h-12 opacity-40 animate-pulse" />
            <p className="text-sm font-medium">Next: {getNextAarti()}</p>
            <p className="text-xs opacity-60">Stream will appear during scheduled Aarti times</p>
          </div>
        )}
      </div>
    </Card>
  );
}
