import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Globe, Users, Shield, BookOpen, Building2, Briefcase,
  ArrowRight, Heart, Calendar, MapPin, Search, Star,
  ChevronRight, Newspaper, Music, Sparkles,
} from "lucide-react";
import { useTotalMemberCount, useTotalChapterCount, useTotalBusinessCount, useTotalCountryCount } from "@/hooks/useChapter";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import SEOMeta from "@/components/SEOMeta";

const LOGO = "/Screenshot_2026-03-16_at_9.18.14_AM.png";
const HERO_IMG = "/hero-temple-community.webp";
const MANDALA_IMG = "/mandala-pattern.webp";
const COMMUNITY_IMG = "/community-celebration.webp";
const BUSINESS_IMG = "/business-network.webp";

// WCAG 2.2 AA accessible color system
// Accent colors for graphical elements (borders, backgrounds, gradients) — not used as text on light bg
const ACCENT = {
  saffron: "#F39C12",
  pink: "#E91E63",
  blue: "#1E88E5",
  green: "#43A047",
  gold: "#F4B400",
};
// Accessible text colors on light backgrounds (cream/sand/white) — meet 4.5:1 on #FDEBD0
const TEXT_ACCENT = {
  saffron: "#96600b",
  pink: "#cf1a58",
  blue: "#186eb9",
  green: "#327935",
  gold: "#886400",
};
// Accessible text colors on dark hero card (~#444) — meet 3:1 for large text
const LIGHT_ACCENT = {
  saffron: "#ffb74d",
  pink: "#ff5ba8",
  blue: "#42a5f5",
  green: "#66bb6a",
  gold: "#ffca28",
};

const FEATURES = [
  { icon: Globe, label: "Global Identity", desc: "One verified GlobalID across all chapters", color: ACCENT.saffron, textColor: TEXT_ACCENT.saffron },
  { icon: Users, label: "Member Directory", desc: "Find & connect with members worldwide", color: ACCENT.green, textColor: TEXT_ACCENT.green },
  { icon: Shield, label: "Privacy Controls", desc: "Field-level visibility settings", color: ACCENT.blue, textColor: TEXT_ACCENT.blue },
  { icon: Briefcase, label: "Business Network", desc: "List and discover community businesses", color: ACCENT.pink, textColor: TEXT_ACCENT.pink },
  { icon: BookOpen, label: "Heritage Archives", desc: "Khadayata Jyoti magazine digitized", color: ACCENT.gold, textColor: TEXT_ACCENT.gold },
  { icon: Building2, label: "Kotyark Temple", desc: "Live Aarti, donations & more", color: ACCENT.green, textColor: TEXT_ACCENT.green },
];

const EVENTS = [
  { title: "Garba Night 2026", type: "Cultural", date: "Oct 14", location: "Ahmedabad", typeColor: ACCENT.saffron, textColor: TEXT_ACCENT.saffron },
  { title: "Community Meetup", type: "Social", date: "Nov 2", location: "Houston, TX", typeColor: ACCENT.green, textColor: TEXT_ACCENT.green },
  { title: "Kotyark Temple Puja", type: "Religious", date: "Oct 21", location: "Vadodara", typeColor: ACCENT.blue, textColor: TEXT_ACCENT.blue },
  { title: "Youth Networking", type: "Professional", date: "Nov 10", location: "London, UK", typeColor: ACCENT.pink, textColor: TEXT_ACCENT.pink },
];

const TESTIMONIALS = [
  { name: "Rajesh Khadayata", chapter: "Ahmedabad Chapter", text: "Reconnected with relatives I hadn't spoken to in decades. The directory is simply incredible.", stars: 5 },
  { name: "Priya Shah", chapter: "Houston Chapter", text: "The matrimonial feature is safe and verified — found a wonderful match through proper community introductions.", stars: 5 },
  { name: "Amit Khadayata", chapter: "Mumbai Chapter", text: "As a business owner, the directory brought me clients from within our own community. Incredible platform!", stars: 5 },
];

const BUSINESS_CATS = ["Restaurants", "Doctors", "Lawyers", "Consultants", "Real Estate", "Retail"];

type RevealProps = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
};

function Reveal({ children, delay = 0, className, style }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function AnimatedCounter({ target, suffix = "", duration = 1800 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || target <= 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const start = performance.now();
            const startVal = count;
            const tick = (now: number) => {
              const progress = Math.min((now - start) / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              setCount(Math.floor(startVal + (target - startVal) * eased));
              if (progress < 1) requestAnimationFrame(tick);
              else setCount(target);
            };
            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function useParallax() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const onScroll = () => setOffset(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return offset;
}

export default function Index() {
  const { user } = useAuth();
  const { data: totalMembers } = useTotalMemberCount();
  const { data: totalChapters } = useTotalChapterCount();
  const { data: totalBusinesses } = useTotalBusinessCount();
  const { data: totalCountries } = useTotalCountryCount();
  const scrollY = useParallax();

  const { data: latestMembers, isLoading: latestLoading } = useQuery({
    queryKey: ["homepage-latest-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, first_name, last_name, global_id, photo_url, verification_level, created_at, chapters(name)")
        .eq("onboarding_completed", true)
        .gte("verification_level", 1)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const liveStats = [
    { value: totalMembers ?? 0, loaded: totalMembers != null, suffix: "+", label: "Members Worldwide", color: LIGHT_ACCENT.saffron },
    { value: totalChapters ?? 0, loaded: totalChapters != null, suffix: "", label: "Chapters", color: LIGHT_ACCENT.pink },
    { value: totalCountries ?? 0, loaded: totalCountries != null, suffix: "", label: "Countries", color: LIGHT_ACCENT.blue },
    { value: totalBusinesses ?? 0, loaded: totalBusinesses != null, suffix: "", label: "Businesses", color: LIGHT_ACCENT.green },
  ];

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", background: "#FFF7E6", color: "#2E2E2E" }}>
      <SEOMeta
        title={undefined}
        description="Khadayata Online — the global digital home for the Khadayata community. Verified member directory, events, business network, matrimonial, heritage archives, and Kotyark Temple across 28 countries and 67 chapters."
        keywords="Khadayata, Khadayata community, Khadayata Online, Gujarati community, Indian community, Kotyark Temple, Khadayata chapters, Khadayata members, Hindu community, Indian diaspora, Khadayata heritage directory"
        url="/"
        breadcrumbs={[{ name: "Home", url: "/" }]}
        faq={[
          { question: "What is the Khadayata community?", answer: "The Khadayata community is a Gujarati Hindu community originating from the Kutch and Saurashtra regions of Gujarat, India. They are devotees of Kotyark Surya (Sun God) and have a global diaspora across 28+ countries." },
          { question: "What is Khadayata Online?", answer: "Khadayata Online (khadayataonline.com) is the official global digital platform for the Khadayata community, providing a verified member directory, chapter management, events, matrimonial services, business networking, heritage archives, and community governance." },
          { question: "How do I find a Khadayata chapter near me?", answer: "Visit the Chapters page at khadayataonline.com/chapters to see all 67+ chapters across 28 countries. Each chapter has its own page with local events, members, and businesses." },
          { question: "What is a Khadayata Global ID?", answer: "A Khadayata Global ID (format: KHD-XXXXXX) is a unique verified identifier assigned to community members. It works across all chapters worldwide and persists even if a member transfers between chapters." },
          { question: "What is Kotyark Temple?", answer: "Kotyark Temple is the principal temple of the Khadayata community, dedicated to Kotyark Surya (the Sun God), located in Koteshwar, Gujarat, India. Virtual access and live Aarti streaming are available on Khadayata Online." },
        ]}
      />

      {/* ─── NAVBAR ─── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,247,230,0.88)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(232,163,23,0.25)",
        boxShadow: "0 1px 20px rgba(243,156,18,0.06)",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
          <Link to="/" style={{ display: "flex", alignItems: "center" }} aria-label="Khadayata home">
            <img src={LOGO} alt="Khadayata" style={{ height: 52, width: "auto", mixBlendMode: "multiply" }} />
          </Link>
          <nav style={{ display: "flex", gap: 28, fontSize: 14, fontWeight: 500 }} className="hidden md:flex" aria-label="Main navigation">
            {[["Events", "/events"], ["Directory", "/directory"], ["Business", "/business"], ["Chapters", "/chapters"], ["News", "/news"]].map(([label, href]) => (
              <Link key={href} to={href} style={{ color: "#2E2E2E", textDecoration: "none", transition: "color .2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = TEXT_ACCENT.saffron)}
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
                transition: "transform .2s",
              }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
                Dashboard <ArrowRight size={15} />
              </Link>
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
                  transition: "transform .2s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>Join Free</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section style={{ position: "relative", minHeight: "92vh", display: "flex", alignItems: "center", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <img
            src={HERO_IMG}
            alt="Khadayata temple community gathering at golden hour"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", transform: `translateY(${scrollY * 0.3}px) scale(1.08)` }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(110deg, rgba(46,46,46,0.82) 0%, rgba(46,46,46,0.55) 55%, rgba(243,156,18,0.15) 100%)" }} />
          <img src={MANDALA_IMG} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.06, objectFit: "cover", pointerEvents: "none" }} />
        </div>

        <div style={{ position: "relative", zIndex: 2, maxWidth: 1280, margin: "0 auto", padding: "80px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }} className="hero-grid">
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 16px", borderRadius: 50, marginBottom: 24,
              background: "rgba(243,156,18,0.2)", border: "1px solid rgba(243,156,18,0.5)",
              fontSize: 12, fontWeight: 600, color: LIGHT_ACCENT.gold, letterSpacing: "0.06em",
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
              Connecting {totalMembers != null ? `${totalMembers.toLocaleString()}+` : ""} Khadayata families across {totalCountries != null ? totalCountries : ""} countries — through verified membership, events, heritage, and business.
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 36, flexWrap: "wrap" }}>
              <Link to="/auth" style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "14px 32px", borderRadius: 50, fontSize: 15, fontWeight: 700, color: "#fff",
                background: "linear-gradient(135deg,#F39C12,#E91E63)",
                textDecoration: "none", boxShadow: "0 6px 28px rgba(243,156,18,.55)",
                transition: "transform .2s",
              }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>Join Community <ArrowRight size={18} /></Link>
              <Link to="/events" style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "14px 28px", borderRadius: 50, fontSize: 15, fontWeight: 600, color: "#fff",
                background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.3)",
                textDecoration: "none", backdropFilter: "blur(8px)",
              }}>Explore Events</Link>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="hero-right">
            <div style={{
              background: "rgba(255,255,255,0.1)", backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.2)", borderRadius: 24, padding: "28px 32px",
            }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", marginBottom: 20 }}>LIVE COMMUNITY STATS</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {liveStats.map((s) => (
                  <div key={s.label} style={{ textAlign: "center", padding: "18px 14px", background: "rgba(255,255,255,0.07)", borderRadius: 16, border: `1px solid ${s.color}40`, transition: "transform .2s" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.06)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}>
                    <p style={{ fontSize: "1.9rem", fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>
                      {s.loaded ? <AnimatedCounter target={s.value} suffix={s.suffix} /> : "…"}
                    </p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 6 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={{
              background: "rgba(255,255,255,0.1)", backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, padding: "20px 24px",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <Search size={18} style={{ color: "rgba(255,255,255,0.7)", flexShrink: 0 }} />
              <Link to="/directory" style={{ flex: 1, color: "rgba(255,255,255,0.7)", fontSize: 14, textDecoration: "none" }}>
                Search members, businesses, chapters…
              </Link>
              <Link to="/directory" style={{
                padding: "8px 18px", borderRadius: 50, fontSize: 12, fontWeight: 700, color: "#2E2E2E",
                background: "#F4B400", textDecoration: "none",
              }}>Search</Link>
            </div>
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ width: 1, height: 40, background: "linear-gradient(to bottom,rgba(255,255,255,0),rgba(255,255,255,0.5))" }} />
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", letterSpacing: "0.12em" }}>SCROLL</p>
        </div>
      </section>

      {/* ─── FESTIVAL GRADIENT BAR ─── */}
      <div style={{ background: "linear-gradient(90deg,#F39C12,#E91E63,#1E88E5,#43A047)", height: 4 }} />

      {/* ─── FEATURES STRIP ─── */}
      <section style={{ background: "#fff", padding: "72px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 52 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: TEXT_ACCENT.saffron, textTransform: "uppercase", marginBottom: 10 }}>Platform Features</p>
            <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 800, margin: 0, color: "#2E2E2E" }}>Everything Your Community Needs</h2>
            <p style={{ marginTop: 12, color: "rgba(46,46,46,0.7)", fontSize: 16, maxWidth: 520, margin: "12px auto 0" }}>A comprehensive platform built for every aspect of Khadayata community life.</p>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 20 }}>
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal key={f.label} delay={i * 0.08}>
                  <div style={{
                    padding: "28px 24px", borderRadius: 20, height: "100%",
                    background: "#FFF7E6", border: `1.5px solid ${f.color}30`,
                    borderLeft: `4px solid ${f.color}`,
                    transition: "transform .2s, box-shadow .2s",
                    cursor: "default",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = `0 14px 36px ${f.color}25`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: `${f.color}18`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, transition: "transform .2s" }}
                      onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
                      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
                      <Icon size={22} style={{ color: f.color }} />
                    </div>
                    <p style={{ fontWeight: 700, fontSize: 15, margin: 0, color: "#2E2E2E" }}>{f.label}</p>
                    <p style={{ fontSize: 13, color: "rgba(46,46,46,0.7)", marginTop: 6, lineHeight: 1.5 }}>{f.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── LATEST MEMBERS ─── */}
      <section style={{ background: "#fff", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <Reveal style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: TEXT_ACCENT.green, textTransform: "uppercase", marginBottom: 8 }}>Newest Members</p>
              <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.4rem)", fontWeight: 800, margin: 0, color: "#2E2E2E" }}>Welcome to the Community</h2>
            </div>
            <Link to="/directory" style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 50,
              border: `1.5px solid ${ACCENT.green}`, color: TEXT_ACCENT.green, fontSize: 13, fontWeight: 600, textDecoration: "none",
              transition: "background .2s, color .2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = ACCENT.green; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = TEXT_ACCENT.green; }}>View All Members <ChevronRight size={16} /></Link>
          </Reveal>

          {latestLoading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ background: "#FFF7E6", borderRadius: 20, padding: 24, border: "1px solid rgba(232,163,23,0.15)", textAlign: "center" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(232,163,23,0.15)", margin: "0 auto 14px" }} />
                  <div style={{ height: 16, background: "rgba(232,163,23,0.15)", borderRadius: 8, margin: "0 auto 8px", width: "70%" }} />
                  <div style={{ height: 12, background: "rgba(232,163,23,0.1)", borderRadius: 8, margin: "0 auto", width: "50%" }} />
                </div>
              ))}
            </div>
          )}

          {!latestLoading && latestMembers && latestMembers.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
              {latestMembers.map((m, i) => {
                const chapter = (m as Record<string, unknown>).chapters as { name: string } | null;
                return (
                  <Reveal key={m.id} delay={i * 0.08}>
                    <Link to={`/member/${m.id}`} style={{ display: "block", textDecoration: "none" }}>
                      <div style={{
                        background: "#FFF7E6", borderRadius: 20, padding: 24,
                        border: "1px solid rgba(232,163,23,0.15)",
                        textAlign: "center", transition: "transform .2s, box-shadow .2s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 14px 36px rgba(67,160,71,0.15)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                        <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 14px", overflow: "hidden", background: "linear-gradient(135deg,#F39C12,#E91E63)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, fontWeight: 700, flexShrink: 0 }}>
                          {m.photo_url ? (
                            <img src={m.photo_url} alt={`${m.first_name} ${m.last_name}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span>{(m.first_name ?? "")[0]}{(m.last_name ?? "")[0]}</span>
                          )}
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#2E2E2E", margin: 0, lineHeight: 1.3 }}>
                          {m.first_name} {m.last_name}
                        </p>
                        {chapter?.name && (
                          <p style={{ fontSize: 12, color: TEXT_ACCENT.green, margin: "4px 0 0", fontWeight: 500 }}>{chapter.name}</p>
                        )}
                        {m.global_id && (
                          <p style={{ fontSize: 11, color: "rgba(46,46,46,0.55)", margin: "6px 0 0", fontFamily: "monospace" }}>{m.global_id}</p>
                        )}
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          )}

          {!latestLoading && (!latestMembers || latestMembers.length === 0) && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(46,46,46,0.6)" }}>
              <Users size={40} style={{ margin: "0 auto 12px", opacity: 0.2, display: "block" }} />
              <p>Be among the first to join our growing community.</p>
              <Link to="/auth" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 16, padding: "10px 24px", borderRadius: 50, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#43A047,#1E88E5)", textDecoration: "none" }}>
                Join Now <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ─── UPCOMING EVENTS ─── */}
      <section style={{ background: "#FDEBD0", padding: "80px 24px", position: "relative", overflow: "hidden" }}>
        <img src={MANDALA_IMG} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04, objectFit: "cover", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <Reveal style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: TEXT_ACCENT.pink, textTransform: "uppercase", marginBottom: 8 }}>What's Happening</p>
              <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.4rem)", fontWeight: 800, margin: 0, color: "#2E2E2E" }}>Upcoming Events</h2>
            </div>
            <Link to="/events" style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 50,
              border: `1.5px solid ${ACCENT.saffron}`, color: TEXT_ACCENT.saffron, fontSize: 13, fontWeight: 600, textDecoration: "none",
              transition: "background .2s, color .2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = ACCENT.saffron; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = TEXT_ACCENT.saffron; }}>View All Events <ChevronRight size={16} /></Link>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 24 }}>
            {EVENTS.map((ev, i) => (
              <Reveal key={ev.title} delay={i * 0.08}>
                <div style={{
                  borderRadius: 20, overflow: "hidden", background: "#fff",
                  boxShadow: "0 4px 20px rgba(46,46,46,0.08)",
                  transition: "transform .25s, box-shadow .25s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-8px)"; e.currentTarget.style.boxShadow = "0 20px 48px rgba(46,46,46,0.18)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(46,46,46,0.08)"; }}>
                  <div style={{ height: 180, background: `linear-gradient(135deg, ${ev.typeColor}25, ${ev.typeColor}08)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                    <Calendar size={48} style={{ color: ev.typeColor, opacity: 0.4 }} />
                    <span style={{ position: "absolute", top: 14, left: 14, padding: "4px 12px", borderRadius: 50, fontSize: 11, fontWeight: 700, color: "#fff", background: ev.typeColor }}>{ev.type}</span>
                  </div>
                  <div style={{ padding: "18px 20px" }}>
                    <p style={{ fontWeight: 700, fontSize: 16, margin: 0, color: "#2E2E2E" }}>{ev.title}</p>
                    <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "rgba(46,46,46,0.7)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={12} />{ev.date}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} />{ev.location}</span>
                    </div>
                    <Link to="/events" style={{
                      display: "block", marginTop: 16, padding: "10px 0", borderRadius: 12, textAlign: "center",
                      fontSize: 13, fontWeight: 700, color: "#fff", background: ev.typeColor, textDecoration: "none",
                      transition: "opacity .2s",
                    }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                      onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>View Details</Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMMUNITY DIRECTORY ─── */}
      <section style={{ padding: "80px 24px", background: "#fff" }}>
        <Reveal style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: TEXT_ACCENT.blue, textTransform: "uppercase", marginBottom: 10 }}>Find Your People</p>
          <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.5rem)", fontWeight: 800, margin: 0, color: "#2E2E2E" }}>Community Directory</h2>
          <p style={{ color: "rgba(46,46,46,0.7)", marginTop: 12, fontSize: 15, maxWidth: 500, margin: "12px auto 36px" }}>Search members, businesses, and chapters across the entire Khadayata global network.</p>
          <div style={{ display: "flex", alignItems: "center", background: "#fff", border: "2px solid #E8A317", borderRadius: 60, padding: "6px 8px 6px 20px", boxShadow: "0 8px 32px rgba(232,163,23,0.18)", transition: "box-shadow .2s" }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 12px 40px rgba(232,163,23,0.25)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 8px 32px rgba(232,163,23,0.18)")}>
            <Search size={18} style={{ color: "#757575", flexShrink: 0 }} />
            <Link to="/directory" style={{ flex: 1, fontSize: 15, color: "#757575", padding: "8px 12px", textDecoration: "none", textAlign: "left" }}>Search members, businesses, chapters...</Link>
            <Link to="/directory" style={{ padding: "12px 28px", borderRadius: 50, fontSize: 14, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#F39C12,#E91E63)", textDecoration: "none" }}>Search</Link>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
            {[
              { label: "Find Members", link: "/directory", color: ACCENT.saffron, textColor: TEXT_ACCENT.saffron },
              { label: "Find Businesses", link: "/business", color: ACCENT.green, textColor: TEXT_ACCENT.green },
              { label: "Find Chapters", link: "/chapters", color: ACCENT.blue, textColor: TEXT_ACCENT.blue },
            ].map((item) => (
              <Link key={item.label} to={item.link} style={{
                padding: "10px 22px", borderRadius: 50, fontSize: 13, fontWeight: 600,
                border: `2px solid ${item.color}`, color: item.textColor, background: `${item.color}0f`,
                textDecoration: "none", transition: "all .2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = item.color; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${item.color}0f`; e.currentTarget.style.color = item.textColor; }}>{item.label}</Link>
            ))}
          </div>
          <div style={{ marginTop: 44 }}>
            <p style={{ fontSize: 12, color: "rgba(46,46,46,0.7)", fontWeight: 600, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Popular Business Categories</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {BUSINESS_CATS.map((cat) => (
                <Link key={cat} to="/business" style={{
                  padding: "9px 18px", borderRadius: 50, fontSize: 13, fontWeight: 500,
                  background: "#FFF7E6", border: "1.5px solid #E8A31760", color: "#2E2E2E",
                  textDecoration: "none", transition: "all .2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT.saffron; e.currentTarget.style.background = "#FFF0D0"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#E8A31760"; e.currentTarget.style.background = "#FFF7E6"; }}>
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ─── CULTURAL HERITAGE ─── */}
      <section style={{ background: "#FDEBD0", padding: "80px 24px", overflow: "hidden", position: "relative" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }} className="split-grid">
          <Reveal>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: TEXT_ACCENT.green, textTransform: "uppercase", marginBottom: 12 }}>Our Roots</p>
            <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.5rem)", fontWeight: 800, margin: 0, color: "#2E2E2E", lineHeight: 1.2 }}>
              A Family That Spans<br /><span style={{ color: TEXT_ACCENT.saffron }}>Continents</span>
            </h2>
            <p style={{ marginTop: 18, fontSize: 15, color: "rgba(46,46,46,0.7)", lineHeight: 1.75, maxWidth: 460 }}>
              From Ahmedabad to Houston, Mumbai to London — Khadayata families thrive across borders. Our platform preserves ancient traditions while powering modern connections.
            </p>
            <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { icon: Users, label: "Member Directory", color: ACCENT.saffron },
                { icon: Heart, label: "Matrimonial", color: ACCENT.pink },
                { icon: Calendar, label: "Events", color: ACCENT.blue },
                { icon: Building2, label: "Temple", color: ACCENT.green },
                { icon: Newspaper, label: "News & Archives", color: ACCENT.gold },
                { icon: BookOpen, label: "Oral History", color: ACCENT.blue },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <Reveal key={item.label} delay={i * 0.05}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                      borderRadius: 14, background: "#fff", border: "1px solid rgba(232,163,23,0.25)",
                      transition: "border-color .2s, transform .2s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.transform = "translateX(4px)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(232,163,23,0.25)"; e.currentTarget.style.transform = "translateX(0)"; }}>
                      <Icon size={18} style={{ color: item.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#2E2E2E" }}>{item.label}</span>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </Reveal>
          <Reveal delay={0.2} style={{ position: "relative" }} className="hide-mobile">
            <div style={{ borderRadius: 28, overflow: "hidden", border: "3px solid #E8A317", boxShadow: "0 20px 60px rgba(243,156,18,0.2)" }}>
              <img src={COMMUNITY_IMG} alt="Indian cultural celebration" style={{ width: "100%", height: 520, objectFit: "cover", display: "block" }} />
            </div>
            <div style={{
              position: "absolute", bottom: -20, left: -20, borderRadius: 20, padding: "16px 22px",
              background: "linear-gradient(135deg,#F39C12,#E91E63)", color: "#fff",
              boxShadow: "0 8px 24px rgba(243,156,18,0.45)",
            }}>
              <p style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0 }}>{totalCountries != null ? <AnimatedCounter target={totalCountries} /> : "…"}</p>
              <p style={{ fontSize: 12, margin: "2px 0 0", opacity: 0.85 }}>Countries</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── BUSINESS NETWORK ─── */}
      <section style={{ background: "#fff", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }} className="split-grid">
          <Reveal style={{ position: "relative" }} className="hide-mobile">
            <div style={{ borderRadius: 28, overflow: "hidden", border: "3px solid #43A047", boxShadow: "0 20px 60px rgba(67,160,71,0.2)" }}>
              <img src={BUSINESS_IMG} alt="Business network" style={{ width: "100%", height: 460, objectFit: "cover", display: "block" }} />
            </div>
            <div style={{
              position: "absolute", top: -16, right: -16, borderRadius: 20, padding: "16px 22px",
              background: "linear-gradient(135deg,#43A047,#1E88E5)", color: "#fff",
              boxShadow: "0 8px 24px rgba(67,160,71,0.45)",
            }}>
              <p style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>{totalBusinesses != null ? <AnimatedCounter target={totalBusinesses} /> : "…"}</p>
              <p style={{ fontSize: 12, margin: "2px 0 0", opacity: 0.85 }}>Businesses</p>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: TEXT_ACCENT.green, textTransform: "uppercase", marginBottom: 12 }}>Business Network</p>
            <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.5rem)", fontWeight: 800, margin: 0, color: "#2E2E2E", lineHeight: 1.2 }}>
              Support <span style={{ color: TEXT_ACCENT.saffron }}>Khadayata</span><br />Businesses
            </h2>
            <p style={{ marginTop: 18, fontSize: 15, color: "rgba(46,46,46,0.7)", lineHeight: 1.75, maxWidth: 440 }}>
              Discover businesses run by community members — from restaurants to professional services. Shop local, grow together.
            </p>
            <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { icon: Globe, text: "Join any chapter worldwide", color: ACCENT.saffron },
                { icon: Calendar, text: "Attend exclusive member events", color: ACCENT.pink },
                { icon: Briefcase, text: "Expand your business network", color: ACCENT.green },
                { icon: Heart, text: "Enrol in volunteer programs", color: ACCENT.blue },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <Reveal key={item.text} delay={i * 0.06}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, transition: "transform .2s" }}
                      onMouseEnter={e => (e.currentTarget.style.transform = "translateX(6px)")}
                      onMouseLeave={e => (e.currentTarget.style.transform = "translateX(0)")}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${item.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon size={17} style={{ color: item.color }} />
                      </div>
                      <span style={{ fontSize: 14, color: "rgba(46,46,46,0.85)" }}>{item.text}</span>
                    </div>
                  </Reveal>
                );
              })}
            </div>
            <Link to="/business" style={{
              display: "inline-flex", alignItems: "center", gap: 8, marginTop: 32,
              padding: "14px 30px", borderRadius: 50, fontSize: 14, fontWeight: 700, color: "#fff",
              background: "linear-gradient(135deg,#43A047,#1E88E5)", textDecoration: "none",
              boxShadow: "0 6px 24px rgba(67,160,71,0.35)",
              transition: "transform .2s",
            }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>Browse Businesses <ArrowRight size={17} /></Link>
          </Reveal>
        </div>
      </section>

      {/* ─── STATS BAR ─── */}
      <section style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #2d2d4e 100%)", padding: "64px 24px", position: "relative", overflow: "hidden" }}>
        <img src={MANDALA_IMG} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04, objectFit: "cover", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 32 }}>
            {[
              { icon: Users, value: totalMembers ?? 0, loaded: totalMembers != null, suffix: "+", label: "Members", color: "#F39C12" },
              { icon: Building2, value: totalChapters ?? 0, loaded: totalChapters != null, suffix: "", label: "Chapters", color: "#E91E63" },
              { icon: Globe, value: totalCountries ?? 0, loaded: totalCountries != null, suffix: "", label: "Countries", color: "#1E88E5" },
              { icon: Briefcase, value: totalBusinesses ?? 0, loaded: totalBusinesses != null, suffix: "", label: "Businesses", color: "#43A047" },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <Reveal key={stat.label} delay={i * 0.1} style={{ textAlign: "center" }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: `${stat.color}20`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                    <Icon size={24} style={{ color: stat.color }} />
                  </div>
                  <p style={{ fontSize: "2rem", fontWeight: 800, color: stat.color, margin: 0, lineHeight: 1 }}>
                    {stat.loaded ? <AnimatedCounter target={stat.value} suffix={stat.suffix} /> : "…"}
                  </p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{stat.label}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section style={{ background: "#FDEBD0", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: TEXT_ACCENT.pink, textTransform: "uppercase", marginBottom: 10 }}>Community Love</p>
            <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.4rem)", fontWeight: 800, margin: 0, color: "#2E2E2E" }}>Loved by Our Members</h2>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 24 }}>
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div style={{
                  background: "#fff", borderRadius: 24, padding: "28px",
                  boxShadow: "0 4px 20px rgba(46,46,46,0.07)", border: "1px solid rgba(232,163,23,0.2)",
                  transition: "transform .2s, box-shadow .2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 18px 44px rgba(46,46,46,0.14)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(46,46,46,0.07)"; }}>
                  <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
                    {[1,2,3,4,5].map(s => <Star key={s} size={15} style={{ fill: "#F4B400", color: "#F4B400" }} />)}
                  </div>
                  <p style={{ fontSize: 15, color: "rgba(46,46,46,0.75)", lineHeight: 1.65, fontStyle: "italic", margin: 0 }}>"{t.text}"</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(232,163,23,0.2)" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#F39C12,#E91E63)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16 }}>
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: "#2E2E2E" }}>{t.name}</p>
                      <p style={{ fontSize: 12, color: "rgba(46,46,46,0.7)", margin: "3px 0 0" }}>{t.chapter}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section style={{ position: "relative", padding: "88px 24px", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#F4B400 0%,#E8A317 45%,#F39C12 100%)" }} />
        <img src={MANDALA_IMG} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.08, objectFit: "cover", pointerEvents: "none" }} />
        <Reveal style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <Sparkles size={32} style={{ color: "#fff", marginBottom: 16 }} />
          <h2 style={{ fontSize: "clamp(2rem,4vw,3.2rem)", fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.2 }}>
            Join {totalMembers != null ? `${totalMembers.toLocaleString()}+ ` : ""}Khadayata Members Worldwide
          </h2>
          <p style={{ marginTop: 16, fontSize: 17, color: "rgba(255,255,255,0.95)", maxWidth: 520, margin: "16px auto 0", lineHeight: 1.65 }}>
            Create your free account today and become part of the world's most connected Khadayata community platform.
          </p>
          <Link to="/auth" style={{
            display: "inline-flex", alignItems: "center", gap: 10, marginTop: 40,
            padding: "16px 42px", borderRadius: 50, fontSize: 16, fontWeight: 800, color: TEXT_ACCENT.saffron,
            background: "#fff", textDecoration: "none",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            transition: "transform .2s, box-shadow .2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.15)"; }}>
            Register Free <ArrowRight size={20} />
          </Link>
        </Reveal>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ background: "#1a1a1a", color: "#fff", padding: "60px 24px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 40, paddingBottom: 48 }}>
            <div>
              <img src={LOGO} alt="Khadayata" style={{ height: 50, width: "auto", mixBlendMode: "screen", opacity: 0.92, marginBottom: 16 }} />
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: 16 }}>Preserving heritage. Empowering community. Connecting generations.</p>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.8 }}>
                <p style={{ margin: 0 }}>Fort Worth, TX</p>
                <a href="tel:+19723710001" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none", display: "block" }}>+1 972 371 0001</a>
                <Link to="/contact" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none", display: "block" }}>Contact Us</Link>
              </div>
            </div>
            {[
              { title: "Platform", links: [["Directory", "/directory"], ["Events", "/events"], ["Business", "/business"], ["Matrimonial", "/matrimonial"], ["Scholarships", "/scholarships"], ["Mentorship", "/mentorship"], ["Obituaries", "/obituaries"], ["Contact", "/contact"]] },
              { title: "Heritage", links: [["Kotyark Temple", "/temple"], ["Archives", "/archives"], ["News", "/news"], ["Oral History", "/oral-history"], ["Elders Council", "/elders-council"], ["Services", "/services"]] },
              { title: "Legal", links: [["Terms of Use", "/terms"], ["Privacy Policy", "/privacy"], ["Accessibility", "/accessibility"]] },
            ].map((col) => (
              <div key={col.title}>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", marginBottom: 16 }}>{col.title}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {col.links.map(([label, href]) => (
                    <li key={href}><Link to={href} style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", textDecoration: "none", transition: "color .2s" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#F4B400")}
                      onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}>{label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "20px 0", textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
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
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
}
