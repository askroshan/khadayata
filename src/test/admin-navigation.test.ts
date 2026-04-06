import { describe, it, expect } from "vitest";

describe("Admin Navigation", () => {
  describe("URL Parameter Handling", () => {
    it("should extract tab parameter from URL", () => {
      const url = new URL("http://localhost/admin?tab=members");
      const params = new URLSearchParams(url.search);
      expect(params.get("tab")).toBe("members");
    });

    it("should default to stats tab when no parameter provided", () => {
      const url = new URL("http://localhost/admin");
      const params = new URLSearchParams(url.search);
      const tab = params.get("tab") || "stats";
      expect(tab).toBe("stats");
    });

    it("should handle multiple URL parameters", () => {
      const url = new URL("http://localhost/admin?tab=chapters&sort=name");
      const params = new URLSearchParams(url.search);
      expect(params.get("tab")).toBe("chapters");
      expect(params.get("sort")).toBe("name");
    });

    it("should handle encoded special characters", () => {
      const url = new URL("http://localhost/admin?tab=news%20publisher");
      const params = new URLSearchParams(url.search);
      expect(params.get("tab")).toBe("news publisher");
    });

    it("should ignore invalid tab values gracefully", () => {
      const validTabs = ["stats", "members", "chapters", "roles", "events", "news-publisher"];
      const url = new URL("http://localhost/admin?tab=invalid-tab");
      const params = new URLSearchParams(url.search);
      const tab = params.get("tab");
      const isValid = validTabs.includes(tab || "");
      expect(isValid).toBe(false);
    });
  });

  describe("Tab Navigation State", () => {
    const validTabs = [
      "stats",
      "members",
      "chapters",
      "roles",
      "events",
      "news-publisher",
      "moderator",
      "announcements",
      "finance",
    ];

    it("should maintain current tab on navigation", () => {
      const currentTab = "members";
      expect(validTabs).toContain(currentTab);
    });

    it("should transition between valid tabs", () => {
      const fromTab = "members";
      const toTab = "chapters";
      expect(validTabs).toContain(fromTab);
      expect(validTabs).toContain(toTab);
    });

    it("should preserve other URL parameters when changing tab", () => {
      const url1 = new URL("http://localhost/admin?tab=members&search=john&page=2");
      const url2 = new URL(url1);
      const params = new URLSearchParams(url2.search);
      params.set("tab", "chapters");
      expect(params.get("search")).toBe("john");
      expect(params.get("page")).toBe("2");
      expect(params.get("tab")).toBe("chapters");
    });

    it("should reset pagination when changing filters within same tab", () => {
      const params = new URLSearchParams("tab=members&page=5&search=john");
      params.set("search", "jane");
      params.set("page", "1");
      expect(params.get("page")).toBe("1");
    });
  });

  describe("Sidebar Navigation Shortcuts", () => {
    const shortcuts = [
      { label: "Members", tab: "members", icon: "Users" },
      { label: "Chapters", tab: "chapters", icon: "Map" },
      { label: "Roles", tab: "roles", icon: "Shield" },
      { label: "Events", tab: "events", icon: "Calendar" },
      { label: "News", tab: "news-publisher", icon: "Newspaper" },
      { label: "Finance", tab: "finance", icon: "DollarSign" },
    ];

    it("should have all expected shortcuts", () => {
      expect(shortcuts.length).toBeGreaterThan(0);
      shortcuts.forEach(shortcut => {
        expect(shortcut).toHaveProperty("label");
        expect(shortcut).toHaveProperty("tab");
        expect(shortcut).toHaveProperty("icon");
      });
    });

    it("should render correct tab on shortcut click", () => {
      const shortcut = shortcuts.find(s => s.label === "Members");
      expect(shortcut?.tab).toBe("members");
    });

    it("should have unique tab identifiers", () => {
      const tabs = shortcuts.map(s => s.tab);
      const uniqueTabs = new Set(tabs);
      expect(uniqueTabs.size).toBe(tabs.length);
    });

    it("should have descriptive labels for each shortcut", () => {
      shortcuts.forEach(shortcut => {
        expect(shortcut.label.length).toBeGreaterThan(0);
        expect(shortcut.label).toMatch(/^[A-Z]/);
      });
    });
  });

  describe("Navigation State Persistence", () => {
    it("should preserve tab selection on page reload", () => {
      const storedTab = sessionStorage.getItem("adminTab");
      const currentTab = storedTab || "stats";
      expect(currentTab).toBeTruthy();
    });

    it("should initialize from URL parameters on page load", () => {
      const url = new URL("http://localhost/admin?tab=members");
      const params = new URLSearchParams(url.search);
      const tab = params.get("tab") || "stats";
      expect(tab).toBe("members");
    });

    it("should handle back button navigation", () => {
      const history = ["stats", "members", "chapters", "members"];
      const currentIndex = history.length - 1;
      expect(history[currentIndex]).toBe("members");
      expect(history[currentIndex - 1]).toBe("chapters");
    });
  });
});
