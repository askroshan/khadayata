import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import PublicLayout from "@/components/PublicLayout";
import SEOMeta from "@/components/SEOMeta";
import { Heart, Search, MapPin, Calendar, User, ArrowRight, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format, differenceInYears } from "date-fns";
import ObituaryForm from "@/components/obituaries/ObituaryForm";
import { usePermissions } from "@/hooks/useRoles";

export default function Obituaries() {
  const { user } = useAuth();
  const { canManageChapter, isGlobalAdmin, isGlobalPublisher } = usePermissions();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const canPost = canManageChapter || isGlobalAdmin || isGlobalPublisher;

  const { data: obituaries, isLoading, refetch } = useQuery({
    queryKey: ["obituaries", search],
    queryFn: async () => {
      let q = supabase
        .from("obituaries")
        .select("id, full_name, also_known_as, dob, dod, city_of_origin, city_of_passing, photo_url, tribute, family_message, chapter_id, chapters(name)")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (search.trim()) q = q.ilike("full_name", `%${search.trim()}%`);
      const { data } = await q.limit(80);
      return data ?? [];
    },
  });

  return (
    <PublicLayout title="Obituaries">
      <SEOMeta
        title="Obituaries — Khadayata"
        description="Remembering beloved members of the Khadayata community. Obituaries and tributes posted by chapters worldwide."
        url="/obituaries"
        keywords="Khadayata obituaries, Khadayata community remembrance, Shok Sandesh, Khadayata tributes"
      />

      <div style={{ fontFamily: "'Poppins', sans-serif", background: "#FFF7E6", minHeight: "60vh" }}>

        {/* Hero */}
        <div style={{
          background: "linear-gradient(135deg,#1a1a1a 0%,#2c2c2c 60%,rgba(46,46,46,0.95) 100%)",
          padding: "52px 24px 44px",
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <Heart size={28} style={{ color: "#F4B400" }} />
              <h1 style={{ fontSize: "clamp(1.8rem,3.5vw,2.4rem)", fontWeight: 800, color: "#fff", margin: 0 }}>
                In Memoriam
              </h1>
            </div>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 15, maxWidth: 560, margin: "0 0 20px" }}>
              Remembering the beloved souls of our Khadayata family.
              May their memories be a blessing to all who knew them.
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", fontStyle: "italic", margin: 0 }}>
              ॐ शांति शांति शांति
            </p>
          </div>
        </div>

        {/* Search + post button bar */}
        <div style={{ background: "#fff", borderBottom: "1px solid rgba(232,163,23,0.2)", padding: "16px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#2E2E2E50" }} />
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 38 }}
              />
            </div>
            {user && canPost && (
              <button
                onClick={() => setShowForm(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: "#2E2E2E", color: "#fff", border: "none", cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <Plus size={15} /> Post Obituary
              </button>
            )}
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>

          {isLoading && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#2E2E2E60" }}>
              <Heart size={40} style={{ margin: "0 auto 12px", opacity: 0.2 }} />
              <p>Loading...</p>
            </div>
          )}

          {!isLoading && obituaries?.length === 0 && (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <Heart size={48} style={{ margin: "0 auto 16px", color: "#2E2E2E25" }} />
              <p style={{ color: "#2E2E2E60", fontSize: 15 }}>No obituaries found</p>
            </div>
          )}

          {!isLoading && obituaries && obituaries.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
              {obituaries.map((obit) => {
                const age = obit.dob && obit.dod
                  ? differenceInYears(new Date(obit.dod), new Date(obit.dob))
                  : null;
                const chapter = obit.chapters as { name: string } | null;
                return (
                  <article key={obit.id} style={{
                    background: "#fff", borderRadius: 20,
                    border: "1px solid rgba(46,46,46,0.1)",
                    boxShadow: "0 4px 20px rgba(46,46,46,0.06)",
                    overflow: "hidden",
                    display: "flex", flexDirection: "column",
                    transition: "transform .2s, box-shadow .2s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 10px 32px rgba(46,46,46,0.12)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 20px rgba(46,46,46,0.06)"; }}
                  >
                    {/* Photo or placeholder */}
                    <div style={{
                      height: 180,
                      background: obit.photo_url
                        ? `url(${obit.photo_url}) center/cover no-repeat`
                        : "linear-gradient(135deg,#2c2c2c,#1a1a1a)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      position: "relative",
                    }}>
                      {!obit.photo_url && (
                        <User size={48} style={{ color: "rgba(255,255,255,0.2)" }} />
                      )}
                      {obit.photo_url && (
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,0.5),transparent)" }} />
                      )}
                      <div style={{
                        position: "absolute", bottom: 12, left: 0, right: 0,
                        display: "flex", justifyContent: "center",
                      }}>
                        <span style={{
                          fontSize: 12, fontStyle: "italic", color: "rgba(255,255,255,0.55)",
                        }}>ॐ शांति</span>
                      </div>
                    </div>

                    <div style={{ padding: "20px 20px 18px" }}>
                      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#2E2E2E", margin: "0 0 4px", lineHeight: 1.3 }}>
                        {obit.full_name}
                      </h2>
                      {obit.also_known_as && (
                        <p style={{ fontSize: 12, color: "#2E2E2E60", margin: "0 0 10px", fontStyle: "italic" }}>
                          Also known as: {obit.also_known_as}
                        </p>
                      )}

                      {/* Dates */}
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                        {obit.dob && (
                          <span style={{ fontSize: 12, color: "#2E2E2E70", display: "flex", alignItems: "center", gap: 4 }}>
                            <Calendar size={11} />
                            Born: {format(new Date(obit.dob), "MMM d, yyyy")}
                          </span>
                        )}
                        <span style={{ fontSize: 12, color: "#2E2E2E70", display: "flex", alignItems: "center", gap: 4 }}>
                          <Heart size={11} style={{ color: "#E53935" }} />
                          Passed: {format(new Date(obit.dod), "MMM d, yyyy")}
                          {age !== null && ` · Age ${age}`}
                        </span>
                      </div>

                      {/* Location */}
                      {(obit.city_of_origin || obit.city_of_passing) && (
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                          {obit.city_of_origin && (
                            <span style={{ fontSize: 11, color: "#2E2E2E55", display: "flex", alignItems: "center", gap: 3 }}>
                              <MapPin size={10} /> From: {obit.city_of_origin}
                            </span>
                          )}
                          {obit.city_of_passing && (
                            <span style={{ fontSize: 11, color: "#2E2E2E55", display: "flex", alignItems: "center", gap: 3 }}>
                              <MapPin size={10} /> In: {obit.city_of_passing}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Tribute excerpt */}
                      {obit.tribute && (
                        <p style={{
                          fontSize: 13, color: "#2E2E2E75", lineHeight: 1.6, margin: "0 0 12px",
                          display: "-webkit-box", WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical", overflow: "hidden",
                          fontStyle: "italic",
                        } as React.CSSProperties}>
                          "{obit.tribute}"
                        </p>
                      )}

                      {/* Family message */}
                      {obit.family_message && (
                        <div style={{
                          padding: "10px 12px", background: "rgba(243,156,18,0.06)",
                          borderLeft: "3px solid #F4B400", borderRadius: "0 8px 8px 0",
                          marginBottom: 12,
                        }}>
                          <p style={{
                            fontSize: 12, color: "#2E2E2E70", lineHeight: 1.5, margin: 0,
                            display: "-webkit-box", WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical", overflow: "hidden",
                          } as React.CSSProperties}>
                            {obit.family_message}
                          </p>
                        </div>
                      )}

                      {/* Chapter */}
                      {chapter && (
                        <p style={{ fontSize: 11, color: "#2E2E2E45", margin: 0 }}>
                          {chapter.name} Chapter
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Obituary post form modal */}
      {showForm && (
        <ObituaryForm
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); refetch(); }}
        />
      )}
    </PublicLayout>
  );
}
