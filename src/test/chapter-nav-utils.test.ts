import { describe, it, expect } from "vitest";
import {
  resolveChapterSlug,
  mergeChapterFirst,
  defaultChapterFilter,
  filterByChapter,
  type ChapterRef,
  type ChapterScopedItem,
} from "@/lib/chapter-nav-utils";

describe("resolveChapterSlug", () => {
  const chapters: ChapterRef[] = [
    { id: "ch1", slug: "new-york" },
    { id: "ch2", slug: "london" },
    { id: "ch3", slug: "mumbai" },
  ];

  it("returns the slug when chapter_id matches", () => {
    expect(resolveChapterSlug(chapters, "ch1")).toBe("new-york");
    expect(resolveChapterSlug(chapters, "ch3")).toBe("mumbai");
  });

  it("returns null when chapter_id is null", () => {
    expect(resolveChapterSlug(chapters, null)).toBeNull();
  });

  it("returns null when chapter_id is undefined", () => {
    expect(resolveChapterSlug(chapters, undefined)).toBeNull();
  });

  it("returns null when chapters list is empty", () => {
    expect(resolveChapterSlug([], "ch1")).toBeNull();
  });

  it("returns null when chapters is undefined", () => {
    expect(resolveChapterSlug(undefined, "ch1")).toBeNull();
  });

  it("returns null when chapter_id is not found in list", () => {
    expect(resolveChapterSlug(chapters, "ch999")).toBeNull();
  });
});

describe("mergeChapterFirst", () => {
  interface EventItem extends ChapterScopedItem {
    name: string;
  }

  const chapterEvents: EventItem[] = [
    { id: "e1", chapter_id: "ch1", name: "NY Event 1" },
    { id: "e2", chapter_id: "ch1", name: "NY Event 2" },
  ];

  const globalEvents: EventItem[] = [
    { id: "e3", chapter_id: "ch2", name: "London Event" },
    { id: "e4", chapter_id: "ch3", name: "Mumbai Event" },
    { id: "e5", chapter_id: "ch4", name: "Dubai Event" },
  ];

  it("places chapter items first, then fills with global items up to limit", () => {
    const result = mergeChapterFirst(chapterEvents, globalEvents, 4);
    expect(result.map((e) => e.id)).toEqual(["e1", "e2", "e3", "e4"]);
  });

  it("respects the limit", () => {
    const result = mergeChapterFirst(chapterEvents, globalEvents, 3);
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.id)).toEqual(["e1", "e2", "e3"]);
  });

  it("deduplicates items that appear in both lists", () => {
    const shared: EventItem[] = [{ id: "e1", chapter_id: "ch1", name: "NY Event 1" }];
    const result = mergeChapterFirst(chapterEvents, [...shared, ...globalEvents], 10);
    const ids = result.map((e) => e.id);
    expect(ids.filter((id) => id === "e1")).toHaveLength(1);
  });

  it("returns only chapter items when limit is smaller than chapter items count", () => {
    const result = mergeChapterFirst(chapterEvents, globalEvents, 1);
    expect(result.map((e) => e.id)).toEqual(["e1"]);
  });

  it("returns all chapter items plus global when limit exceeds total", () => {
    const result = mergeChapterFirst(chapterEvents, globalEvents, 100);
    expect(result).toHaveLength(5);
    expect(result.map((e) => e.id)).toEqual(["e1", "e2", "e3", "e4", "e5"]);
  });

  it("handles empty chapter items", () => {
    const result = mergeChapterFirst([], globalEvents, 2);
    expect(result.map((e) => e.id)).toEqual(["e3", "e4"]);
  });

  it("handles empty global items", () => {
    const result = mergeChapterFirst(chapterEvents, [], 5);
    expect(result.map((e) => e.id)).toEqual(["e1", "e2"]);
  });

  it("handles both empty", () => {
    expect(mergeChapterFirst([], [], 5)).toEqual([]);
  });

  it("handles zero limit", () => {
    expect(mergeChapterFirst(chapterEvents, globalEvents, 0)).toEqual([]);
  });
});

describe("defaultChapterFilter", () => {
  it("returns the member's chapter_id for non-admin members with a chapter", () => {
    expect(defaultChapterFilter("ch1", false)).toBe("ch1");
  });

  it("returns 'all' for global admin even if they have a chapter_id", () => {
    expect(defaultChapterFilter("ch1", true)).toBe("all");
  });

  it("returns 'all' for members without a chapter", () => {
    expect(defaultChapterFilter(null, false)).toBe("all");
  });

  it("returns 'all' for members with undefined chapter", () => {
    expect(defaultChapterFilter(undefined, false)).toBe("all");
  });

  it("returns 'all' for global admin without a chapter", () => {
    expect(defaultChapterFilter(null, true)).toBe("all");
  });
});

describe("filterByChapter", () => {
  interface EventItem extends ChapterScopedItem {
    name: string;
  }

  const events: EventItem[] = [
    { id: "e1", chapter_id: "ch1", name: "NY" },
    { id: "e2", chapter_id: "ch2", name: "London" },
    { id: "e3", chapter_id: "ch1", name: "NY 2" },
    { id: "e4", chapter_id: null, name: "Global" },
  ];

  it("returns all items when filter is 'all'", () => {
    expect(filterByChapter(events, "all")).toHaveLength(4);
  });

  it("filters to only items matching the chapter_id", () => {
    const result = filterByChapter(events, "ch1");
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.chapter_id === "ch1")).toBe(true);
  });

  it("returns empty array when no items match", () => {
    expect(filterByChapter(events, "ch999")).toEqual([]);
  });

  it("does not match items with null chapter_id", () => {
    const result = filterByChapter(events, "ch1");
    expect(result.find((e) => e.chapter_id === null)).toBeUndefined();
  });
});
