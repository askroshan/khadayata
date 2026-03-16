import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import PublicLayout from "@/components/PublicLayout";
import SEOMeta from "@/components/SEOMeta";
import { Mic, Video, Play, Clock, Lock, ArrowRight, Users, Tag } from "lucide-react";
import { format } from "date-fns";

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

export default function PublicOralHistory() {
  const { user } = useAuth();

  const { data: histories } = useQuery({
    queryKey: ["public-oral-histories-teaser"],
    queryFn: async () => {
      const { data } = await supabase
        .from("oral_histories")
        .select("id, title, description, narrator_name, media_type, duration_seconds, tags, elder_priority, created_at")
        .eq("status", "published")
        .order("elder_priority", { ascending: false })
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
            You are signed in. <Link to="/oral-history" style={{ color: "#F39C12", fontWeight: 600 }}>Go to Oral History Project &rarr;</Link>
          </p>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout title="Oral History Project">
      <SEOMeta
        title="Oral History Project — Khadayata"
        description="Listen to firsthand accounts from Khadayata elders — stories of migration, tradition, and community life preserved in audio and video recordings."
        url="/oral-history"
        keywords="Khadayata oral history, Khadayata elders, community stories, heritage recordings, Khadayata traditions"
      />

      <div style={{ fontFamily: "'Poppins', sans-serif", background: "#FFF7E6", minHeight: "60vh" }}>

        {/* Hero */}
        <div style={{
          background: "linear-gradient(135deg,#1a1a1a 0%,#2E2E2E 60%,rgba(243,156,18,0.12) 100%)",
          padding: "52px 24px 44px",
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <Mic size={30} style={{ color: "#F39C12" }} />
              <h1 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", fontWeight: 800, color: "#fff", margin: 0 }}>
                Oral History Project
              </h1>
            </div>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 15, maxWidth: 580, margin: "0 0 24px" }}>
              Hear the stories that shaped our community. Elders share their memories of Khadayata villages,
              migration journeys, traditions, and the values that have been passed down through generations.
            </p>
            <Link to="/auth" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "11px 28px", borderRadius: 50, fontSize: 14, fontWeight: 700,
              background: "#F4B400", color: "#2E2E2E", textDecoration: "none",
            }}>
              Sign in to listen <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ background: "#fff", borderBottom: "1px solid rgba(232,163,23,0.2)", padding: "20px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 40, flexWrap: "wrap" }}>
            {[
              { icon: Mic, label: "Audio Recordings", value: `${(histories ?? []).filter(h => h.media_type === "audio").length || "—"}` },
              { icon: Video, label: "Video Stories", value: `${(histories ?? []).filter(h => h.media_type === "video").length || "—"}` },
              { icon: Users, label: "Narrators", value: `${new Set((histories ?? []).map(h => h.narrator_name).filter(Boolean)).size || "—"}` },
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

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>

          {/* Recordings teaser */}
          <div style={{ marginBottom: 48 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <div style={{ width: 4, height: 22, borderRadius: 2, background: "#F4B400" }} />
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#2E2E2E", margin: 0 }}>Featured Recordings</h2>
            </div>

            {histories && histories.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
                {histories.map((h) => (
                  <div key={h.id} style={{
                    background: "#fff", borderRadius: 20, overflow: "hidden",
                    border: h.elder_priority ? "2px solid rgba(243,156,18,0.4)" : "1px solid rgba(232,163,23,0.18)",
                    boxShadow: "0 4px 20px rgba(46,46,46,0.06)",
                  }}>
                    {/* Thumbnail */}
                    <div style={{
                      height: 140, background: "linear-gradient(135deg,#2E2E2E,#1a1a1a)",
                      display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
                    }}>
                      {h.elder_priority && (
                        <span style={{
                          position: "absolute", top: 10, left: 10,
                          padding: "3px 10px", borderRadius: 50, fontSize: 10, fontWeight: 700,
                          background: "#F4B400", color: "#2E2E2E",
                        }}>Elder</span>
                      )}
                      <div style={{
                        width: 52, height: 52, borderRadius: "50%",
                        background: "rgba(243,156,18,0.15)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "2px solid rgba(243,156,18,0.3)",
                      }}>
                        {h.media_type === "video"
                          ? <Video size={22} style={{ color: "#F39C12" }} />
                          : <Mic size={22} style={{ color: "#F39C12" }} />
                        }
                      </div>
                      <div style={{
                        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        opacity: 0.3,
                      }}>
                        <Play size={48} style={{ color: "#fff" }} />
                      </div>
                      <Lock size={14} style={{ color: "rgba(255,255,255,0.5)", position: "absolute", bottom: 10, right: 12 }} />
                    </div>

                    <div style={{ padding: "16px 18px" }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#2E2E2E", margin: "0 0 4px", lineHeight: 1.4 }}>
                        {h.title}
                      </h3>
                      {h.narrator_name && (
                        <p style={{ fontSize: 12, color: "#2E2E2E70", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 4 }}>
                          <Users size={10} /> {h.narrator_name}
                        </p>
                      )}
                      {h.description && (
                        <p style={{ fontSize: 12, color: "#2E2E2E60", lineHeight: 1.5, margin: "0 0 10px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>
                          {h.description}
                        </p>
                      )}
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        {h.duration_seconds && (
                          <span style={{ fontSize: 11, color: "#2E2E2E50", display: "flex", alignItems: "center", gap: 3 }}>
                            <Clock size={10} /> {Math.floor(h.duration_seconds / 60)}m {h.duration_seconds % 60}s
                          </span>
                        )}
                        {(h.tags ?? []).slice(0, 2).map((tag: string) => (
                          <span key={tag} style={{
                            fontSize: 10, padding: "2px 8px", borderRadius: 50,
                            background: "rgba(243,156,18,0.1)", color: "#E67E22",
                            display: "flex", alignItems: "center", gap: 3,
                          }}>
                            <Tag size={8} /> {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#2E2E2E50" }}>
                <Mic size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                <p>Recordings are being added — check back soon.</p>
              </div>
            )}

            <LoginGate message="Sign in to listen to recordings and contribute your own oral history" />
          </div>

          {/* Why contribute */}
          <div style={{
            background: "linear-gradient(135deg,#2E2E2E,#1a1a1a)",
            borderRadius: 24, padding: "40px 36px",
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32,
          }} className="oral-history-cta">
            <div>
              <Mic size={32} style={{ color: "#F4B400", marginBottom: 16 }} />
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 10px" }}>
                Share Your Story
              </h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, margin: "0 0 24px" }}>
                Every Khadayata family has a story worth preserving. Members can record and upload
                audio or video memories, tag stories by theme, and link recordings to family profiles.
              </p>
              <Link to="/auth" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "11px 28px", borderRadius: 50, fontSize: 14, fontWeight: 700,
                background: "#F4B400", color: "#2E2E2E", textDecoration: "none",
              }}>
                Join & Contribute <ArrowRight size={15} />
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { title: "Record audio or video", desc: "Upload directly from your phone or computer" },
                { title: "Tag by theme & family", desc: "Link to villages, families, and historical periods" },
                { title: "Elders get featured", desc: "Elder contributors are highlighted in the archives" },
              ].map(({ title, desc }) => (
                <div key={title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", background: "#F4B400",
                    marginTop: 6, flexShrink: 0,
                  }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: "0 0 2px" }}>{title}</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .oral-history-cta { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </PublicLayout>
  );
}
