import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DigestContent {
  news: Array<{ id: string; title: string; summary: string | null; article_type: string }>;
  events: Array<{ id: string; title: string; event_date: string; venue: string | null }>;
  campaigns: Array<{ id: string; title: string; goal_amount: number; currency: string }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [newsRes, eventsRes, campaignsRes] = await Promise.all([
      supabase
        .from("content_news")
        .select("id, title, summary, article_type")
        .eq("status", "published")
        .gte("published_at", oneWeekAgo)
        .order("published_at", { ascending: false })
        .limit(10),
      supabase
        .from("events")
        .select("id, title, event_date, venue")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(5),
      supabase
        .from("fundraising_campaigns")
        .select("id, title, goal_amount, currency")
        .eq("status", "active")
        .limit(3),
    ]);

    const digest: DigestContent = {
      news: newsRes.data ?? [],
      events: eventsRes.data ?? [],
      campaigns: campaignsRes.data ?? [],
    };

    if (digest.news.length === 0 && digest.events.length === 0 && digest.campaigns.length === 0) {
      return new Response(
        JSON.stringify({ message: "No content to digest this week", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: subscribers } = await supabase
      .from("members")
      .select("id, first_name, last_name, user_id")
      .eq("verification_level", 1)
      .not("user_id", "is", null)
      .limit(500);

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No subscribers found", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const subscriberEmails: Array<{ email: string; name: string }> = [];
    for (const member of subscribers) {
      const { data: authUser } = await supabase.auth.admin.getUserById(member.user_id);
      if (authUser?.user?.email) {
        subscriberEmails.push({
          email: authUser.user.email,
          name: `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim() || "Member",
        });
      }
    }

    let newsHtml = "";
    if (digest.news.length > 0) {
      newsHtml = "<h2>This Week's News</h2><ul>";
      for (const article of digest.news) {
        newsHtml += `<li><strong>${article.title}</strong>${article.summary ? ` — ${article.summary}` : ""}</li>`;
      }
      newsHtml += "</ul>";
    }

    let eventsHtml = "";
    if (digest.events.length > 0) {
      eventsHtml = "<h2>Upcoming Events</h2><ul>";
      for (const event of digest.events) {
        const date = new Date(event.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        eventsHtml += `<li><strong>${event.title}</strong> — ${date}${event.venue ? ` at ${event.venue}` : ""}</li>`;
      }
      eventsHtml += "</ul>";
    }

    let campaignsHtml = "";
    if (digest.campaigns.length > 0) {
      campaignsHtml = "<h2>Active Campaigns</h2><ul>";
      for (const campaign of digest.campaigns) {
        campaignsHtml += `<li><strong>${campaign.title}</strong> — Goal: ${campaign.currency} ${Number(campaign.goal_amount).toLocaleString()}</li>`;
      }
      campaignsHtml += "</ul>";
    }

    const digestBody = newsHtml + eventsHtml + campaignsHtml;
    let sentCount = 0;

    const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
    const batchSize = 10;

    for (let i = 0; i < subscriberEmails.length; i += batchSize) {
      const batch = subscriberEmails.slice(i, i + batchSize);
      const promises = batch.map(async (sub) => {
        const res = await fetch(sendEmailUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            template: "chapter_announcement",
            to: sub.email,
            vars: {
              name: sub.name,
              chapter_name: "Samaj Bulletin",
              announcement_title: "Weekly Digest — KhadayataOnline",
              announcement_body: digestBody,
            },
          }),
        });
        if (res.ok) sentCount++;
      });
      await Promise.all(promises);
    }

    return new Response(
      JSON.stringify({
        message: "Weekly digest sent",
        sent: sentCount,
        content: {
          news_count: digest.news.length,
          events_count: digest.events.length,
          campaigns_count: digest.campaigns.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("weekly-digest error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
