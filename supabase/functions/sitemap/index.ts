import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BASE_URL = "https://khadayataonline.com";

function xmlEscape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc: string, lastmod?: string, changefreq?: string, priority?: string): string {
  return (
    "  <url>\n" +
    "    <loc>" + xmlEscape(loc) + "</loc>\n" +
    (lastmod ? "    <lastmod>" + lastmod + "</lastmod>\n" : "") +
    (changefreq ? "    <changefreq>" + changefreq + "</changefreq>\n" : "") +
    (priority ? "    <priority>" + priority + "</priority>\n" : "") +
    "  </url>\n"
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/sitemap\/?/, "") || "index";
    const type = url.searchParams.get("type") || path || "index";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const today = new Date().toISOString().split("T")[0];

    if (type === "chapters") {
      const { data: chapters } = await supabase
        .from("chapters")
        .select("slug, updated_at, name")
        .order("name");

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
      xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

      if (chapters) {
        for (const ch of chapters) {
          const lastmod = ch.updated_at ? ch.updated_at.split("T")[0] : today;
          xml += urlEntry(BASE_URL + "/chapters/" + ch.slug, lastmod, "weekly", "0.8");
        }
      }

      xml += "</urlset>";

      return new Response(xml, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    if (type === "news") {
      const { data: articles } = await supabase
        .from("content_news")
        .select("id, published_at, updated_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1000);

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

      if (articles) {
        for (const a of articles) {
          const lastmod = a.updated_at ? a.updated_at.split("T")[0] : (a.published_at ? a.published_at.split("T")[0] : today);
          xml += urlEntry(BASE_URL + "/news/" + a.id, lastmod, "monthly", "0.6");
        }
      }

      xml += "</urlset>";

      return new Response(xml, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    if (type === "index") {
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      xml += '  <sitemap>\n';
      xml += '    <loc>' + BASE_URL + '/sitemap.xml</loc>\n';
      xml += '    <lastmod>' + today + '</lastmod>\n';
      xml += '  </sitemap>\n';
      xml += '  <sitemap>\n';
      xml += '    <loc>' + BASE_URL + '/sitemap-chapters.xml</loc>\n';
      xml += '    <lastmod>' + today + '</lastmod>\n';
      xml += '  </sitemap>\n';
      xml += '  <sitemap>\n';
      xml += '    <loc>' + BASE_URL + '/sitemap-news.xml</loc>\n';
      xml += '    <lastmod>' + today + '</lastmod>\n';
      xml += '  </sitemap>\n';
      xml += '</sitemapindex>';

      return new Response(xml, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    const staticPages = [
      { path: "/", changefreq: "daily", priority: "1.0" },
      { path: "/chapters", changefreq: "weekly", priority: "0.9" },
      { path: "/events", changefreq: "daily", priority: "0.9" },
      { path: "/directory", changefreq: "weekly", priority: "0.8" },
      { path: "/business", changefreq: "weekly", priority: "0.8" },
      { path: "/matrimonial", changefreq: "weekly", priority: "0.8" },
      { path: "/news", changefreq: "daily", priority: "0.8" },
      { path: "/scholarships", changefreq: "weekly", priority: "0.7" },
      { path: "/mentorship", changefreq: "weekly", priority: "0.7" },
      { path: "/obituaries", changefreq: "weekly", priority: "0.7" },
      { path: "/temple", changefreq: "weekly", priority: "0.8" },
      { path: "/archives", changefreq: "monthly", priority: "0.7" },
      { path: "/oral-history", changefreq: "monthly", priority: "0.6" },
      { path: "/elders-council", changefreq: "monthly", priority: "0.6" },
      { path: "/services", changefreq: "monthly", priority: "0.6" },
      { path: "/contact", changefreq: "monthly", priority: "0.5" },
      { path: "/terms", changefreq: "yearly", priority: "0.3" },
      { path: "/privacy", changefreq: "yearly", priority: "0.3" },
      { path: "/accessibility", changefreq: "yearly", priority: "0.3" },
    ];

    const { data: chapters } = await supabase
      .from("chapters")
      .select("slug, updated_at")
      .order("name");

    const { data: articles } = await supabase
      .from("content_news")
      .select("id, published_at, updated_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(500);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

    for (const page of staticPages) {
      xml += urlEntry(BASE_URL + page.path, today, page.changefreq, page.priority);
    }

    if (chapters) {
      for (const ch of chapters) {
        const lastmod = ch.updated_at ? ch.updated_at.split("T")[0] : today;
        xml += urlEntry(BASE_URL + "/chapters/" + ch.slug, lastmod, "weekly", "0.8");
      }
    }

    if (articles) {
      for (const a of articles) {
        const lastmod = a.updated_at ? a.updated_at.split("T")[0] : (a.published_at ? a.published_at.split("T")[0] : today);
        xml += urlEntry(BASE_URL + "/news/" + a.id, lastmod, "monthly", "0.6");
      }
    }

    xml += "</urlset>";

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
