import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, ChevronRight } from "lucide-react";

const LOGO = "/Screenshot_2026-03-16_at_9.18.14_AM.png";

const NAV_LINKS = [
  { label: "Events", href: "/events" },
  { label: "Directory", href: "/directory" },
  { label: "Business", href: "/business" },
  { label: "Chapters", href: "/chapters" },
  { label: "News", href: "/news" },
  { label: "Temple", href: "/temple" },
];


export default function PublicLayout({ children, title, description }: {
  children: ReactNode;
  title?: string;
  description?: string;
}) {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", background: "#FFF7E6", color: "#2E2E2E", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ── NAVBAR ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,247,230,0.95)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(232,163,23,0.22)",
        boxShadow: "0 1px 24px rgba(243,156,18,0.07)",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
          {/* Logo */}
          <Link to="/" style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}>
            <img
              src={LOGO}
              alt="Khadayata — Connecting Khadayata Community Worldwide"
              style={{ height: 50, width: "auto", mixBlendMode: "multiply" }}
            />
          </Link>

          {/* Nav links */}
          <nav aria-label="Main navigation" style={{ display: "flex", gap: 28, fontSize: 14, fontWeight: 500 }} className="hidden md:flex">
            {NAV_LINKS.map(({ label, href }) => {
              const active = location.pathname === href;
              return (
                <Link
                  key={href}
                  to={href}
                  style={{
                    color: active ? "#F39C12" : "#2E2E2E",
                    textDecoration: "none",
                    paddingBottom: 2,
                    borderBottom: active ? "2px solid #F39C12" : "2px solid transparent",
                    transition: "color .18s, border-color .18s",
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "#F39C12"; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "#2E2E2E"; } }}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* CTA */}
          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            {user ? (
              <Link to="/dashboard" style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 20px", borderRadius: 50, fontSize: 13, fontWeight: 600, color: "#fff",
                background: "linear-gradient(135deg,#F39C12,#E91E63)",
                textDecoration: "none", boxShadow: "0 4px 16px rgba(243,156,18,.38)",
              }}>
                Dashboard <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link to="/auth" style={{
                  padding: "9px 18px", borderRadius: 50, fontSize: 13, fontWeight: 600,
                  border: "1.5px solid rgba(232,163,23,0.7)", color: "#2E2E2E",
                  textDecoration: "none", background: "transparent",
                  transition: "background .18s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#FDEBD0")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  Sign In
                </Link>
                <Link to="/auth" style={{
                  padding: "9px 22px", borderRadius: 50, fontSize: 13, fontWeight: 700, color: "#fff",
                  background: "linear-gradient(135deg,#F39C12,#E91E63)",
                  textDecoration: "none", boxShadow: "0 4px 18px rgba(243,156,18,.42)",
                }}>
                  Join Free
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Breadcrumb for inner pages */}
        {title && (
          <div style={{ borderTop: "1px solid rgba(232,163,23,0.15)", background: "rgba(255,247,230,0.6)" }}>
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: "8px 24px", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#2E2E2E80" }}>
              <Link to="/" style={{ color: "#F39C12", textDecoration: "none", fontWeight: 600 }}>Home</Link>
              <ChevronRight size={12} />
              <span style={{ fontWeight: 600, color: "#2E2E2E" }}>{title}</span>
            </div>
          </div>
        )}
      </header>

      {/* ── PAGE CONTENT ── */}
      <main id="main-content" style={{ flex: 1 }} tabIndex={-1}>
        {children}
      </main>

      {/* ── FOOTER ── */}
      <footer
        aria-label="Site footer"
        style={{ background: "#1a1a1a", color: "#fff", padding: "64px 24px 0" }}
        itemScope
        itemType="https://schema.org/Organization"
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          {/* Brand row */}
          <div style={{ paddingBottom: 40, borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 40 }}>
            <Link to="/" style={{ display: "inline-block", marginBottom: 14, textDecoration: "none" }}>
              <img
                src={LOGO}
                alt="Khadayata"
                itemProp="logo"
                style={{ height: 48, width: "auto", mixBlendMode: "screen", opacity: 0.9 }}
              />
            </Link>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: 560, marginBottom: 14, marginTop: 0 }} itemProp="description">
              Khadayata Online is the world's most comprehensive platform for the Khadayata community —
              connecting families across 28 countries through a verified global identity, events, business, and heritage.
            </p>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.9, display: "flex", flexWrap: "wrap", gap: "0 32px" }} itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
              <span itemProp="streetAddress">1320 Pepperhill Ln, <span itemProp="addressLocality">Fort Worth</span>, <span itemProp="addressRegion">TX</span> <span itemProp="postalCode">76131</span></span>
              <a href="tel:+16824329400" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }} itemProp="telephone"
                onMouseEnter={e => (e.currentTarget.style.color = "#F4B400")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
              >+1 (682) 432-9400</a>
              <a href="mailto:support@khadayataonline.com" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }} itemProp="email"
                onMouseEnter={e => (e.currentTarget.style.color = "#F4B400")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
              >support@khadayataonline.com</a>
            </div>
          </div>

          {/* Link columns grid */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr", gap: 32, paddingBottom: 52 }} className="footer-grid">
            {/* Platform links */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 16, marginTop: 0 }}>Platform</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {([["Directory", "/directory"], ["Events", "/events"], ["Business", "/business"], ["Matrimonial", "/matrimonial"], ["Mentorship", "/mentorship"], ["Scholarships", "/scholarships"], ["Obituaries", "/obituaries"], ["Contact Us", "/contact"]] as [string, string][]).map(([label, href]) => (
                  <li key={href}><Link to={href} style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", textDecoration: "none", transition: "color .18s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#F4B400")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.42)")}
                  >{label}</Link></li>
                ))}
              </ul>
            </div>

            {/* Heritage links */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 16, marginTop: 0 }}>Heritage</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {([["Kotyark Temple", "/temple"], ["Archives", "/archives"], ["News", "/news"], ["Oral History", "/oral-history"], ["Elders Council", "/elders-council"], ["Services", "/services"]] as [string, string][]).map(([label, href]) => (
                  <li key={href}><Link to={href} style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", textDecoration: "none", transition: "color .18s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#F4B400")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.42)")}
                  >{label}</Link></li>
                ))}
              </ul>
            </div>

            {/* Chapters & Community */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 16, marginTop: 0 }}>Community</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {([["Chapters", "/chapters"], ["Dashboard", "/dashboard"], ["Profile", "/profile"], ["Settings", "/settings"]] as [string, string][]).map(([label, href]) => (
                  <li key={href}><Link to={href} style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", textDecoration: "none", transition: "color .18s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#F4B400")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.42)")}
                  >{label}</Link></li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 16, marginTop: 0 }}>Legal</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {([["Terms of Use", "/terms"], ["Privacy Policy", "/privacy"], ["Accessibility", "/accessibility"]] as [string, string][]).map(([label, href]) => (
                  <li key={href}><Link to={href} style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", textDecoration: "none", transition: "color .18s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#F4B400")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.42)")}
                  >{label}</Link></li>
                ))}
              </ul>
            </div>
          </div>


          {/* Bottom bar */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "22px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", margin: 0 }}>
              &copy; {new Date().getFullYear()} Khadayata Online. All rights reserved. · Jai Jai Khadayata
            </p>
            <div style={{ display: "flex", gap: 20 }}>
              {[["Privacy", "/privacy"], ["Terms", "/terms"], ["Accessibility", "/accessibility"]].map(([label, href]) => (
                <Link
                  key={href}
                  to={href}
                  style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#F4B400")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 1024px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 420px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
