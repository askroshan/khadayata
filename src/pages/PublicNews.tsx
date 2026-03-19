import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import PublicLayout from "@/components/PublicLayout";
import SEOMeta from "@/components/SEOMeta";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Newspaper, Search, Clock, Eye, MapPin, Pin, Star, ArrowRight, Lock } from "lucide-react";
import { format } from "date-fns";

const NEWS_CATEGORIES = [
  "Announcements", "Community News", "Education", "Religion & Culture",
  "Events", "Obituaries", "Platform Updates",
  "Achievement", "Business", "Health", "Sports", "Technology", "Other"
];

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  breaking: { label: "Breaking", color: "#E53935" },
  obituary: { label: "Shok Sandesh", color: "#424242" },
};

function estimateReadTime(text: string): number {
  return Math.max(1, Math.round(text.trim().split(/\s+/).length / 200));
}

function LoginGate({ message }: { message: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
      background: "rgba(243,156,18,0.08)", border: "1.5px dashed rgba(243,156,18,0.4)",
      borderRadius: 12, marginTop: 12,
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

export default function PublicNews() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("__all__");

  const { data: newsList, isLoading } = useQuery({
    queryKey: ["public-news", search, categoryFilter],
    queryFn: async () => {
      let q = supabase
        .from("content_news")
        .select("id, title, summary, body, cover_image_url, image_alt, category, tags, featured, pinned, pinned_until, article_type, scope, author_name, read_time_minutes, views, published_at, created_at, chapters(name), countries(name), states(name), cities(name)")
        .eq("status", "published")
        .order("pinned", { ascending: false })
        .order("published_at", { ascending: false });
      if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
      if (categoryFilter !== "__all__") q = q.eq("category", categoryFilter);
      const { data } = await q.limit(80);
      return data ?? [];
    },
  });

  const locationStr = (item: Record<string, unknown>) => {
    const parts = [
      (item.cities as { name: string } | null)?.name,
      (item.states as { name: string } | null)?.name,
      (item.countries as { name: string } | null)?.name,
    ].filter(Boolean);
    return parts.join(", ");
  };

  const featured = newsList?.filter(n => (n as Record<string, unknown>).featured && !(n as Record<string, unknown>).pinned) ?? [];
  const breaking = newsList?.filter(n => (n as Record<string, unknown>).pinned) ?? [];
  const regular = newsList?.filter(n => !(n as Record<string, unknown>).featured && !(n as Record<string, unknown>).pinned) ?? [];

  return (
    <PublicLayout title="News">
      <SEOMeta
        title="Community News"
        description="Stay updated with the latest Khadayata community news — announcements, events, achievements, heritage, and more from chapters worldwide."
        url="/news"
        keywords="Khadayata news, Khadayata community news, Khadayata announcements, Khadayata events news, Indian community news"
        schema={{
          "@type": "NewsMediaOrganization",
          name: "Khadayata Online News",
          description: "Community news and announcements from the global Khadayata network",
          url: "https://khadayataonline.com/news",
        }}
      />

      <div style={{ fontFamily: "'Poppins', sans-serif", background: "#FFF7E6", minHeight: "60vh" }}>

        {/* Hero */}
        <div style={{
          background: "linear-gradient(135deg,#1a1a1a 0%,#2E2E2E 60%,rgba(243,156,18,0.15) 100%)",
          padding: "52px 24px 40px",
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <Newspaper size={28} style={{ color: "#F39C12" }} />
              <h1 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", fontWeight: 800, color: "#fff", margin: 0 }}>
                Community News
              </h1>
            </div>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 15, maxWidth: 560, margin: 0 }}>
              Announcements, events, achievements, and heritage stories from Khadayata chapters worldwide.
            </p>
            {!user && (
              <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>Want to write or comment on articles?</span>
                <Link to="/auth" style={{
                  padding: "8px 20px", borderRadius: 50, fontSize: 13, fontWeight: 700, color: "#2E2E2E",
                  background: "#F4B400", textDecoration: "none",
                }}>Join / Sign In</Link>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div style={{ background: "#fff", borderBottom: "1px solid rgba(232,163,23,0.2)", padding: "16px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#2E2E2E50" }} />
              <Input
                placeholder="Search articles..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 38 }}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger style={{ width: 200 }}><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Categories</SelectItem>
                {NEWS_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            {user && (
              <Link to="/news/manage" style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff",
                background: "linear-gradient(135deg,#F39C12,#E91E63)", textDecoration: "none",
                whiteSpace: "nowrap",
              }}>
                Manage News <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

          {!user && (
            <div style={{
              background: "linear-gradient(135deg,#2E2E2E,#1a1a1a)",
              borderRadius: 20, padding: "28px 32px", marginBottom: 36,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 20, flexWrap: "wrap",
            }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>
                  Want more from Khadayata News?
                </h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: 0, maxWidth: 520 }}>
                  Sign in to react and comment on articles, submit news tips to your chapter, manage your reading preferences, and receive personalised newsletters.
                </p>
              </div>
              <Link to="/auth" style={{
                display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0,
                padding: "11px 28px", borderRadius: 50, fontSize: 13, fontWeight: 700,
                background: "#F4B400", color: "#2E2E2E", textDecoration: "none",
              }}>
                Sign In / Join Free <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {isLoading && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#2E2E2E60" }}>
              <Newspaper size={40} style={{ margin: "0 auto 12px", opacity: 0.2 }} />
              <p>Loading articles...</p>
            </div>
          )}

          {!isLoading && newsList?.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <Newspaper size={48} style={{ margin: "0 auto 16px", color: "#2E2E2E30" }} />
              <p style={{ color: "#2E2E2E60", fontSize: 15 }}>No news articles found</p>
            </div>
          )}

          {/* Breaking News */}
          {breaking.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <div style={{ width: 4, height: 22, borderRadius: 2, background: "#E53935" }} />
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#2E2E2E", margin: 0 }}>Breaking News</h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                {breaking.map(n => (
                  <NewsCard key={n.id} article={n} isLoggedIn={!!user} locationStr={locationStr} />
                ))}
              </div>
            </section>
          )}

          {/* Featured */}
          {featured.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <div style={{ width: 4, height: 22, borderRadius: 2, background: "#F4B400" }} />
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#2E2E2E", margin: 0 }}>Featured</h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                {featured.map(n => (
                  <NewsCard key={n.id} article={n} isLoggedIn={!!user} locationStr={locationStr} />
                ))}
              </div>
            </section>
          )}

          {/* All Articles */}
          {regular.length > 0 && (
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <div style={{ width: 4, height: 22, borderRadius: 2, background: "#1E88E5" }} />
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#2E2E2E", margin: 0 }}>Latest Articles</h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                {regular.map(n => (
                  <NewsCard key={n.id} article={n} isLoggedIn={!!user} locationStr={locationStr} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

function NewsCard({ article, isLoggedIn, locationStr }: {
  article: Record<string, unknown>;
  isLoggedIn: boolean;
  locationStr: (item: Record<string, unknown>) => string;
}) {
  const isPinned = article.pinned as boolean;
  const isFeatured = article.featured as boolean;
  const typeMeta = TYPE_BADGE[article.article_type as string];
  const readTime = (article.read_time_minutes as number) ?? (article.body ? estimateReadTime(article.body as string) : 1);
  const loc = locationStr(article);

  return (
    <article style={{
      background: "#fff", borderRadius: 20, overflow: "hidden",
      boxShadow: "0 4px 20px rgba(46,46,46,0.08)",
      border: isPinned ? "2px solid rgba(229,57,53,0.35)" : "1px solid rgba(232,163,23,0.15)",
      display: "flex", flexDirection: "column",
      transition: "transform .22s, box-shadow .22s",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 14px 36px rgba(46,46,46,0.14)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(46,46,46,0.08)"; }}
    >
      {/* Cover image */}
      {article.cover_image_url && (
        <Link to={`/news/${article.id}`} style={{ display: "block", height: 180, overflow: "hidden", position: "relative" }}>
          <img
            src={article.cover_image_url as string}
            alt={(article.image_alt as string) ?? (article.title as string)}
            style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .4s" }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,0.4),transparent)" }} />
          {typeMeta && (
            <span style={{
              position: "absolute", top: 12, left: 12, padding: "4px 10px", borderRadius: 50,
              fontSize: 11, fontWeight: 700, color: "#fff", background: typeMeta.color,
            }}>{typeMeta.label}</span>
          )}
        </Link>
      )}

      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Badges */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {isPinned && !article.cover_image_url && (
            <span style={{ padding: "3px 10px", borderRadius: 50, fontSize: 11, fontWeight: 700, color: "#fff", background: "#E53935", display: "flex", alignItems: "center", gap: 4 }}>
              <Pin size={10} /> Breaking
            </span>
          )}
          {isFeatured && !isPinned && (
            <span style={{ padding: "3px 10px", borderRadius: 50, fontSize: 11, fontWeight: 600, color: "#2E2E2E", background: "#FFF0C0", border: "1px solid #F4B40030", display: "flex", alignItems: "center", gap: 4 }}>
              <Star size={10} /> Featured
            </span>
          )}
          {article.category && (
            <span style={{ padding: "3px 10px", borderRadius: 50, fontSize: 11, color: "#2E2E2E80", background: "#F0F0F0" }}>
              {article.category as string}
            </span>
          )}
        </div>

        {/* Title */}
        <Link to={`/news/${article.id}`} style={{ textDecoration: "none" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#2E2E2E", margin: 0, lineHeight: 1.4, marginBottom: 8 }}>
            {article.title as string}
          </h3>
        </Link>

        {/* Summary */}
        {article.summary && (
          <p style={{ fontSize: 13, color: "#2E2E2E80", lineHeight: 1.6, margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>
            {article.summary as string}
          </p>
        )}

        {/* Meta */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: "#2E2E2E60", marginTop: "auto", paddingTop: 10, borderTop: "1px solid rgba(232,163,23,0.15)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={11} /> {readTime} min read
          </span>
          {(article.views as number) > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Eye size={11} /> {(article.views as number).toLocaleString()}
            </span>
          )}
          {loc && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <MapPin size={11} /> {loc}
            </span>
          )}
          {article.published_at && (
            <span style={{ marginLeft: "auto" }}>
              {format(new Date(article.published_at as string), "MMM d, yyyy")}
            </span>
          )}
        </div>

        {/* Login gate for reactions/comments */}
        {!isLoggedIn && (
          <LoginGate message="Sign in to react, comment, or share this article" />
        )}
      </div>
    </article>
  );
}

