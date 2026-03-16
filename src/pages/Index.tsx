import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Globe, Users, Shield, BookOpen, Building2, Briefcase,
  ArrowRight, Heart, Calendar, MapPin, Search, Star,
  ChevronRight, Newspaper, UserCheck, Music, Sparkles,
} from "lucide-react";
import { useTotalMemberCount, useTotalChapterCount, useTotalBusinessCount } from "@/hooks/useChapter";

const LOGO = "/Screenshot_2026-03-16_at_9.18.14_AM.png";

const STATS = [
  { value: "50,000+", label: "Members Worldwide", color: "#F39C12" },
  { value: "67", label: "Chapters", color: "#E91E63" },
  { value: "28", label: "Countries", color: "#1E88E5" },
  { value: "315+", label: "Businesses", color: "#43A047" },
];

const EVENTS = [
  {
    title: "Garba Night 2026",
    type: "Cultural",
    date: "Oct 14",
    location: "Ahmedabad",
    typeColor: "#F39C12",
    img: "https://images.pexels.com/photos/3671083/pexels-photo-3671083.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    title: "Community Meetup",
    type: "Social",
    date: "Nov 2",
    location: "Houston, TX",
    typeColor: "#43A047",
    img: "https://images.pexels.com/photos/1290141/pexels-photo-1290141.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    title: "Kotyark Temple Puja",
    type: "Religious",
    date: "Oct 21",
    location: "Vadodara",
    typeColor: "#1E88E5",
    img: "https://images.pexels.com/photos/2161467/pexels-photo-2161467.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    title: "Youth Networking",
    type: "Professional",
    date: "Nov 10",
    location: "London, UK",
    typeColor: "#E91E63",
    img: "https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
];

const TESTIMONIALS = [
  {
    name: "Rajesh Khadayata",
    chapter: "Ahmedabad Chapter",
    text: "Reconnected with relatives I hadn't spoken to in decades. The directory is simply incredible.",
    stars: 5,
    avatar: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=80",
  },
  {
    name: "Priya Shah",
    chapter: "Houston Chapter",
    text: "The matrimonial feature is safe and verified — found a wonderful match through proper community introductions.",
    stars: 5,
    avatar: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=80",
  },
  {
    name: "Amit Khadayata",
    chapter: "Mumbai Chapter",
    text: "As a business owner, the directory brought me clients from within our own community. Incredible platform!",
    stars: 5,
    avatar: "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=80",
  },
];

const BUSINESS_CATS = ["🍛 Restaurants", "🩺 Doctors", "⚖️ Lawyers", "💼 Consultants", "🏠 Real Estate", "🛍️ Retail"];

const FEATURES = [
  { icon: Globe, label: "Global Identity", desc: "One verified GlobalID across all chapters", color: "#F39C12" },
  { icon: Users, label: "Member Directory", desc: "Find & connect with members worldwide", color: "#43A047" },
  { icon: Shield, label: "Privacy Controls", desc: "Field-level visibility settings", color: "#1E88E5" },
  { icon: Briefcase, label: "Business Network", desc: "List and discover community businesses", color: "#E91E63" },
  { icon: BookOpen, label: "Heritage Archives", desc: "Khadayata Jyoti magazine digitized", color: "#F4B400" },
  { icon: Building2, label: "Kotyark Temple", desc: "Live Aarti, donations & more", color: "#43A047" },
];

export default function Index() {
  const { user } = useAuth();
  const { data: totalMembers } = useTotalMemberCount();
  const { data: totalChapters } = useTotalChapterCount();
  const { data: totalBusinesses } = useTotalBusinessCount();

  const liveStats = [
    { value: totalMembers ? `${totalMembers.toLocaleString()}+` : "50,000+", label: "Members Worldwide", color: "#F39C12" },
    { value: totalChapters ? totalChapters.toString() : "67", label: "Chapters", color: "#E91E63" },
    { value: "28", label: "Countries", color: "#1E88E5" },
    { value: totalBusinesses ? `${totalBusinesses.toLocaleString()}+` : "315+", label: "Businesses", color: "#43A047" },
  ];

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", background: "#FFF7E6", color: "#2E2E2E" }}>

      {/* ─── NAVBAR ─── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,247,230,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(232,163,23,0.25)",
        boxShadow: "0 1px 20px rgba(243,156,18,0.08)",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
          <Link to="/" style={{ display: "flex", alignItems: "center" }}>
            <img
              src={LOGO}
              alt="Khadayata"
              style={{ height: 52, width: "auto", mixBlendMode: "multiply" }}
            />
          </Link>
          <nav style={{ display: "flex", gap: 28, fontSize: 14, fontWeight: 500 }} className="hidden md:flex">
            {[["Events", "/events"], ["Directory", "/directory"], ["Business", "/business"], ["Chapters", "/chapters"], ["News", "/news"]].map(([label, href]) => (
              <Link key={href} to={href} style={{ color: "#2E2E2E", textDecoration: "none", transition: "color .2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#F39C12")}
                onMouseLeave={e => (e.currentTarget.style.color = "#2E2E2E")}>
                {label}
              </Link>
            ))}
          </nav>
          <div style={{ display: "flex", gap: 10 }}>
            {user ? (
              <Link to="/dashboard" style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 20px", borderRadius: 50, fontSize: 13, fontWeight: 600, color: "#fff",
                background: "linear-gradient(135deg,#F39C12,#E91E63)",
                textDecoration: "none", boxShadow: "0 4px 15px rgba(243,156,18,.4)",
              }}>Dashboard <ArrowRight size={15} /></Link>
            ) : (
              <>
                <Link to="/auth" style={{
                  padding: "9px 18px", borderRadius: 50, fontSize: 13, fontWeight: 600,
                  border: "1.5px solid #E8A317", color: "#2E2E2E", textDecoration: "none",
                  background: "transparent", transition: "background .2s",
                }}>Sign In</Link>
                <Link to="/auth" style={{
                  padding: "9px 22px", borderRadius: 50, fontSize: 13, fontWeight: 700, color: "#fff",
                  background: "linear-gradient(135deg,#F39C12,#E91E63)",
                  textDecoration: "none", boxShadow: "0 4px 18px rgba(243,156,18,.45)",
                }}>Join Free</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section style={{ position: "relative", minHeight: "92vh", display: "flex", alignItems: "center", overflow: "hidden" }}>
        {/* Full-bleed hero image */}
        <div style={{ position: "absolute", inset: 0 }}>
          <img
            src="https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg?auto=compress&cs=tinysrgb&w=1600"
            alt="Khadayata Community"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(110deg, rgba(46,46,46,0.82) 0%, rgba(46,46,46,0.55) 55%, rgba(243,156,18,0.15) 100%)" }} />
          {/* Subtle mandala overlay */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.07,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Ccircle cx='150' cy='150' r='140' fill='none' stroke='%23F4B400' stroke-width='1'/%3E%3Ccircle cx='150' cy='150' r='110' fill='none' stroke='%23F39C12' stroke-width='0.8'/%3E%3Ccircle cx='150' cy='150' r='80' fill='none' stroke='%23E91E63' stroke-width='0.7'/%3E%3Ccircle cx='150' cy='150' r='50' fill='none' stroke='%231E88E5' stroke-width='0.6'/%3E%3Cpath d='M150 10 L160 140 L150 150 L140 140 Z' fill='%23F4B400'/%3E%3Cpath d='M290 150 L160 160 L150 150 L160 140 Z' fill='%23F39C12'/%3E%3Cpath d='M150 290 L140 160 L150 150 L160 160 Z' fill='%23E91E63'/%3E%3Cpath d='M10 150 L140 140 L150 150 L140 160 Z' fill='%2343A047'/%3E%3C/svg%3E")`,
            backgroundSize: "300px 300px",
          }} />
        </div>

        <div style={{ position: "relative", zIndex: 2, maxWidth: 1280, margin: "0 auto", padding: "80px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }} className="hero-grid">
          {/* Left: Text */}
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 16px", borderRadius: 50, marginBottom: 24,
              background: "rgba(243,156,18,0.2)", border: "1px solid rgba(243,156,18,0.5)",
              fontSize: 12, fontWeight: 600, color: "#F4B400", letterSpacing: "0.06em",
            }}>
              <Sparkles size={13} /> KHADAYATA COMMUNITY PLATFORM
            </div>
            <h1 style={{ fontSize: "clamp(2.4rem,5vw,3.8rem)", fontWeight: 800, lineHeight: 1.1, color: "#fff", margin: 0 }}>
              One Community.
              <br />
              <span style={{ background: "linear-gradient(90deg,#F39C12,#E91E63,#F4B400)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                One Global Identity.
              </span>
            </h1>
            <p style={{ marginTop: 20, fontSize: 17, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, maxWidth: 480 }}>
              Connecting {totalMembers ? totalMembers.toLocaleString() : "50,000+"} Khadayata families across 28 countries — through verified membership, events, heritage, and business.
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 36, flexWrap: "wrap" }}>
              <Link to="/auth" style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "14px 32px", borderRadius: 50, fontSize: 15, fontWeight: 700, color: "#fff",
                background: "linear-gradient(135deg,#F39C12,#E91E63)",
                textDecoration: "none", boxShadow: "0 6px 28px rgba(243,156,18,.55)",
                transition: "transform .2s",
              }}>Join Community <ArrowRight size={18} /></Link>
              <Link to="/events" style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "14px 28px", borderRadius: 50, fontSize: 15, fontWeight: 600, color: "#fff",
                background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.3)",
                textDecoration: "none", backdropFilter: "blur(8px)",
              }}>Explore Events</Link>
            </div>
          </div>

          {/* Right: Stats card */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="hero-right">
            <div style={{
              background: "rgba(255,255,255,0.1)", backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.2)", borderRadius: 24, padding: "28px 32px",
            }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", marginBottom: 20 }}>LIVE COMMUNITY STATS</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {liveStats.map((s) => (
                  <div key={s.label} style={{ textAlign: "center", padding: "14px", background: "rgba(255,255,255,0.07)", borderRadius: 16, border: `1px solid ${s.color}40` }}>
                    <p style={{ fontSize: "1.9rem", fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Quick search */}
            <div style={{
              background: "rgba(255,255,255,0.1)", backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, padding: "20px 24px",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <Search size={18} style={{ color: "rgba(255,255,255,0.5)", flexShrink: 0 }} />
              <Link to="/directory" style={{ flex: 1, color: "rgba(255,255,255,0.5)", fontSize: 14, textDecoration: "none" }}>
                Search members, businesses, chapters…
              </Link>
              <Link to="/directory" style={{
                padding: "8px 18px", borderRadius: 50, fontSize: 12, fontWeight: 700, color: "#2E2E2E",
                background: "#F4B400", textDecoration: "none",
              }}>Search</Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ width: 1, height: 40, background: "linear-gradient(to bottom,rgba(255,255,255,0),rgba(255,255,255,0.5))" }} />
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em" }}>SCROLL</p>
        </div>
      </section>

      {/* ─── FESTIVAL GRADIENT BAR ─── */}
      <div style={{ background: "linear-gradient(90deg,#F39C12,#E91E63,#1E88E5,#43A047)", height: 4 }} />

      {/* ─── FEATURES STRIP ─── */}
      <section style={{ background: "#fff", padding: "72px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "#F39C12", textTransform: "uppercase", marginBottom: 10 }}>Platform Features</p>
            <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 800, margin: 0, color: "#2E2E2E" }}>Everything Your Community Needs</h2>
            <p style={{ marginTop: 12, color: "#2E2E2E99", fontSize: 16, maxWidth: 520, margin: "12px auto 0" }}>A comprehensive platform built for every aspect of Khadayata community life.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 20 }}>
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} style={{
                  padding: "28px 24px", borderRadius: 20,
                  background: "#FFF7E6", border: `1.5px solid ${f.color}30`,
                  borderLeft: `4px solid ${f.color}`,
                  transition: "transform .2s, box-shadow .2s",
                  cursor: "default",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 12px 32px ${f.color}20`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${f.color}18`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <Icon size={22} style={{ color: f.color }} />
                  </div>
                  <p style={{ fontWeight: 700, fontSize: 15, margin: 0, color: "#2E2E2E" }}>{f.label}</p>
                  <p style={{ fontSize: 13, color: "#2E2E2E80", marginTop: 6, lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── UPCOMING EVENTS ─── */}
      <section style={{ background: "#FDEBD0", padding: "80px 24px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Ccircle cx='100' cy='100' r='90' fill='none' stroke='%23F39C12' stroke-width='1'/%3E%3Ccircle cx='100' cy='100' r='60' fill='none' stroke='%23E91E63' stroke-width='0.8'/%3E%3C/svg%3E")`, backgroundSize: "200px 200px" }} />
        <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "#E91E63", textTransform: "uppercase", marginBottom: 8 }}>What's Happening</p>
              <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.4rem)", fontWeight: 800, margin: 0, color: "#2E2E2E" }}>Upcoming Events</h2>
            </div>
            <Link to="/events" style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 50,
              border: "1.5px solid #F39C12", color: "#F39C12", fontSize: 13, fontWeight: 600, textDecoration: "none",
              transition: "background .2s",
            }}>View All Events <ChevronRight size={16} /></Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 24 }}>
            {EVENTS.map((ev) => (
              <div key={ev.title} style={{
                borderRadius: 20, overflow: "hidden", background: "#fff",
                boxShadow: "0 4px 20px rgba(46,46,46,0.08)",
                transition: "transform .25s, box-shadow .25s",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(46,46,46,0.16)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(46,46,46,0.08)"; }}>
                <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
                  <img src={ev.img} alt={ev.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .4s" }}
                    onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.06)")}
                    onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,0.55),transparent)" }} />
                  <span style={{
                    position: "absolute", top: 14, left: 14, padding: "4px 12px", borderRadius: 50,
                    fontSize: 11, fontWeight: 700, color: "#fff", background: ev.typeColor,
                  }}>{ev.type}</span>
                </div>
                <div style={{ padding: "18px 20px" }}>
                  <p style={{ fontWeight: 700, fontSize: 16, margin: 0, color: "#2E2E2E" }}>{ev.title}</p>
                  <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "#2E2E2E80" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={12} />{ev.date}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} />{ev.location}</span>
                  </div>
                  <Link to="/events" style={{
                    display: "block", marginTop: 16, padding: "10px 0", borderRadius: 12, textAlign: "center",
                    fontSize: 13, fontWeight: 700, color: "#fff", background: ev.typeColor, textDecoration: "none",
                  }}>View Details</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMMUNITY DIRECTORY ─── */}
      <section style={{ padding: "80px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "#1E88E5", textTransform: "uppercase", marginBottom: 10 }}>Find Your People</p>
          <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.5rem)", fontWeight: 800, margin: 0, color: "#2E2E2E" }}>Community Directory</h2>
          <p style={{ color: "#2E2E2E80", marginTop: 12, fontSize: 15, maxWidth: 500, margin: "12px auto 36px" }}>Search members, businesses, and chapters across the entire Khadayata global network.</p>

          {/* Search bar */}
          <div style={{
            display: "flex", alignItems: "center", background: "#fff",
            border: "2px solid #E8A317", borderRadius: 60, padding: "6px 8px 6px 20px",
            boxShadow: "0 8px 32px rgba(232,163,23,0.18)",
          }}>
            <Search size={18} style={{ color: "#2E2E2E40", flexShrink: 0 }} />
            <Link to="/directory" style={{ flex: 1, fontSize: 15, color: "#2E2E2E40", padding: "8px 12px", textDecoration: "none", textAlign: "left" }}>
              Search members, businesses, chapters...
            </Link>
            <Link to="/directory" style={{
              padding: "12px 28px", borderRadius: 50, fontSize: 14, fontWeight: 700, color: "#fff",
              background: "linear-gradient(135deg,#F39C12,#E91E63)", textDecoration: "none",
            }}>Search</Link>
          </div>

          {/* Quick links */}
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
            {[
              { label: "Find Members", link: "/directory", color: "#F39C12" },
              { label: "Find Businesses", link: "/business", color: "#43A047" },
              { label: "Find Chapters", link: "/chapters", color: "#1E88E5" },
            ].map((item) => (
              <Link key={item.label} to={item.link} style={{
                padding: "10px 22px", borderRadius: 50, fontSize: 13, fontWeight: 600,
                border: `2px solid ${item.color}`, color: item.color, background: `${item.color}0f`,
                textDecoration: "none", transition: "all .2s",
              }}>{item.label}</Link>
            ))}
          </div>

          {/* Business categories */}
          <div style={{ marginTop: 44 }}>
            <p style={{ fontSize: 12, color: "#2E2E2E60", fontWeight: 600, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Popular Business Categories</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {BUSINESS_CATS.map((cat) => (
                <Link key={cat} to="/business" style={{
                  padding: "9px 18px", borderRadius: 50, fontSize: 13, fontWeight: 500,
                  background: "#FFF7E6", border: "1.5px solid #E8A31760", color: "#2E2E2E",
                  textDecoration: "none", transition: "all .2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#F39C12"; e.currentTarget.style.background = "#FFF0D0"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#E8A31760"; e.currentTarget.style.background = "#FFF7E6"; }}>
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CULTURAL HERITAGE ─── */}
      <section style={{ background: "#FDEBD0", padding: "80px 24px", overflow: "hidden", position: "relative" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }} className="split-grid">
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "#43A047", textTransform: "uppercase", marginBottom: 12 }}>Our Roots</p>
            <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.5rem)", fontWeight: 800, margin: 0, color: "#2E2E2E", lineHeight: 1.2 }}>
              A Family That Spans<br />
              <span style={{ color: "#F39C12" }}>Continents</span>
            </h2>
            <p style={{ marginTop: 18, fontSize: 15, color: "#2E2E2E99", lineHeight: 1.75, maxWidth: 460 }}>
              From Ahmedabad to Houston, Mumbai to London — Khadayata families thrive across borders.
              Our platform preserves ancient traditions while powering modern connections.
            </p>
            <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { icon: Users, label: "Member Directory", color: "#F39C12" },
                { icon: Heart, label: "Matrimonial", color: "#E91E63" },
                { icon: Calendar, label: "Events", color: "#1E88E5" },
                { icon: Building2, label: "Temple", color: "#43A047" },
                { icon: Newspaper, label: "News & Archives", color: "#F4B400" },
                { icon: BookOpen, label: "Oral History", color: "#1E88E5" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    borderRadius: 14, background: "#fff", border: "1px solid rgba(232,163,23,0.25)",
                    transition: "border-color .2s",
                  }}>
                    <Icon size={18} style={{ color: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#2E2E2E" }}>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ position: "relative" }} className="hide-mobile">
            <div style={{ borderRadius: 28, overflow: "hidden", border: "3px solid #E8A317", boxShadow: "0 20px 60px rgba(243,156,18,0.2)" }}>
              <img
                src="https://images.pexels.com/photos/3586966/pexels-photo-3586966.jpeg?auto=compress&cs=tinysrgb&w=700"
                alt="Indian cultural celebration"
                style={{ width: "100%", height: 520, objectFit: "cover", display: "block" }}
              />
            </div>
            <div style={{
              position: "absolute", bottom: -20, left: -20, borderRadius: 20, padding: "16px 22px",
              background: "linear-gradient(135deg,#F39C12,#E91E63)", color: "#fff",
              boxShadow: "0 8px 24px rgba(243,156,18,0.45)",
            }}>
              <p style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0 }}>28</p>
              <p style={{ fontSize: 12, margin: "2px 0 0", opacity: 0.85 }}>Countries</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BUSINESS NETWORK ─── */}
      <section style={{ background: "#fff", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }} className="split-grid">
          <div style={{ position: "relative" }} className="hide-mobile">
            <div style={{ borderRadius: 28, overflow: "hidden", border: "3px solid #43A047", boxShadow: "0 20px 60px rgba(67,160,71,0.2)" }}>
              <img
                src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=700"
                alt="Business network"
                style={{ width: "100%", height: 460, objectFit: "cover", display: "block" }}
              />
            </div>
            <div style={{
              position: "absolute", top: -16, right: -16, borderRadius: 20, padding: "16px 22px",
              background: "linear-gradient(135deg,#43A047,#1E88E5)", color: "#fff",
              boxShadow: "0 8px 24px rgba(67,160,71,0.45)",
            }}>
              <p style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>{totalBusinesses ? `${totalBusinesses}+` : "315+"}</p>
              <p style={{ fontSize: 12, margin: "2px 0 0", opacity: 0.85 }}>Businesses</p>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "#43A047", textTransform: "uppercase", marginBottom: 12 }}>Business Network</p>
            <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.5rem)", fontWeight: 800, margin: 0, color: "#2E2E2E", lineHeight: 1.2 }}>
              Support <span style={{ color: "#F39C12" }}>Khadayata</span><br />Businesses
            </h2>
            <p style={{ marginTop: 18, fontSize: 15, color: "#2E2E2E99", lineHeight: 1.75, maxWidth: 440 }}>
              Discover businesses run by community members — from restaurants to professional services. Shop local, grow together.
            </p>
            <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { icon: Globe, text: "Join any chapter worldwide", color: "#F39C12" },
                { icon: Calendar, text: "Attend exclusive member events", color: "#E91E63" },
                { icon: Briefcase, text: "Expand your business network", color: "#43A047" },
                { icon: Heart, text: "Enrol in volunteer programs", color: "#1E88E5" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${item.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={17} style={{ color: item.color }} />
                    </div>
                    <span style={{ fontSize: 14, color: "#2E2E2ECC" }}>{item.text}</span>
                  </div>
                );
              })}
            </div>
            <Link to="/business" style={{
              display: "inline-flex", alignItems: "center", gap: 8, marginTop: 32,
              padding: "14px 30px", borderRadius: 50, fontSize: 14, fontWeight: 700, color: "#fff",
              background: "linear-gradient(135deg,#43A047,#1E88E5)", textDecoration: "none",
              boxShadow: "0 6px 24px rgba(67,160,71,0.35)",
            }}>Browse Businesses <ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section style={{ background: "#FDEBD0", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "#E91E63", textTransform: "uppercase", marginBottom: 10 }}>Community Love</p>
            <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.4rem)", fontWeight: 800, margin: 0, color: "#2E2E2E" }}>Loved by Our Members</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 24 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={{
                background: "#fff", borderRadius: 24, padding: "28px",
                boxShadow: "0 4px 20px rgba(46,46,46,0.07)", border: "1px solid rgba(232,163,23,0.2)",
                transition: "transform .2s, box-shadow .2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(46,46,46,0.12)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(46,46,46,0.07)"; }}>
                <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
                  {[1,2,3,4,5].map(s => <Star key={s} size={15} style={{ fill: "#F4B400", color: "#F4B400" }} />)}
                </div>
                <p style={{ fontSize: 15, color: "#2E2E2EBB", lineHeight: 1.65, fontStyle: "italic", margin: 0 }}>"{t.text}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(232,163,23,0.2)" }}>
                  <img src={t.avatar} alt={t.name} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid #F39C12" }} />
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: "#2E2E2E" }}>{t.name}</p>
                    <p style={{ fontSize: 12, color: "#2E2E2E70", margin: "3px 0 0" }}>{t.chapter}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section style={{ position: "relative", padding: "88px 24px", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#F4B400 0%,#E8A317 45%,#F39C12 100%)" }} />
        <div style={{
          position: "absolute", inset: 0, opacity: 0.1,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Ccircle cx='150' cy='150' r='140' fill='none' stroke='%23fff' stroke-width='1.5'/%3E%3Ccircle cx='150' cy='150' r='100' fill='none' stroke='%23fff' stroke-width='1'/%3E%3Ccircle cx='150' cy='150' r='60' fill='none' stroke='%23fff' stroke-width='0.8'/%3E%3C/svg%3E")`,
          backgroundSize: "300px 300px",
        }} />
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <Sparkles size={32} style={{ color: "#fff", opacity: 0.8, marginBottom: 16 }} />
          <h2 style={{ fontSize: "clamp(2rem,4vw,3.2rem)", fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.2 }}>
            Join {totalMembers ? `${totalMembers.toLocaleString()}+` : "50,000+"} Khadayata Members Worldwide
          </h2>
          <p style={{ marginTop: 16, fontSize: 17, color: "rgba(255,255,255,0.85)", maxWidth: 520, margin: "16px auto 0", lineHeight: 1.65 }}>
            Create your free account today and become part of the world's most connected Khadayata community platform.
          </p>
          <Link to="/auth" style={{
            display: "inline-flex", alignItems: "center", gap: 10, marginTop: 40,
            padding: "16px 42px", borderRadius: 50, fontSize: 16, fontWeight: 800, color: "#F39C12",
            background: "#fff", textDecoration: "none",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            transition: "transform .2s, box-shadow .2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}>
            Register Free <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ background: "#1a1a1a", color: "#fff", padding: "60px 24px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 40, paddingBottom: 48 }}>
            <div>
              <img src={LOGO} alt="Khadayata" style={{ height: 50, width: "auto", mixBlendMode: "screen", opacity: 0.92, marginBottom: 16 }} />
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 16 }}>
                Preserving heritage. Empowering community. Connecting generations.
              </p>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.8 }}>
                <p style={{ margin: 0 }}>1320 Pepperhill Ln, Fort Worth, TX 76131</p>
                <a href="tel:+16824329400" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none", display: "block" }}>+1 (682) 432-9400</a>
                <a href="mailto:support@khadayataonline.com" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none", display: "block" }}>support@khadayataonline.com</a>
              </div>
            </div>
            {[
              { title: "Platform", links: [["Directory", "/directory"], ["Events", "/events"], ["Business", "/business"], ["Matrimonial", "/matrimonial"], ["Contact", "/contact"]] },
              { title: "Heritage", links: [["Kotyark Temple", "/temple"], ["Archives", "/archives"], ["News", "/news"], ["Oral History", "/oral-history"], ["Elders Council", "/elders-council"]] },
              { title: "Legal", links: [["Terms of Use", "/terms"], ["Privacy Policy", "/privacy"], ["Accessibility", "/accessibility"]] },
            ].map((col) => (
              <div key={col.title}>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.55)", textTransform: "uppercase", marginBottom: 16 }}>{col.title}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {col.links.map(([label, href]) => (
                    <li key={href}><Link to={href} style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none", transition: "color .2s" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#F4B400")}
                      onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}>{label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "20px 0", textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            &copy; {new Date().getFullYear()} Khadayata. All rights reserved. &bull; Jai Jai Khadayata
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-right { display: none !important; }
          .split-grid { grid-template-columns: 1fr !important; }
          .hide-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}
