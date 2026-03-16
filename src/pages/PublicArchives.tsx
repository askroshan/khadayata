import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import PublicLayout from "@/components/PublicLayout";
import SEOMeta from "@/components/SEOMeta";
import { Library, BookOpen, Mic, Lock, ArrowRight, FileText, Calendar } from "lucide-react";

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

export default function PublicArchives() {
  const { user } = useAuth();

  const { data: magazines } = useQuery({
    queryKey: ["public-magazines-teaser"],
    queryFn: async () => {
      const { data } = await supabase
        .from("magazine_issues")
        .select("id, title, volume, issue_date, pdf_url")
        .order("issue_date", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  if (user) {
    return (
      <PublicLayout>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px", textAlign: "center" }}>
          <p style={{ color: "#2E2E2E80", fontSize: 15 }}>
            You are signed in. <Link to="/archives" style={{ color: "#F39C12", fontWeight: 600 }}>Go to Archives &rarr;</Link>
          </p>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout title="Heritage Archives">
      <SEOMeta
        title="Heritage Archives — Khadayata"
        description="Explore digitized Khadayata Jyoti magazines, community records, and heritage documents preserved for future generations."
        url="/archives"
        keywords="Khadayata archives, Khadayata Jyoti magazine, Khadayata heritage, community records, Khadayata history"
      />

      <div style={{ fontFamily: "'Poppins', sans-serif", background: "#FFF7E6", minHeight: "60vh" }}>

        {/* Hero */}
        <div style={{
          background: "linear-gradient(135deg,#1a1a1a 0%,#2E2E2E 60%,rgba(243,156,18,0.12) 100%)",
          padding: "52px 24px 44px",
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <Library size={30} style={{ color: "#F39C12" }} />
              <h1 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", fontWeight: 800, color: "#fff", margin: 0 }}>
                Heritage Archives
              </h1>
            </div>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 15, maxWidth: 580, margin: "0 0 24px" }}>
              Decades of Khadayata Jyoti magazines, community records, genealogy documents,
              and oral history recordings — digitized and preserved for future generations.
            </p>
            <Link to="/auth" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "11px 28px", borderRadius: 50, fontSize: 14, fontWeight: 700,
              background: "#F4B400", color: "#2E2E2E", textDecoration: "none",
            }}>
              Sign in to access full archives <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ background: "#fff", borderBottom: "1px solid rgba(232,163,23,0.2)", padding: "20px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 40, flexWrap: "wrap" }}>
            {[
              { icon: BookOpen, label: "Magazine Issues", value: "50+" },
              { icon: FileText, label: "Digitized Pages", value: "2,000+" },
              { icon: Mic, label: "Oral History Recordings", value: "Coming Soon" },
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

          {/* Recent magazine issues teaser */}
          <div style={{ marginBottom: 48 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <div style={{ width: 4, height: 22, borderRadius: 2, background: "#F4B400" }} />
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#2E2E2E", margin: 0 }}>Khadayata Jyoti Magazine</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
              {(magazines ?? []).map((issue) => (
                <div key={issue.id} style={{
                  background: "#fff", borderRadius: 16, padding: "20px",
                  border: "1px solid rgba(232,163,23,0.2)",
                  boxShadow: "0 2px 12px rgba(46,46,46,0.06)",
                  display: "flex", alignItems: "flex-start", gap: 14,
                }}>
                  <div style={{
                    width: 44, height: 56, borderRadius: 6, background: "linear-gradient(135deg,#F39C12,#E67E22)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <BookOpen size={20} style={{ color: "#fff" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#2E2E2E", margin: "0 0 4px", lineHeight: 1.3 }}>
                      {issue.title}
                    </p>
                    {issue.volume && (
                      <p style={{ fontSize: 12, color: "#2E2E2E60", margin: "0 0 4px" }}>Vol. {issue.volume}</p>
                    )}
                    {issue.issue_date && (
                      <p style={{ fontSize: 11, color: "#2E2E2E50", margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
                        <Calendar size={10} />
                        {new Date(issue.issue_date).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <Lock size={14} style={{ color: "#F39C12", flexShrink: 0, marginTop: 2 }} />
                </div>
              ))}
              {(!magazines || magazines.length === 0) && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 0", color: "#2E2E2E50" }}>
                  <Library size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                  <p>Magazine archive loading...</p>
                </div>
              )}
            </div>
            <LoginGate message="Sign in to read, download, or search full magazine issues" />
          </div>

          {/* Heritage features teaser */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20, marginBottom: 48 }}>
            {[
              {
                icon: Mic,
                title: "Oral History Project",
                desc: "Listen to firsthand accounts from Khadayata elders — stories of migration, tradition, and community building across generations.",
                href: "/oral-history",
                cta: "Explore Oral Histories",
              },
              {
                icon: FileText,
                title: "Community Records",
                desc: "Digitized pages from the historic Khadayata Jnaati Pustak — ancestral records, family trees, and village documentation.",
                href: "/archives",
                cta: "View Records",
              },
            ].map(({ icon: Icon, title, desc, href, cta }) => (
              <div key={title} style={{
                background: "#fff", borderRadius: 20, padding: "28px 24px",
                border: "1px solid rgba(232,163,23,0.2)",
                boxShadow: "0 4px 20px rgba(46,46,46,0.06)",
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,rgba(243,156,18,0.15),rgba(230,126,34,0.1))",
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
                }}>
                  <Icon size={22} style={{ color: "#F39C12" }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#2E2E2E", margin: "0 0 8px" }}>{title}</h3>
                <p style={{ fontSize: 13, color: "#2E2E2E70", lineHeight: 1.6, margin: "0 0 16px" }}>{desc}</p>
                <Link to="/auth" style={{
                  fontSize: 13, fontWeight: 600, color: "#F39C12", textDecoration: "none",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  {cta} <ArrowRight size={13} />
                </Link>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{
            background: "linear-gradient(135deg,#2E2E2E,#1a1a1a)",
            borderRadius: 24, padding: "40px 36px", textAlign: "center",
          }}>
            <Library size={36} style={{ color: "#F4B400", margin: "0 auto 16px" }} />
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 10px" }}>
              Preserve Your Heritage
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", maxWidth: 440, margin: "0 auto 24px" }}>
              Members can upload heritage documents, contribute to the oral history project,
              and help tag and index our growing archive.
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
