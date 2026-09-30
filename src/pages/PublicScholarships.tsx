import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import PublicLayout from "@/components/PublicLayout";
import SEOMeta from "@/components/SEOMeta";
import { Input } from "@/components/ui/input";
import { GraduationCap, Search, Calendar, DollarSign, Building2, ArrowRight, BookOpen, Award } from "lucide-react";
import { format, isPast } from "date-fns";
import LoginGate from "@/components/LoginGate";

const LOGO = "/Screenshot_2026-03-16_at_9.18.14_AM.png";

export default function PublicScholarships() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: scholarships = [], isLoading } = useQuery({
    queryKey: ["public-scholarships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scholarships")
        .select("id, name, description, amount, currency, deadline, eligibility, chapters(name)")
        .eq("status", "active")
        .order("deadline", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = scholarships.filter(s =>
    !search ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase()) ||
    s.eligibility?.toLowerCase().includes(search.toLowerCase()) ||
    (s.chapters as { name: string } | null)?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const open = filtered.filter(s => !s.deadline || !isPast(new Date(s.deadline)));
  const closing = filtered.filter(s => s.deadline && !isPast(new Date(s.deadline)) && new Date(s.deadline) < new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));

  return (
    <PublicLayout title="Scholarships">
      <SEOMeta
        title="Scholarships — Khadayata"
        description="Browse active scholarships available to Khadayata community members. Apply for financial support for education."
        keywords="khadayata scholarships, community scholarships, education grants, student aid"
      />

      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #0D4F2E 0%, #1a6b3c 60%, #0D4F2E 100%)",
        padding: "64px 24px 48px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Poppins', sans-serif",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(https://images.pexels.com/photos/1205651/pexels-photo-1205651.jpeg?auto=compress&cs=tinysrgb&w=1600)`,
          backgroundSize: "cover", backgroundPosition: "center",
          opacity: 0.15,
        }} />
        <div style={{ position: "relative", maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <img src={LOGO} alt="Khadayata" style={{ height: 52, marginBottom: 16, mixBlendMode: "screen" }} />
          <h1 style={{ fontSize: 40, fontWeight: 800, color: "#fff", margin: "0 0 12px", lineHeight: 1.15 }}>
            Scholarships
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.72)", margin: "0 0 28px", maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
            Financial support for Khadayata students. Invest in the next generation of community leaders.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", borderRadius: 12, padding: "12px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>{open.length}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", letterSpacing: 1 }}>OPEN NOW</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", borderRadius: 12, padding: "12px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>{closing.length}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", letterSpacing: 1 }}>CLOSING SOON</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search + CTA bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #f0ece4", padding: "16px 24px", fontFamily: "'Poppins', sans-serif" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#757575" }} />
            <Input
              placeholder="Search scholarships, eligibility..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36, height: 38, fontSize: 13, borderRadius: 8 }}
            />
          </div>
          {user ? (
            <Link to="/scholarships/manage" style={{
              padding: "8px 18px", borderRadius: 8, background: "#0D4F2E", color: "#fff",
              textDecoration: "none", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
            }}>
              My Applications
            </Link>
          ) : (
            <Link to="/auth" style={{
              padding: "8px 18px", borderRadius: 8, background: "#96600b", color: "#fff",
              textDecoration: "none", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
            }}>
              Sign in to Apply
            </Link>
          )}
        </div>
      </div>

      {/* Listing */}
      <div style={{ background: "#FFF7E6", minHeight: "60vh", padding: "32px 24px", fontFamily: "'Poppins', sans-serif" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#757575", fontSize: 14 }}>Loading scholarships...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <Award size={40} style={{ color: "#bdbdbd", margin: "0 auto 12px", display: "block" }} />
              <p style={{ color: "#757575", fontSize: 14 }}>No active scholarships found.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
              {filtered.map(s => {
                const deadlineSoon = s.deadline && !isPast(new Date(s.deadline)) &&
                  new Date(s.deadline) < new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
                const expired = s.deadline && isPast(new Date(s.deadline));

                return (
                  <div key={s.id} style={{
                    background: "#fff", borderRadius: 14, padding: 22,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                    border: `1px solid ${deadlineSoon ? "#F39C1240" : "#f0ece4"}`,
                    display: "flex", flexDirection: "column", gap: 0,
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div style={{
                        background: "#0D4F2E18", borderRadius: 10,
                        width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <GraduationCap size={20} style={{ color: "#0D4F2E" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                          {deadlineSoon && (
                            <span style={{ background: "#FEF9E7", color: "#E67E22", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
                              Closing soon
                            </span>
                          )}
                          {expired && (
                            <span style={{ background: "#FDEDEC", color: "#E74C3C", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
                              Closed
                            </span>
                          )}
                          {(s.chapters as { name: string } | null)?.name && (
                            <span style={{ background: "#f5f0e8", color: "#757575", borderRadius: 20, padding: "2px 8px", fontSize: 10 }}>
                              {(s.chapters as { name: string } | null)?.name ?? ""}
                            </span>
                          )}
                        </div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", margin: 0, lineHeight: 1.3 }}>
                          {s.name}
                        </h3>
                      </div>
                    </div>

                    {s.description && (
                      <p style={{ fontSize: 13, color: "#555", margin: "10px 0 0", lineHeight: 1.55,
                        overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                      }}>
                        {s.description}
                      </p>
                    )}

                    <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap", fontSize: 12, color: "#757575" }}>
                      {s.amount && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <DollarSign size={11} style={{ color: "#0D4F2E" }} />
                          {s.currency} {s.amount.toLocaleString()}
                        </span>
                      )}
                      {s.deadline && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Calendar size={11} style={{ color: "#0D4F2E" }} />
                          Deadline: {format(new Date(s.deadline), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>

                    {s.eligibility && (
                      <div style={{ marginTop: 10, padding: "8px 12px", background: "#F4F6F7", borderRadius: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#757575", letterSpacing: 0.5, marginBottom: 3 }}>ELIGIBILITY</div>
                        <p style={{ fontSize: 12, color: "#555", margin: 0, lineHeight: 1.5,
                          overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}>
                          {s.eligibility}
                        </p>
                      </div>
                    )}

                    <LoginGate title="Sign In Required" message="Sign in to apply for this scholarship" ctaLabel="Sign in" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
