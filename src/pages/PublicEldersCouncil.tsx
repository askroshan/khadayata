import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import PublicLayout from "@/components/PublicLayout";
import SEOMeta from "@/components/SEOMeta";
import { Crown, MessageCircle, Lock, ArrowRight, Globe, Scroll, Megaphone, Pin, ChartBar as BarChart2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function LoginGate({ message }: { message: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
      background: "rgba(243,156,18,0.08)", border: "1.5px dashed rgba(243,156,18,0.4)",
      borderRadius: 12, marginTop: 16,
    }}>
      <Lock size={15} style={{ color: "#F39C12", flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: "#2E2E2E99", flex: 1 }}>{message}</span>
      <Link to="/auth" style={{
        fontSize: 12, fontWeight: 700, color: "#F39C12", textDecoration: "none",
        display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
      }}>
        Sign in <ArrowRight size={12} />
      </Link>
    </div>
  );
}

const CATEGORY_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  general: { label: "General", color: "#1E88E5", icon: Globe },
  governance: { label: "Governance", color: "#D4A017", icon: Crown },
  tradition: { label: "Tradition", color: "#E67E22", icon: Scroll },
  announcement: { label: "Announcement", color: "#E53935", icon: Megaphone },
  poll: { label: "Poll", color: "#43A047", icon: BarChart2 },
};

export default function PublicEldersCouncil() {
  const { user } = useAuth();

  const { data: threads } = useQuery({
    queryKey: ["public-council-teaser"],
    queryFn: async () => {
      const { data } = await supabase
        .from("council_threads")
        .select("id, title, body, category, pinned, created_at, vote_sum, reply_count, author:members!council_threads_author_id_fkey(first_name, last_name, verification_level)")
        .eq("closed", false)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  if (user) {
    return (
      <PublicLayout>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px", textAlign: "center" }}>
          <p style={{ color: "#2E2E2E80", fontSize: 15 }}>
            You are signed in. <Link to="/elders-council/full" style={{ color: "#F39C12", fontWeight: 600 }}>Go to Elders Council &rarr;</Link>
          </p>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout title="Elders Council">
      <SEOMeta
        title="Elders Council — Khadayata"
        description="The Khadayata Elders Council — where community leaders discuss governance, traditions, announcements, and community matters."
        url="/elders-council"
        keywords="Khadayata elders council, Khadayata governance, community leadership, Khadayata traditions, community decisions"
      />

      <div style={{ fontFamily: "'Poppins', sans-serif", background: "#FFF7E6", minHeight: "60vh" }}>

        {/* Hero */}
        <div style={{
          background: "linear-gradient(135deg,#1a1a1a 0%,#2E2E2E 60%,rgba(212,160,23,0.15) 100%)",
          padding: "52px 24px 44px",
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <Crown size={30} style={{ color: "#F4B400" }} />
              <h1 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", fontWeight: 800, color: "#fff", margin: 0 }}>
                Elders Council
              </h1>
            </div>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 15, maxWidth: 580, margin: "0 0 24px" }}>
              The deliberative forum of the Khadayata community — where elders and leaders discuss
              governance, uphold traditions, make announcements, and guide the community forward.
            </p>
            <Link to="/auth" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "11px 28px", borderRadius: 50, fontSize: 14, fontWeight: 700,
              background: "#F4B400", color: "#2E2E2E", textDecoration: "none",
            }}>
              Sign in to participate <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ background: "#fff", borderBottom: "1px solid rgba(232,163,23,0.2)", padding: "18px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 40, flexWrap: "wrap" }}>
            {[
              { icon: MessageCircle, label: "Active Discussions", value: `${(threads ?? []).length}+` },
              { icon: Crown, label: "Governance Threads", value: `${(threads ?? []).filter(t => (t as Record<string,unknown>).category === "governance").length || "—"}` },
              { icon: BarChart2, label: "Open Polls", value: `${(threads ?? []).filter(t => (t as Record<string,unknown>).category === "poll").length || "—"}` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon size={20} style={{ color: "#F39C12" }} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#2E2E2E" }}>{value}</div>
                  <div style={{ fontSize: 12, color: "#2E2E2E70" }}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category chips */}
        <div style={{ background: "#f8f8f8", borderBottom: "1px solid rgba(232,163,23,0.2)", padding: "16px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
            {Object.entries(CATEGORY_META).map(([key, { label, color, icon: Icon }]) => (
              <div key={key} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 14px", borderRadius: 50, fontSize: 12, fontWeight: 600,
                background: `${color}15`, color, border: `1px solid ${color}30`,
              }}>
                <Icon size={12} /> {label}
              </div>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>

          {/* Threads teaser */}
          <div style={{ marginBottom: 48 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <div style={{ width: 4, height: 22, borderRadius: 2, background: "#F4B400" }} />
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#2E2E2E", margin: 0 }}>Active Discussions</h2>
            </div>

            {threads && threads.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {threads.map((thread) => {
                  const meta = CATEGORY_META[thread.category as string] ?? CATEGORY_META.general;
                  const Icon = meta.icon;
                  return (
                    <div key={thread.id} style={{
                      background: "#fff", borderRadius: 16,
                      border: thread.pinned ? "2px solid rgba(243,156,18,0.35)" : "1px solid rgba(232,163,23,0.18)",
                      padding: "18px 20px",
                      boxShadow: "0 2px 12px rgba(46,46,46,0.06)",
                      display: "flex", gap: 16, alignItems: "flex-start",
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: `${meta.color}15`,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <Icon size={18} style={{ color: meta.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                          {thread.pinned && (
                            <span style={{
                              display: "flex", alignItems: "center", gap: 3,
                              fontSize: 10, fontWeight: 700, color: "#F39C12",
                            }}>
                              <Pin size={9} /> Pinned
                            </span>
                          )}
                          <span style={{
                            fontSize: 10, padding: "2px 8px", borderRadius: 50,
                            background: `${meta.color}15`, color: meta.color, fontWeight: 600,
                          }}>{meta.label}</span>
                        </div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#2E2E2E", margin: "0 0 4px", lineHeight: 1.35 }}>
                          {thread.title as string}
                        </h3>
                        <p style={{ fontSize: 12, color: "#2E2E2E60", margin: "0 0 8px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>
                          {thread.body as string}
                        </p>
                        <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#2E2E2E50", flexWrap: "wrap" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <MessageCircle size={10} /> {(thread.reply_count as number) ?? 0} replies
                          </span>
                          {thread.created_at && (
                            <span>{formatDistanceToNow(new Date(thread.created_at as string), { addSuffix: true })}</span>
                          )}
                        </div>
                      </div>
                      <Lock size={14} style={{ color: "#F39C12", flexShrink: 0, marginTop: 4 }} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#2E2E2E50" }}>
                <Crown size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                <p>No active discussions yet. Be the first to participate.</p>
              </div>
            )}

            <LoginGate message="Sign in to vote on discussions, reply, and participate in community governance" />
          </div>

          {/* What is the Council */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20, marginBottom: 48 }}>
            {[
              { icon: Crown, title: "Governance", desc: "Elected elders guide community decisions and uphold Khadayata values across chapters worldwide." },
              { icon: Scroll, title: "Traditions", desc: "Preserve and document rituals, customs, and the rich cultural heritage of the Khadayata community." },
              { icon: Megaphone, title: "Announcements", desc: "Official communications and important notices from community leadership reach all members instantly." },
              { icon: BarChart2, title: "Community Polls", desc: "Members vote on important community matters, ensuring every voice is heard in major decisions." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{
                background: "#fff", borderRadius: 18, padding: "22px 20px",
                border: "1px solid rgba(232,163,23,0.18)",
                boxShadow: "0 2px 12px rgba(46,46,46,0.05)",
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "linear-gradient(135deg,rgba(243,156,18,0.15),rgba(230,126,34,0.08))",
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
                }}>
                  <Icon size={20} style={{ color: "#F39C12" }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#2E2E2E", margin: "0 0 6px" }}>{title}</h3>
                <p style={{ fontSize: 13, color: "#2E2E2E70", lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{
            background: "linear-gradient(135deg,#2E2E2E,#1a1a1a)",
            borderRadius: 24, padding: "40px 36px", textAlign: "center",
          }}>
            <Crown size={36} style={{ color: "#F4B400", margin: "0 auto 16px" }} />
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 10px" }}>
              Join the Conversation
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", maxWidth: 440, margin: "0 auto 24px" }}>
              Verified members can participate in discussions, cast votes, and contribute to
              shaping the future of the Khadayata community.
            </p>
            <Link to="/auth" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 32px", borderRadius: 50, fontSize: 14, fontWeight: 700,
              background: "#F4B400", color: "#2E2E2E", textDecoration: "none",
            }}>
              Join Khadayata Online <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
