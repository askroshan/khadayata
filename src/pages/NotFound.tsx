import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import PublicLayout from "@/components/PublicLayout";
import SEOMeta from "@/components/SEOMeta";
import { Link } from "react-router-dom";
import { Chrome as Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <PublicLayout>
      <SEOMeta title="Page Not Found" description="The page you are looking for does not exist on Khadayata Online." noIndex={true} />
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", fontFamily: "'Poppins', sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div style={{
            fontSize: "7rem", fontWeight: 900, lineHeight: 1,
            background: "linear-gradient(135deg,#F39C12,#E91E63,#1E88E5)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            marginBottom: 16,
          }}>404</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#2E2E2E", marginBottom: 12 }}>Page Not Found</h1>
          <p style={{ fontSize: 15, color: "rgba(46,46,46,0.75)", lineHeight: 1.6, marginBottom: 32 }}>
            The page you're looking for doesn't exist or may have been moved.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/" style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 28px", borderRadius: 50, fontSize: 14, fontWeight: 700, color: "#fff",
              background: "linear-gradient(135deg,#96600b,#cf1a58)", textDecoration: "none",
              boxShadow: "0 4px 18px rgba(150,96,11,.4)",
            }}>
              <Home size={16} /> Go Home
            </Link>
            <button
              onClick={() => window.history.back()}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "12px 24px", borderRadius: 50, fontSize: 14, fontWeight: 600,
                border: "1.5px solid #E8A317", color: "#2E2E2E", background: "transparent", cursor: "pointer",
              }}
            >
              <ArrowLeft size={16} /> Go Back
            </button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default NotFound;
