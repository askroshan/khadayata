import { Link } from "react-router-dom";
import { useMember } from "@/hooks/useMember";
import { ShieldCheck, Calendar, MessageCircle, Share2, Sparkles } from "lucide-react";

export function EngagementCtaBar() {
  const { data: member } = useMember();
  const refUrl = `${window.location.origin}/auth${member?.global_id ? `?ref=${encodeURIComponent(member.global_id)}` : ""}`;
  const waText = `Join me on KhadayataOnline — connect with our global Khadayata chapters, events, directory, and claim your permanent Khadayata One ID: ${refUrl}`;

  return (
    <div className="border-b border-border/60 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap text-xs">
        <span className="font-medium text-foreground flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Stay active in the Khadayata community:
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/settings?tab=verification"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-background border border-border hover:border-primary/50 text-foreground font-medium transition-all hover:-translate-y-0.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Vouch &amp; One ID
          </Link>
          <Link
            to="/events/manage"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-background border border-border hover:border-primary/50 text-foreground font-medium transition-all hover:-translate-y-0.5"
          >
            <Calendar className="w-3.5 h-3.5 text-secondary" /> Chapter Events
          </Link>
          <Link
            to="/profile"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-background border border-border hover:border-primary/50 text-foreground font-medium transition-all hover:-translate-y-0.5"
          >
            <Share2 className="w-3.5 h-3.5 text-primary" /> Add Social Links
          </Link>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-shimmer inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold transition-all hover:-translate-y-0.5"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Refer Khadayata
          </a>
        </div>
      </div>
    </div>
  );
}
