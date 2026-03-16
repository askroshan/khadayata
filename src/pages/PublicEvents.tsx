import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import PublicLayout from "@/components/PublicLayout";
import SEOMeta from "@/components/SEOMeta";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Clock, Lock, ArrowRight, Search, Video, Globe, Ticket } from "lucide-react";
import { format, isPast } from "date-fns";

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

export default function PublicEvents() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["public-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, description, category, event_type, starts_at, ends_at, venue, virtual_url, max_capacity, fee_amount, fee_currency, tags, organizer_name, cover_image_url, chapter_id, consent_required, countries(name), states(name), cities(name), chapters(name), event_rsvps(id)")
        .eq("status", "published")
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const now = new Date();
  const upcoming = events.filter(e => !isPast(new Date(e.ends_at ?? e.starts_at)));
  const past = events.filter(e => isPast(new Date(e.ends_at ?? e.starts_at)));
  const list = tab === "upcoming" ? upcoming : past;

  const filtered = list.filter(e =>
    !search ||
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.category?.toLowerCase().includes(search.toLowerCase()) ||
    e.organizer_name?.toLowerCase().includes(search.toLowerCase()) ||
    (e.cities as any)?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const categoryColors: Record<string, string> = {
    festival: "#E67E22", cultural: "#8E44AD", religious: "#C0392B",
    sports: "#27AE60", social: "#2980B9", educational: "#16A085",
    business: "#2C3E50", other: "#7F8C8D",
  };

  return (
    <PublicLayout title="Events">
      <SEOMeta
        title="Community Events — Khadayata"
        description="Browse upcoming festivals, cultural programs, religious gatherings, and community events for the Khadayata community."
        keywords="khadayata events, community festivals, cultural programs, Khadayata gatherings"
      />

      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        padding: "64px 24px 48px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Poppins', sans-serif",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=1600)`,
          backgroundSize: "cover", backgroundPosition: "center",
          opacity: 0.18,
        }} />
        <div style={{ position: "relative", maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <img src={LOGO} alt="Khadayata" style={{ height: 52, marginBottom: 16, mixBlendMode: "screen" }} />
          <h1 style={{ fontSize: 40, fontWeight: 800, color: "#fff", margin: "0 0 12px", lineHeight: 1.15 }}>
            Community Events
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.72)", margin: "0 0 28px", maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
            Festivals, cultural programs, spiritual gatherings, and community celebrations — all in one place.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", borderRadius: 12, padding: "12px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>{upcoming.length}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", letterSpacing: 1 }}>UPCOMING</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", borderRadius: 12, padding: "12px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>{past.length}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", letterSpacing: 1 }}>PAST EVENTS</div>
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
              placeholder="Search events, organizer, city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36, height: 38, fontSize: 13, borderRadius: 8 }}
            />
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {(["upcoming", "past"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 600,
                  background: tab === t ? "#1a1a2e" : "#f5f0e8",
                  color: tab === t ? "#fff" : "#555",
                  transition: "all 0.15s",
                }}
              >
                {t === "upcoming" ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
              </button>
            ))}
          </div>
          {user && (
            <Link to="/events/manage" style={{
              padding: "8px 18px", borderRadius: 8, background: "#F39C12", color: "#fff",
              textDecoration: "none", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
            }}>
              + Manage Events
            </Link>
          )}
        </div>
      </div>

      {/* Events List */}
      <div style={{ background: "#FFF7E6", minHeight: "60vh", padding: "32px 24px", fontFamily: "'Poppins', sans-serif" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa", fontSize: 14 }}>Loading events...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <Calendar size={40} style={{ color: "#ddd", margin: "0 auto 12px", display: "block" }} />
              <p style={{ color: "#aaa", fontSize: 14 }}>No {tab} events found.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {filtered.map(event => {
                const catColor = categoryColors[event.category ?? "other"] ?? "#7F8C8D";
                const locationParts = [
                  (event.cities as any)?.name,
                  (event.states as any)?.name,
                  (event.countries as any)?.name,
                ].filter(Boolean);
                const rsvpCount = Array.isArray(event.event_rsvps) ? event.event_rsvps.length : 0;
                const isFree = !event.fee_amount || event.fee_amount === 0;

                return (
                  <div key={event.id} style={{
                    background: "#fff", borderRadius: 14, overflow: "hidden",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "flex",
                    flexDirection: "row", border: "1px solid #f0ece4",
                  }}>
                    {/* Date sidebar */}
                    <div style={{
                      background: catColor, minWidth: 80, display: "flex",
                      flexDirection: "column", alignItems: "center", justifyContent: "center",
                      padding: "20px 12px", textAlign: "center", flexShrink: 0,
                    }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                        {format(new Date(event.starts_at), "d")}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {format(new Date(event.starts_at), "MMM")}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
                        {format(new Date(event.starts_at), "yyyy")}
                      </div>
                    </div>

                    {/* Cover image */}
                    {event.cover_image_url && (
                      <div style={{
                        width: 140, minHeight: 120, flexShrink: 0,
                        background: `url(${event.cover_image_url}) center/cover no-repeat`,
                      }} />
                    )}

                    {/* Content */}
                    <div style={{ padding: "18px 20px", flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        <span style={{
                          background: catColor + "18", color: catColor,
                          borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700,
                          textTransform: "capitalize",
                        }}>
                          {event.category ?? "event"}
                        </span>
                        {event.event_type === "virtual" && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3, background: "#E8F8F5", color: "#16A085", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>
                            <Video size={9} /> Virtual
                          </span>
                        )}
                        {event.event_type === "hybrid" && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3, background: "#EBF5FB", color: "#2980B9", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>
                            <Globe size={9} /> Hybrid
                          </span>
                        )}
                        {isFree ? (
                          <span style={{ background: "#E8F8F5", color: "#27AE60", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>Free</span>
                        ) : (
                          <span style={{ display: "flex", alignItems: "center", gap: 3, background: "#FEF9E7", color: "#E67E22", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>
                            <Ticket size={9} /> {event.fee_amount} {event.fee_currency}
                          </span>
                        )}
                      </div>

                      <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1a1a2e", margin: "0 0 6px", lineHeight: 1.3 }}>
                        {event.name}
                      </h3>

                      {event.description && (
                        <p style={{ fontSize: 13, color: "#555", margin: "0 0 10px", lineHeight: 1.55,
                          overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical" as any,
                        }}>
                          {event.description}
                        </p>
                      )}

                      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "#777" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={11} style={{ color: catColor }} />
                          {format(new Date(event.starts_at), "EEE, MMM d · h:mm a")}
                        </span>
                        {event.venue && event.event_type !== "virtual" && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <MapPin size={11} style={{ color: catColor }} />
                            {event.venue}
                          </span>
                        )}
                        {locationParts.length > 0 && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Globe size={11} style={{ color: catColor }} />
                            {locationParts.join(", ")}
                          </span>
                        )}
                        {rsvpCount > 0 && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Users size={11} style={{ color: catColor }} />
                            {rsvpCount} attending
                            {event.max_capacity ? ` · ${event.max_capacity} capacity` : ""}
                          </span>
                        )}
                        {(event.chapters as any)?.name && (
                          <span style={{ fontSize: 11, color: "#aaa" }}>
                            {(event.chapters as any).name}
                          </span>
                        )}
                      </div>

                      {event.tags && (event.tags as string[]).length > 0 && (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                          {(event.tags as string[]).slice(0, 4).map(tag => (
                            <span key={tag} style={{
                              background: "#f5f0e8", color: "#777",
                              borderRadius: 6, padding: "2px 8px", fontSize: 10,
                            }}>#{tag}</span>
                          ))}
                        </div>
                      )}

                      <LoginGate message="Sign in to RSVP, view contact details, or get the virtual link" />
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
