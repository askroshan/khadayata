import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock, ArrowRight } from "lucide-react";

type LoginGateProps = {
  title: string;
  message: string;
  ctaLabel?: string;
  icon?: ReactNode;
};

/**
 * Shared sign-in gate shown on public pages when content requires authentication.
 * All colors meet WCAG 2.2 AA contrast requirements.
 */
export default function LoginGate({ title, message, ctaLabel = "Sign In", icon }: LoginGateProps) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "60px 24px", textAlign: "center", minHeight: 280,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "rgba(243,156,18,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 18,
      }}>
        {icon ?? <Lock size={24} style={{ color: "#96600b" }} />}
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#2E2E2E" }}>{title}</h3>
      <p style={{ marginTop: 10, fontSize: 14, color: "rgba(46,46,46,0.75)", maxWidth: 380, lineHeight: 1.6 }}>
        {message}
      </p>
      <Link to="/auth" style={{
        display: "inline-flex", alignItems: "center", gap: 8, marginTop: 22,
        padding: "11px 26px", borderRadius: 50, fontSize: 13, fontWeight: 700,
        color: "#fff", background: "#96600b", textDecoration: "none",
        transition: "background .2s",
      }}
        onMouseEnter={e => (e.currentTarget.style.background = "#7a4d09")}
        onMouseLeave={e => (e.currentTarget.style.background = "#96600b")}>
        {ctaLabel} <ArrowRight size={15} />
      </Link>
    </div>
  );
}
