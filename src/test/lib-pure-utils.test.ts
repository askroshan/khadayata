import { describe, it, expect, beforeEach } from "vitest";
import { cn } from "@/lib/utils";
import { COMMUNITY_NAME, COMMUNITY_FULL_NAME } from "@/lib/community";
import {
  ACCENT,
  TEXT,
  LIGHT,
  BUTTON,
  MUTED_TEXT,
  PLACEHOLDER,
} from "@/lib/accessible-colors";
import {
  extractVideoId,
  buildEmbedUrl,
  isValidVideoUrl,
} from "@/lib/video-utils";
import {
  calculateAnnualPledge,
  calculatePledgeTotal,
  getCampaignProgress,
  getCampaignDaysRemaining,
  isCampaignActive,
  formatCurrency,
} from "@/lib/finance-utils";
import {
  getLocalizedContent,
  hasTranslation,
  getAvailableLanguages,
  getPreferredLanguage,
  setPreferredLanguage,
} from "@/lib/i18n-utils";
import { safeErrorMessage, GENERIC_ERROR_MESSAGE } from "@/lib/error-utils";

describe("utils.cn", () => {
  it("merges class names and tailwind conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
});

describe("community constants", () => {
  it("exposes brand names", () => {
    expect(COMMUNITY_NAME.length).toBeGreaterThan(0);
    expect(COMMUNITY_FULL_NAME).toContain(COMMUNITY_NAME);
  });
});

describe("accessible-colors", () => {
  it("exports WCAG palettes", () => {
    expect(ACCENT.saffron).toMatch(/^#/);
    expect(TEXT.pink).toMatch(/^#/);
    expect(LIGHT.blue).toMatch(/^#/);
    expect(BUTTON.green).toMatch(/^#/);
    expect(MUTED_TEXT).toContain("rgba");
    expect(PLACEHOLDER).toBe("#757575");
  });
});

describe("video-utils", () => {
  it("parses youtube and vimeo urls", () => {
    expect(extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      provider: "youtube",
      id: "dQw4w9WgXcQ",
    });
    expect(extractVideoId("https://youtu.be/dQw4w9WgXcQ").id).toBe("dQw4w9WgXcQ");
    expect(extractVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ").provider).toBe("youtube");
    expect(extractVideoId("https://vimeo.com/123456789")).toEqual({
      provider: "vimeo",
      id: "123456789",
    });
    expect(extractVideoId("")).toEqual({ provider: null, id: null });
    expect(extractVideoId("https://example.com")).toEqual({ provider: null, id: null });
  });

  it("builds embed urls and validates", () => {
    expect(buildEmbedUrl("youtube", "dQw4w9WgXcQ")).toContain("youtube-nocookie.com");
    expect(buildEmbedUrl("vimeo", "1")).toContain("player.vimeo.com");
    expect(buildEmbedUrl("other" as "youtube", "x")).toBe("");
    expect(isValidVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
    expect(isValidVideoUrl("nope")).toBe(false);
  });
});

describe("finance-utils", () => {
  it("calculates annual and period pledge totals", () => {
    expect(calculateAnnualPledge(100, "monthly")).toBe(1200);
    expect(calculateAnnualPledge(100, "weekly")).toBe(5200);
    expect(calculateAnnualPledge(100, "unknown")).toBe(1200);
    expect(
      calculatePledgeTotal({
        amount: 10,
        interval: "weekly",
        start_date: "2026-01-01",
        end_date: "2026-01-15",
      }),
    ).toBe(20);
    expect(
      calculatePledgeTotal({
        amount: 10,
        interval: "monthly",
        start_date: "2026-01-01",
        end_date: "2026-01-01",
      }),
    ).toBe(0);
    expect(
      calculatePledgeTotal({
        amount: 10,
        interval: "quarterly",
        start_date: "2025-01-01",
        end_date: "2026-01-01",
      }),
    ).toBeGreaterThan(0);
    expect(
      calculatePledgeTotal({
        amount: 10,
        interval: "yearly",
        start_date: "2024-01-01",
        end_date: "2026-01-01",
      }),
    ).toBe(20);
    expect(
      calculatePledgeTotal({
        amount: 10,
        // unknown interval hits default monthly branch
        interval: "biweekly" as "weekly",
        start_date: "2025-01-01",
        end_date: "2025-03-01",
      }),
    ).toBeGreaterThanOrEqual(0);
    expect(
      calculatePledgeTotal({
        amount: 5,
        interval: "monthly",
        start_date: "2020-01-01",
        end_date: null,
      }),
    ).toBeGreaterThan(0);
  });

  it("campaign helpers and currency", () => {
    expect(getCampaignProgress(50, 100)).toBe(50);
    expect(getCampaignProgress(50, 0)).toBe(0);
    expect(getCampaignProgress(200, 100)).toBe(100);
    expect(getCampaignDaysRemaining("2099-01-01")).toBeGreaterThan(0);
    expect(getCampaignDaysRemaining("2000-01-01")).toBe(0);
    expect(
      isCampaignActive({
        status: "active",
        start_date: "2000-01-01",
        end_date: "2099-01-01",
      }),
    ).toBe(true);
    expect(
      isCampaignActive({
        status: "draft",
        start_date: "2000-01-01",
        end_date: "2099-01-01",
      }),
    ).toBe(false);
    expect(formatCurrency(1000, "INR")).toContain("1,000");
    expect(formatCurrency(10, "USD")).toContain("$");
    expect(formatCurrency(10, "GBP")).toContain("£");
    expect(formatCurrency(10, "AED")).toContain("AED");
    expect(formatCurrency(10, "SGD")).toContain("S$");
    expect(formatCurrency(10, "AUD")).toContain("A$");
    expect(formatCurrency(10, "XYZ")).toContain("XYZ");
  });
});

describe("i18n-utils", () => {
  const mem = new Map<string, string>();
  beforeEach(() => {
    mem.clear();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => mem.get(k) ?? null,
        setItem: (k: string, v: string) => { mem.set(k, v); },
        removeItem: (k: string) => { mem.delete(k); },
        clear: () => mem.clear(),
      },
    });
  });

  it("resolves multilingual content", () => {
    expect(getLocalizedContent(null, "en")).toBe("");
    expect(getLocalizedContent("plain", "gu")).toBe("plain");
    expect(getLocalizedContent({ en: "Hi", gu: "Namaste" }, "gu")).toBe("Namaste");
    expect(getLocalizedContent({ gu: "Only" }, "en")).toBe("Only");
    expect(hasTranslation({ en: "x" }, "en")).toBe(true);
    expect(hasTranslation({ en: "x" }, "hi")).toBe(false);
    expect(hasTranslation("plain", "en")).toBe(true);
    expect(hasTranslation("plain", "gu")).toBe(false);
    expect(hasTranslation(null, "en")).toBe(false);
    expect(getAvailableLanguages({ en: "a", hi: "b" })).toEqual(["en", "hi"]);
    expect(getAvailableLanguages("x")).toEqual(["en"]);
    expect(getAvailableLanguages(null)).toEqual([]);
  });

  it("persists preferred language", () => {
    expect(getPreferredLanguage()).toBe("en");
    setPreferredLanguage("gu");
    expect(getPreferredLanguage()).toBe("gu");
    localStorage.setItem("preferred-language", "nope");
    expect(getPreferredLanguage()).toBe("en");
  });
});

describe("error-utils.safeErrorMessage", () => {
  it("maps backend codes and auth messages; hides raw backend text", () => {
    expect(safeErrorMessage(null)).toBe(GENERIC_ERROR_MESSAGE);
    expect(safeErrorMessage({ code: "23505", message: "duplicate" })).toMatch(/already exists/i);
    expect(safeErrorMessage({ code: "42501", message: "denied" })).toMatch(/permission/i);
    expect(safeErrorMessage({ code: "23503", message: "fk" })).toMatch(/linked/i);
    expect(safeErrorMessage({ code: "23514", message: "check" })).toMatch(/not allowed/i);
    expect(safeErrorMessage({ code: "22001", message: "long" })).toMatch(/too long/i);
    expect(
      safeErrorMessage({ message: "Invalid login credentials", __isAuthError: true }),
    ).toMatch(/incorrect/i);
    expect(
      safeErrorMessage({ message: "Email not confirmed", status: 400 }),
    ).toMatch(/confirm/i);
    expect(safeErrorMessage(new Error("User-facing validation"))).toBe("User-facing validation");
    expect(safeErrorMessage({ code: "XX", message: "secret schema detail", details: "x" })).toBe(
      GENERIC_ERROR_MESSAGE,
    );
  });
});
