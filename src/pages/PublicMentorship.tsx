import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import PublicLayout from "@/components/PublicLayout";
import SEOMeta from "@/components/SEOMeta";
import { Input } from "@/components/ui/input";
import { Users, Search, Briefcase, Star, Lock, ArrowRight, UserCheck, BookOpen } from "lucide-react";

const LOGO = "/Screenshot_2026-03-16_at_9.18.14_AM.png";

function LoginGate({ message }: { message: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
      background: "rgba(243,156,18,0.07)", border: "1.5px dashed rgba(243,156,18,0.38)",
      borderRadius: 10, marginTop: 12,
    }}>
      <Lock size={13} style={{ color: "#F39C12", flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: "#2E2E2E80", flex: 1 }}>{message}</span>
      <Link to="/auth" style={{
        fontSize: 11, fontWeight: 700, color: "#F39C12", textDecoration: "none",
        display: "flex", alignItems: "center", gap: 3, whiteSpace: "nowrap",
      }}>
        Sign in <ArrowRight size={11} />
      </Link>
    </div>
  );
}

export default function PublicMentorship() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const { data: mentors = [], isLoading } = useQuery({
    queryKey: ["public-mentorships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentorships")
        .select("id, skills, description, status, mode, availability, mentor:members!mentorships_mentor_member_id_fkey(id, first_name, last_name, photo_url, verification_level, chapters(name))")
        .eq("status", "available")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const allSkills = Array.from(new Set(mentors.flatMap(m => (m.skills as string[]) ?? []))).sort();

  const filtered = mentors.filter(m => {
    const mentor = m.mentor as any;
    const name = `${mentor?.first_name ?? ""} ${mentor?.last_name ?? ""}`.toLowerCase();
    const skills = (m.skills as string[]) ?? [];
    const matchesSearch = !search || name.includes(search.toLowerCase()) ||
      skills.some(s => s.toLowerCase().includes(search.toLowerCase()));
    const matchesSkill = !selectedSkill || skills.includes(selectedSkill);
    return matchesSearch && matchesSkill;
  });

  const verificationBadge = (level: string | null) => {
    if (!level || level === "unverified") return null;
    const colors: Record<string, { bg: string; text: string; label: string }> = {
      L1: { bg: "#EBF5FB", text: "#2980B9", label: "Verified" },
      L2: { bg: "#E8F8F5", text: "#16A085", label: "L2 Member" },
      L3: { bg: "#FEF9E7", text: "#E67E22", label: "Elder" },
    };
    const c = colors[level] ?? colors.L1;
    return (
      <span style={{ background: c.bg, color: c.text, borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
        {c.label}
      </span>
    );
  };

  return (
    <PublicLayout title="Mentorship">
      <SEOMeta
        title="Mentorship — Khadayata"
        description="Connect with experienced Khadayata community mentors across careers, education, and life skills."
        keywords="khadayata mentorship, community mentors, career guidance, skill development"
      />

      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #1B2A4A 0%, #243B61 60%, #1B2A4A 100%)",
        padding: "64px 24px 48px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Poppins', sans-serif",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1600)`,
          backgroundSize: "cover", backgroundPosition: "center",
          opacity: 0.14,
        }} />
        <div style={{ position: "relative", maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <img src={LOGO} alt="Khadayata" style={{ height: 52, marginBottom: 16, mixBlendMode: "screen" }} />
          <h1 style={{ fontSize: 40, fontWeight: 800, color: "#fff", margin: "0 0 12px", lineHeight: 1.15 }}>
            Mentorship
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.72)", margin: "0 0 28px", maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
            Learn from experienced community members. Find a mentor who has walked the path you're on.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", borderRadius: 12, padding: "12px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>{mentors.length}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", letterSpacing: 1 }}>MENTORS</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", borderRadius: 12, padding: "12px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>{allSkills.length}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", letterSpacing: 1 }}>SKILLS</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ background: "#fff", borderBottom: "1px solid #f0ece4", padding: "16px 24px", fontFamily: "'Poppins', sans-serif" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#aaa" }} />
            <Input
              placeholder="Search by name or skill..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36, height: 38, fontSize: 13, borderRadius: 8 }}
            />
          </div>
          {user ? (
            <Link to="/mentorship/manage" style={{
              padding: "8px 18px", borderRadius: 8, background: "#1B2A4A", color: "#fff",
              textDecoration: "none", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
            }}>
              My Mentorships
            </Link>
          ) : (
            <Link to="/auth" style={{
              padding: "8px 18px", borderRadius: 8, background: "#F39C12", color: "#fff",
              textDecoration: "none", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
            }}>
              Sign in to Connect
            </Link>
          )}
        </div>
      </div>

      {/* Skills cloud */}
      {allSkills.length > 0 && (
        <div style={{ background: "#fff", padding: "12px 24px 16px", borderBottom: "1px solid #f5f0e8", fontFamily: "'Poppins', sans-serif" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", letterSpacing: 1, marginBottom: 8 }}>FILTER BY SKILL</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                onClick={() => setSelectedSkill(null)}
                style={{
                  padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                  fontFamily: "'Poppins', sans-serif", fontSize: 11, fontWeight: 600,
                  background: !selectedSkill ? "#1B2A4A" : "#f5f0e8",
                  color: !selectedSkill ? "#fff" : "#555",
                  transition: "all 0.15s",
                }}
              >
                All
              </button>
              {allSkills.map(skill => (
                <button
                  key={skill}
                  onClick={() => setSelectedSkill(selectedSkill === skill ? null : skill)}
                  style={{
                    padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                    fontFamily: "'Poppins', sans-serif", fontSize: 11, fontWeight: 600,
                    background: selectedSkill === skill ? "#1B2A4A" : "#f5f0e8",
                    color: selectedSkill === skill ? "#fff" : "#555",
                    transition: "all 0.15s",
                  }}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mentor Grid */}
      <div style={{ background: "#FFF7E6", minHeight: "60vh", padding: "32px 24px", fontFamily: "'Poppins', sans-serif" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa", fontSize: 14 }}>Loading mentors...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <Users size={40} style={{ color: "#ddd", margin: "0 auto 12px", display: "block" }} />
              <p style={{ color: "#aaa", fontSize: 14 }}>No mentors found.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
              {filtered.map(m => {
                const mentor = m.mentor as any;
                const skills = (m.skills as string[]) ?? [];
                const initials = `${mentor?.first_name?.[0] ?? ""}${mentor?.last_name?.[0] ?? ""}`.toUpperCase();
                return (
                  <div key={m.id} style={{
                    background: "#fff", borderRadius: 14, padding: 20,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                    border: "1px solid #f0ece4",
                    display: "flex", flexDirection: "column", gap: 0,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                      {mentor?.photo_url ? (
                        <img src={mentor.photo_url} alt={initials} style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{
                          width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
                          background: "linear-gradient(135deg, #1B2A4A, #243B61)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 18, fontWeight: 700, color: "#fff",
                        }}>
                          {initials}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap", marginBottom: 3 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>
                            {mentor?.first_name} {mentor?.last_name}
                          </span>
                          {verificationBadge(mentor?.verification_level)}
                        </div>
                        {(mentor?.chapters as any)?.name && (
                          <div style={{ fontSize: 11, color: "#aaa" }}>{(mentor?.chapters as any).name}</div>
                        )}
                      </div>
                    </div>

                    {m.description && (
                      <p style={{ fontSize: 13, color: "#555", margin: "0 0 10px", lineHeight: 1.55,
                        overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical" as any,
                      }}>
                        {m.description}
                      </p>
                    )}

                    {skills.length > 0 && (
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                        {skills.map(skill => (
                          <span key={skill} style={{
                            background: selectedSkill === skill ? "#1B2A4A" : "#EBF5FB",
                            color: selectedSkill === skill ? "#fff" : "#2980B9",
                            borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600,
                          }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    <LoginGate message="Sign in to request mentorship from this member" />
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
