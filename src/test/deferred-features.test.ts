import { describe, it, expect } from "vitest";

// ============================================================================
// US-247: Dharmik Pravachan Video Embed
// ============================================================================

function extractVideoId(url: string): { provider: "youtube" | "vimeo" | null; id: string | null } {
  if (!url) return { provider: null, id: null };

  // YouTube: various formats
  const ytPatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of ytPatterns) {
    const match = url.match(pattern);
    if (match) return { provider: "youtube", id: match[1] };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return { provider: "vimeo", id: vimeoMatch[1] };

  return { provider: null, id: null };
}

function buildEmbedUrl(provider: "youtube" | "vimeo", id: string): string {
  if (provider === "youtube") return `https://www.youtube-nocookie.com/embed/${id}`;
  if (provider === "vimeo") return `https://player.vimeo.com/video/${id}`;
  return "";
}

function isValidVideoUrl(url: string): boolean {
  const { provider, id } = extractVideoId(url);
  return provider !== null && id !== null;
}

describe("US-247: Dharmik Pravachan Video Embed", () => {
  it("extracts YouTube video ID from standard URL", () => {
    const result = extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result.provider).toBe("youtube");
    expect(result.id).toBe("dQw4w9WgXcQ");
  });

  it("extracts YouTube video ID from short URL", () => {
    const result = extractVideoId("https://youtu.be/dQw4w9WgXcQ");
    expect(result.provider).toBe("youtube");
    expect(result.id).toBe("dQw4w9WgXcQ");
  });

  it("extracts YouTube video ID from embed URL", () => {
    const result = extractVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(result.provider).toBe("youtube");
    expect(result.id).toBe("dQw4w9WgXcQ");
  });

  it("extracts YouTube video ID from shorts URL", () => {
    const result = extractVideoId("https://youtube.com/shorts/dQw4w9WgXcQ");
    expect(result.provider).toBe("youtube");
    expect(result.id).toBe("dQw4w9WgXcQ");
  });

  it("extracts Vimeo video ID", () => {
    const result = extractVideoId("https://vimeo.com/123456789");
    expect(result.provider).toBe("vimeo");
    expect(result.id).toBe("123456789");
  });

  it("extracts Vimeo video ID with /video/ path", () => {
    const result = extractVideoId("https://vimeo.com/video/123456789");
    expect(result.provider).toBe("vimeo");
    expect(result.id).toBe("123456789");
  });

  it("returns null for invalid URLs", () => {
    expect(extractVideoId("")).toEqual({ provider: null, id: null });
    expect(extractVideoId("https://example.com")).toEqual({ provider: null, id: null });
    expect(extractVideoId("not a url")).toEqual({ provider: null, id: null });
  });

  it("builds privacy-enhanced YouTube embed URL", () => {
    const url = buildEmbedUrl("youtube", "dQw4w9WgXcQ");
    expect(url).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("builds Vimeo embed URL", () => {
    const url = buildEmbedUrl("vimeo", "123456789");
    expect(url).toBe("https://player.vimeo.com/video/123456789");
  });

  it("validates video URLs correctly", () => {
    expect(isValidVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isValidVideoUrl("https://vimeo.com/123456789")).toBe(true);
    expect(isValidVideoUrl("https://example.com/video")).toBe(false);
    expect(isValidVideoUrl("")).toBe(false);
  });
});

// ============================================================================
// US-233: Recurring Giving / Masik Sahayog
// ============================================================================

interface RecurringPledge {
  id: string;
  amount: number;
  currency: string;
  interval: "monthly" | "quarterly" | "annually";
  status: "active" | "paused" | "completed" | "cancelled";
  start_date: string;
  end_date: string | null;
}

function calculateNextDueDate(pledge: RecurringPledge): string | null {
  if (pledge.status !== "active") return null;
  const start = new Date(pledge.start_date);
  const now = new Date();

  let next = new Date(start);
  while (next <= now) {
    if (pledge.interval === "monthly") next.setMonth(next.getMonth() + 1);
    else if (pledge.interval === "quarterly") next.setMonth(next.getMonth() + 3);
    else if (pledge.interval === "annually") next.setFullYear(next.getFullYear() + 1);
  }

  if (pledge.end_date && next > new Date(pledge.end_date)) return null;
  return next.toISOString().split("T")[0];
}

function calculateAnnualCommitment(pledge: RecurringPledge): number {
  if (pledge.interval === "monthly") return pledge.amount * 12;
  if (pledge.interval === "quarterly") return pledge.amount * 4;
  return pledge.amount;
}

function getPledgeStatusColor(status: RecurringPledge["status"]): string {
  switch (status) {
    case "active": return "green";
    case "paused": return "amber";
    case "completed": return "blue";
    case "cancelled": return "red";
  }
}

describe("US-233: Recurring Giving / Masik Sahayog", () => {
  const activePledge: RecurringPledge = {
    id: "p1",
    amount: 1000,
    currency: "INR",
    interval: "monthly",
    status: "active",
    start_date: "2026-01-01",
    end_date: null,
  };

  it("calculates annual commitment for monthly pledge", () => {
    expect(calculateAnnualCommitment(activePledge)).toBe(12000);
  });

  it("calculates annual commitment for quarterly pledge", () => {
    const quarterly = { ...activePledge, interval: "quarterly" as const };
    expect(calculateAnnualCommitment(quarterly)).toBe(4000);
  });

  it("calculates annual commitment for annual pledge", () => {
    const annual = { ...activePledge, interval: "annually" as const };
    expect(calculateAnnualCommitment(annual)).toBe(1000);
  });

  it("returns null next due date for paused pledge", () => {
    const paused = { ...activePledge, status: "paused" as const };
    expect(calculateNextDueDate(paused)).toBeNull();
  });

  it("returns null next due date for cancelled pledge", () => {
    const cancelled = { ...activePledge, status: "cancelled" as const };
    expect(calculateNextDueDate(cancelled)).toBeNull();
  });

  it("returns next due date for active pledge", () => {
    const nextDue = calculateNextDueDate(activePledge);
    expect(nextDue).not.toBeNull();
    expect(new Date(nextDue!).getTime()).toBeGreaterThan(Date.now());
  });

  it("returns null if end_date passed", () => {
    const ended = { ...activePledge, end_date: "2026-01-15" };
    const nextDue = calculateNextDueDate(ended);
    expect(nextDue).toBeNull();
  });

  it("returns correct status colors", () => {
    expect(getPledgeStatusColor("active")).toBe("green");
    expect(getPledgeStatusColor("paused")).toBe("amber");
    expect(getPledgeStatusColor("completed")).toBe("blue");
    expect(getPledgeStatusColor("cancelled")).toBe("red");
  });
});

// ============================================================================
// US-232: Paryushan Fundraising Campaign
// ============================================================================

interface Campaign {
  id: string;
  title: string;
  goal_amount: number;
  currency: string;
  start_date: string;
  end_date: string;
  status: "draft" | "active" | "completed" | "cancelled";
  campaign_type: "paryushan" | "general" | "emergency" | "infrastructure";
  raised_amount?: number;
}

function getCampaignProgress(campaign: Campaign): number {
  if (!campaign.raised_amount || campaign.goal_amount <= 0) return 0;
  return Math.min(100, Math.round((campaign.raised_amount / campaign.goal_amount) * 100));
}

function getCampaignDaysRemaining(campaign: Campaign): number {
  const end = new Date(campaign.end_date);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function isCampaignActive(campaign: Campaign): boolean {
  if (campaign.status !== "active") return false;
  const now = new Date();
  const start = new Date(campaign.start_date);
  const end = new Date(campaign.end_date);
  return now >= start && now <= end;
}

function getCampaignTypeLabel(type: Campaign["campaign_type"]): string {
  switch (type) {
    case "paryushan": return "Paryushan Mahaparva";
    case "general": return "General Fund";
    case "emergency": return "Emergency Relief";
    case "infrastructure": return "Infrastructure";
  }
}

describe("US-232: Paryushan Fundraising Campaign", () => {
  const activeCampaign: Campaign = {
    id: "c1",
    title: "Paryushan 2026",
    goal_amount: 500000,
    currency: "INR",
    start_date: "2026-05-01",
    end_date: "2027-06-30",
    status: "active",
    campaign_type: "paryushan",
    raised_amount: 250000,
  };

  it("calculates campaign progress percentage", () => {
    expect(getCampaignProgress(activeCampaign)).toBe(50);
  });

  it("caps progress at 100%", () => {
    const overFunded = { ...activeCampaign, raised_amount: 600000 };
    expect(getCampaignProgress(overFunded)).toBe(100);
  });

  it("returns 0% for no donations", () => {
    const empty = { ...activeCampaign, raised_amount: 0 };
    expect(getCampaignProgress(empty)).toBe(0);
  });

  it("calculates days remaining", () => {
    const days = getCampaignDaysRemaining(activeCampaign);
    expect(days).toBeGreaterThanOrEqual(0);
  });

  it("returns 0 days for expired campaign", () => {
    const expired = { ...activeCampaign, end_date: "2025-01-01" };
    expect(getCampaignDaysRemaining(expired)).toBe(0);
  });

  it("checks if campaign is currently active", () => {
    expect(isCampaignActive(activeCampaign)).toBe(true);
  });

  it("inactive if status is draft", () => {
    const draft = { ...activeCampaign, status: "draft" as const };
    expect(isCampaignActive(draft)).toBe(false);
  });

  it("inactive if date range not started", () => {
    const future = { ...activeCampaign, start_date: "2027-01-01", end_date: "2027-12-31" };
    expect(isCampaignActive(future)).toBe(false);
  });

  it("returns correct campaign type labels", () => {
    expect(getCampaignTypeLabel("paryushan")).toBe("Paryushan Mahaparva");
    expect(getCampaignTypeLabel("emergency")).toBe("Emergency Relief");
    expect(getCampaignTypeLabel("infrastructure")).toBe("Infrastructure");
    expect(getCampaignTypeLabel("general")).toBe("General Fund");
  });
});

// ============================================================================
// US-248: Multilingual Content Toggle
// ============================================================================

interface MultilingualContent {
  en?: string;
  gu?: string;
  hi?: string;
}

type SupportedLanguage = "en" | "gu" | "hi";

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "English",
  gu: "Gujarati",
  hi: "Hindi",
};

function getContentForLanguage(content: MultilingualContent, lang: SupportedLanguage): string {
  if (content[lang]) return content[lang]!;
  // Fallback chain: requested -> English -> first available
  if (content.en) return content.en;
  return content.gu || content.hi || "";
}

function getAvailableLanguages(content: MultilingualContent): SupportedLanguage[] {
  const langs: SupportedLanguage[] = [];
  if (content.en) langs.push("en");
  if (content.gu) langs.push("gu");
  if (content.hi) langs.push("hi");
  return langs;
}

function isMultilingual(content: MultilingualContent): boolean {
  return getAvailableLanguages(content).length > 1;
}

describe("US-248: Multilingual Content Toggle", () => {
  const trilingualContent: MultilingualContent = {
    en: "Welcome to the community",
    gu: "સમાજમાં આપનું સ્વાગત છે",
    hi: "समाज में आपका स्वागत है",
  };

  const guOnly: MultilingualContent = {
    gu: "માત્ર ગુજરાતી",
  };

  it("returns content for requested language", () => {
    expect(getContentForLanguage(trilingualContent, "gu")).toBe("સમાજમાં આપનું સ્વાગત છે");
    expect(getContentForLanguage(trilingualContent, "hi")).toBe("समाज में आपका स्वागत है");
  });

  it("falls back to English when requested language unavailable", () => {
    const enHi: MultilingualContent = { en: "English text", hi: "Hindi text" };
    expect(getContentForLanguage(enHi, "gu")).toBe("English text");
  });

  it("falls back to any available language when English unavailable", () => {
    expect(getContentForLanguage(guOnly, "hi")).toBe("માત્ર ગુજરાતી");
  });

  it("returns empty string when no content available", () => {
    expect(getContentForLanguage({}, "en")).toBe("");
  });

  it("lists available languages", () => {
    expect(getAvailableLanguages(trilingualContent)).toEqual(["en", "gu", "hi"]);
    expect(getAvailableLanguages(guOnly)).toEqual(["gu"]);
  });

  it("detects multilingual content", () => {
    expect(isMultilingual(trilingualContent)).toBe(true);
    expect(isMultilingual(guOnly)).toBe(false);
    expect(isMultilingual({})).toBe(false);
  });

  it("has correct language labels", () => {
    expect(LANGUAGE_LABELS.en).toBe("English");
    expect(LANGUAGE_LABELS.gu).toBe("Gujarati");
    expect(LANGUAGE_LABELS.hi).toBe("Hindi");
  });
});

// ============================================================================
// US-230: Trust Corpus Fund
// ============================================================================

interface CorpusFund {
  id: string;
  name: string;
  corpus_amount: number;
  interest_earned: number;
  disbursed: number;
  currency: string;
}

function getCorpusBalance(fund: CorpusFund): number {
  return fund.corpus_amount + fund.interest_earned - fund.disbursed;
}

function getCorpusUtilization(fund: CorpusFund): number {
  if (fund.interest_earned <= 0) return 0;
  return Math.min(100, Math.round((fund.disbursed / fund.interest_earned) * 100));
}

describe("US-230: Trust Corpus Fund", () => {
  const fund: CorpusFund = {
    id: "f1",
    name: "Education Trust",
    corpus_amount: 1000000,
    interest_earned: 80000,
    disbursed: 40000,
    currency: "INR",
  };

  it("calculates corpus balance correctly", () => {
    expect(getCorpusBalance(fund)).toBe(1040000);
  });

  it("calculates utilization of interest earned", () => {
    expect(getCorpusUtilization(fund)).toBe(50);
  });

  it("caps utilization at 100%", () => {
    const over = { ...fund, disbursed: 100000 };
    expect(getCorpusUtilization(over)).toBe(100);
  });

  it("returns 0% utilization if no interest earned", () => {
    const noInterest = { ...fund, interest_earned: 0 };
    expect(getCorpusUtilization(noInterest)).toBe(0);
  });
});

// ============================================================================
// US-245: Weekly Digest (logic only - email sending deferred)
// ============================================================================

interface DigestItem {
  type: "event" | "news" | "obituary" | "campaign";
  title: string;
  date: string;
  url: string;
}

function buildDigestItems(
  events: Array<{ title: string; event_date: string }>,
  news: Array<{ title: string; published_at: string }>,
  obituaries: Array<{ deceased_name: string; death_date: string }>,
  campaigns: Array<{ title: string; end_date: string; status: string }>
): DigestItem[] {
  const items: DigestItem[] = [];

  events.slice(0, 5).forEach((e) => {
    items.push({ type: "event", title: e.title, date: e.event_date, url: "/events" });
  });

  news.slice(0, 5).forEach((n) => {
    items.push({ type: "news", title: n.title, date: n.published_at, url: "/news" });
  });

  obituaries.slice(0, 3).forEach((o) => {
    items.push({ type: "obituary", title: `In Memoriam: ${o.deceased_name}`, date: o.death_date, url: "/obituaries" });
  });

  campaigns.filter((c) => c.status === "active").slice(0, 2).forEach((c) => {
    items.push({ type: "campaign", title: c.title, date: c.end_date, url: "/temple" });
  });

  return items;
}

function shouldSendDigest(items: DigestItem[]): boolean {
  return items.length >= 2;
}

describe("US-245: Weekly Digest Curation", () => {
  it("curates digest from events, news, obituaries, campaigns", () => {
    const items = buildDigestItems(
      [{ title: "Paryushan Celebration", event_date: "2026-06-01" }],
      [{ title: "New Chapter Opened", published_at: "2026-05-20" }],
      [{ deceased_name: "Shri Rameshbhai", death_date: "2026-05-18" }],
      [{ title: "Temple Fund", end_date: "2026-07-01", status: "active" }]
    );
    expect(items).toHaveLength(4);
    expect(items[0].type).toBe("event");
    expect(items[1].type).toBe("news");
    expect(items[2].type).toBe("obituary");
    expect(items[3].type).toBe("campaign");
  });

  it("limits events to 5", () => {
    const events = Array.from({ length: 10 }, (_, i) => ({
      title: `Event ${i}`, event_date: "2026-06-01",
    }));
    const items = buildDigestItems(events, [], [], []);
    expect(items).toHaveLength(5);
  });

  it("only includes active campaigns", () => {
    const items = buildDigestItems([], [], [], [
      { title: "Active", end_date: "2026-07-01", status: "active" },
      { title: "Draft", end_date: "2026-07-01", status: "draft" },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Active");
  });

  it("decides not to send digest with fewer than 2 items", () => {
    expect(shouldSendDigest([{ type: "news", title: "x", date: "d", url: "/" }])).toBe(false);
  });

  it("decides to send digest with 2+ items", () => {
    const items = buildDigestItems(
      [{ title: "E1", event_date: "2026-06-01" }],
      [{ title: "N1", published_at: "2026-05-20" }],
      [], []
    );
    expect(shouldSendDigest(items)).toBe(true);
  });
});
