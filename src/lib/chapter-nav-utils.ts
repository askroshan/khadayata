export interface ChapterRef {
  id: string;
  slug: string;
}

export interface ChapterScopedItem {
  id: string;
  chapter_id?: string | null;
}

/** Resolve a chapter slug from a list of chapters given a chapter_id. */
export function resolveChapterSlug(
  chapters: ChapterRef[] | undefined | null,
  chapterId: string | null | undefined
): string | null {
  if (!chapterId || !chapters) return null;
  const chapter = chapters.find((c) => c.id === chapterId);
  return chapter?.slug ?? null;
}

/**
 * Merge chapter-scoped items first, then fill with global items up to `limit`.
 * Deduplicates by id so an item that appears in both lists is not repeated.
 */
export function mergeChapterFirst<T extends ChapterScopedItem>(
  chapterItems: T[],
  globalItems: T[],
  limit: number
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of chapterItems) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  for (const item of globalItems) {
    if (result.length >= limit) break;
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result.slice(0, limit);
}

/**
 * Determine the default chapter filter for directory / events pages.
 * Global Admins default to "all" (they manage across chapters).
 * Members with a chapter default to their own chapter.
 * Members without a chapter default to "all".
 */
export function defaultChapterFilter(
  memberChapterId: string | null | undefined,
  isGlobalAdmin: boolean
): string {
  if (isGlobalAdmin || !memberChapterId) return "all";
  return memberChapterId;
}

/**
 * Filter a list of events (or any chapter-scoped items) by a chapter filter value.
 * "all" returns everything unchanged.
 */
export function filterByChapter<T extends ChapterScopedItem>(
  items: T[],
  chapterFilter: string
): T[] {
  if (chapterFilter === "all") return items;
  return items.filter((e) => e.chapter_id === chapterFilter);
}
