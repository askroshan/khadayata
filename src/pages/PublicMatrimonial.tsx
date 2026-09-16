import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import PublicLayout from "@/components/PublicLayout";
import SEOMeta from "@/components/SEOMeta";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Search, MapPin, GraduationCap, Lock, ArrowRight, User, Users, Star } from "lucide-react";

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

const DIET_LABELS: Record<string, string> = {
  vegetarian: "Vegetarian", vegan: "Vegan", non_vegetarian: "Non-Veg", jain: "Jain",
};

const MARITAL_LABELS: Record<string, string> = {
  never_married: "Never Married", divorced: "Divorced", widowed: "Widowed", separated: "Separated",
};

export default function PublicMatrimonial() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [dietFilter, setDietFilter] = useState("all");
  const [maritalFilter, setMaritalFilter] = useState("all");

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["public-matrimonial"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matrimonial_profiles")
        .select(`
          id, about, diet, marital_status, gotra, education_level, education_field,
          position_title, current_city, current_state, country, citizenship,
          hobbies, verified, manglik, ekda,
          member:members!matrimonial_profiles_member_id_fkey(
            id, first_name, last_name, gender, dob, photo_url,
            chapters(name)
          )
        `)
        .eq("visibility", "members")
        .eq("suspended", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = profiles.filter(p => {
    const member = p.member as { first_name: string | null; last_name: string | null; dob: string | null; gender: string | null; photo_url: string | null; chapters: { name: string } | null } | null;
    const name = `${member?.first_name ?? ""} ${member?.last_name ?? ""}`.toLowerCase();
    const matchesSearch = !search ||
      name.includes(search.toLowerCase()) ||
      p.current_city?.toLowerCase().includes(search.toLowerCase()) ||
      p.gotra?.toLowerCase().includes(search.toLowerCase()) ||
      p.education_field?.toLowerCase().includes(search.toLowerCase()) ||
      p.position_title?.toLowerCase().includes(search.toLowerCase());
    const matchesGender = genderFilter === "all" || member?.gender === genderFilter;
    const matchesDiet = dietFilter === "all" || p.diet === dietFilter;
    const matchesMarital = maritalFilter === "all" || p.marital_status === maritalFilter;
    return matchesSearch && matchesGender && matchesDiet && matchesMarital;
  });

  const getAge = (dob: string | null) => {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  };

  const getInitials = (member: { first_name: string | null; last_name: string | null } | null) =>
    `${member?.first_name?.[0] ?? ""}${member?.last_name?.[0] ?? ""}`.toUpperCase();

  return (
    <PublicLayout title="Matrimonial">
      <SEOMeta
        title="Matrimonial — Khadayata"
        description="Browse verified matrimonial profiles from the Khadayata community. Find your life partner within the community."
        keywords="khadayata matrimonial, community marriage, rishta, matrimony profiles"
      />

      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #6B2737 0%, #8B3A4A 50%, #6B2737 100%)",
        padding: "64px 24px 48px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Poppins', sans-serif",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(https://images.pexels.com/photos/1128318/pexels-photo-1128318.jpeg?auto=compress&cs=tinysrgb&w=1600)`,
          backgroundSize: "cover", backgroundPosition: "center",
          opacity: 0.18,
        }} />
        <div style={{ position: "relative", maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <img src={LOGO} alt="Khadayata" style={{ height: 52, marginBottom: 16, mixBlendMode: "screen" }} />
          <h1 style={{ fontSize: 40, fontWeight: 800, color: "#fff", margin: "0 0 12px", lineHeight: 1.15 }}>
            Matrimonial
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.72)", margin: "0 0 28px", maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
            Find your life partner within the Khadayata community. Verified profiles, respectful connections.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", borderRadius: 12, padding: "12px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>{profiles.length}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", letterSpacing: 1 }}>PROFILES</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", borderRadius: 12, padding: "12px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>{profiles.filter(p => p.verified).length}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", letterSpacing: 1 }}>VERIFIED</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: "#fff", borderBottom: "1px solid #f0ece4", padding: "16px 24px", fontFamily: "'Poppins', sans-serif" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#aaa" }} />
            <Input
              placeholder="Search by name, city, gotra, education..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36, height: 38, fontSize: 13, borderRadius: 8 }}
            />
          </div>
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger style={{ width: 130, height: 38, fontSize: 13, borderRadius: 8 }}>
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="male">Groom</SelectItem>
              <SelectItem value="female">Bride</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dietFilter} onValueChange={setDietFilter}>
            <SelectTrigger style={{ width: 140, height: 38, fontSize: 13, borderRadius: 8 }}>
              <SelectValue placeholder="Diet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Diet</SelectItem>
              <SelectItem value="vegetarian">Vegetarian</SelectItem>
              <SelectItem value="vegan">Vegan</SelectItem>
              <SelectItem value="jain">Jain</SelectItem>
              <SelectItem value="non_vegetarian">Non-Veg</SelectItem>
            </SelectContent>
          </Select>
          <Select value={maritalFilter} onValueChange={setMaritalFilter}>
            <SelectTrigger style={{ width: 160, height: 38, fontSize: 13, borderRadius: 8 }}>
              <SelectValue placeholder="Marital Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Status</SelectItem>
              <SelectItem value="never_married">Never Married</SelectItem>
              <SelectItem value="divorced">Divorced</SelectItem>
              <SelectItem value="widowed">Widowed</SelectItem>
            </SelectContent>
          </Select>
          {user ? (
            <Link to="/matrimonial/manage" style={{
              padding: "8px 18px", borderRadius: 8, background: "#6B2737", color: "#fff",
              textDecoration: "none", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
            }}>
              My Profile
            </Link>
          ) : (
            <Link to="/auth" style={{
              padding: "8px 18px", borderRadius: 8, background: "#F39C12", color: "#fff",
              textDecoration: "none", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
            }}>
              Create Profile
            </Link>
          )}
        </div>
      </div>

      {/* Privacy notice */}
      <div style={{ background: "#FEF9E7", borderBottom: "1px solid #FDEBD0", padding: "10px 24px", fontFamily: "'Poppins', sans-serif" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 8 }}>
          <Lock size={12} style={{ color: "#E67E22", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#E67E22" }}>
            Contact details, full personal information, and rishta connections are only shared with verified members after sign-in.
          </span>
        </div>
      </div>

      {/* Profile Grid */}
      <div style={{ background: "#FFF7E6", minHeight: "60vh", padding: "32px 24px", fontFamily: "'Poppins', sans-serif" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa", fontSize: 14 }}>Loading profiles...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <Heart size={40} style={{ color: "#ddd", margin: "0 auto 12px", display: "block" }} />
              <p style={{ color: "#aaa", fontSize: 14 }}>No profiles match your search.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              {filtered.map(p => {
                const member = p.member as { first_name: string | null; last_name: string | null; dob: string | null; gender: string | null; photo_url: string | null; chapters: { name: string } | null } | null;
                const age = getAge(member?.dob);
                const gender = member?.gender;
                const initials = getInitials(member);
                const accentColor = gender === "female" ? "#C0392B" : "#2C3E50";

                return (
                  <div key={p.id} style={{
                    background: "#fff", borderRadius: 14, overflow: "hidden",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                    border: "1px solid #f0ece4",
                    display: "flex", flexDirection: "column",
                  }}>
                    {/* Profile top */}
                    <div style={{ background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}08)`, padding: "20px 20px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        {member?.photo_url ? (
                          <img
                            src={member.photo_url}
                            alt={initials}
                            style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", border: `2px solid ${accentColor}30` }}
                          />
                        ) : (
                          <div style={{
                            width: 60, height: 60, borderRadius: "50%",
                            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 20, fontWeight: 700, color: "#fff",
                          }}>
                            {initials}
                          </div>
                        )}
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>
                              {member?.first_name} {member?.last_name?.[0]}.
                            </span>
                            {p.verified && (
                              <span style={{ background: "#E8F8F5", color: "#16A085", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
                                Verified
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                            {age ? `${age} yrs` : ""}
                            {age && gender ? " · " : ""}
                            {gender === "male" ? "Groom" : gender === "female" ? "Bride" : ""}
                          </div>
                          {(member?.chapters as { name: string } | null)?.name && (
                            <div style={{ fontSize: 11, color: "#aaa" }}>{(member?.chapters as { name: string } | null)?.name ?? ""}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: "14px 20px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
                      {/* Key info chips */}
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                        {p.marital_status && (
                          <span style={{ background: "#f5f0e8", color: "#888", borderRadius: 20, padding: "2px 8px", fontSize: 10 }}>
                            {MARITAL_LABELS[p.marital_status] ?? p.marital_status}
                          </span>
                        )}
                        {p.diet && (
                          <span style={{ background: "#E8F8F5", color: "#16A085", borderRadius: 20, padding: "2px 8px", fontSize: 10 }}>
                            {DIET_LABELS[p.diet] ?? p.diet}
                          </span>
                        )}
                        {p.manglik && (
                          <span style={{ background: "#FDEDEC", color: "#E74C3C", borderRadius: 20, padding: "2px 8px", fontSize: 10 }}>
                            Manglik
                          </span>
                        )}
                        {p.ekda && (
                          <span style={{ background: "#FEF9E7", color: "#E67E22", borderRadius: 20, padding: "2px 8px", fontSize: 10 }}>
                            Ekda: {p.ekda}
                          </span>
                        )}
                      </div>

                      {/* Education + Location */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10, fontSize: 12, color: "#666" }}>
                        {(p.education_level || p.education_field) && (
                          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <GraduationCap size={11} style={{ color: accentColor, flexShrink: 0 }} />
                            {[p.education_level, p.education_field].filter(Boolean).join(" · ")}
                          </span>
                        )}
                        {p.position_title && (
                          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <User size={11} style={{ color: accentColor, flexShrink: 0 }} />
                            {p.position_title}
                          </span>
                        )}
                        {(p.current_city || p.country) && (
                          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <MapPin size={11} style={{ color: accentColor, flexShrink: 0 }} />
                            {[p.current_city, p.country].filter(Boolean).join(", ")}
                          </span>
                        )}
                        {p.gotra && (
                          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <Star size={11} style={{ color: accentColor, flexShrink: 0 }} />
                            Gotra: {p.gotra}
                          </span>
                        )}
                      </div>

                      {p.about && (
                        <p style={{ fontSize: 12, color: "#777", margin: "0 0 10px", lineHeight: 1.55,
                          overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}>
                          {p.about}
                        </p>
                      )}

                      <LoginGate message="Sign in to view full profile and send introduction" />
                    </div>
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
