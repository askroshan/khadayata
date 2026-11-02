import { describe, it, expect } from "vitest";

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  verification_level: number;
  onboarding_completed: boolean;
  chapter_id: string | null;
  created_at?: string;
  chapters: { name: string } | null;
}

function filterMembers(
  members: Member[],
  search: string,
  filterLevel: string,
  filterStatus: string,
  dateFrom: string,
  dateTo: string
): Member[] {
  let list = [...members];

  if (search?.trim()) {
    const q = search.toLowerCase();
    list = list.filter((m) =>
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
      (m.chapters as { name: string } | null)?.name?.toLowerCase().includes(q)
    );
  }

  if (filterLevel !== "" && filterLevel !== "all") {
    list = list.filter((m) => m.verification_level === Number(filterLevel));
  }

  if (filterStatus === "complete") list = list.filter((m) => m.onboarding_completed);
  if (filterStatus === "pending") list = list.filter((m) => !m.onboarding_completed);

  if (dateFrom) {
    const fromDate = new Date(`${dateFrom}T00:00:00.000Z`);
    list = list.filter((m) => m.created_at && new Date(m.created_at) >= fromDate);
  }

  if (dateTo) {
    const toDate = new Date(`${dateTo}T23:59:59.999Z`);
    list = list.filter((m) => m.created_at && new Date(m.created_at) <= toDate);
  }

  return list;
}

describe("Members Filtering", () => {
  const mockMembers: Member[] = [
    {
      id: "1",
      first_name: "John",
      last_name: "Doe",
      verification_level: 2,
      onboarding_completed: true,
      chapter_id: "ch1",
      created_at: "2026-01-15T10:00:00Z",
      chapters: { name: "San Francisco" },
    },
    {
      id: "2",
      first_name: "Jane",
      last_name: "Smith",
      verification_level: 1,
      onboarding_completed: false,
      chapter_id: "ch2",
      created_at: "2026-02-20T15:30:00Z",
      chapters: { name: "New York" },
    },
    {
      id: "3",
      first_name: "Bob",
      last_name: "Johnson",
      verification_level: 3,
      onboarding_completed: true,
      chapter_id: "ch1",
      created_at: "2026-03-10T08:45:00Z",
      chapters: { name: "San Francisco" },
    },
  ];

  it("should return all members when no filters applied", () => {
    const result = filterMembers(mockMembers, "", "", "", "", "");
    expect(result).toHaveLength(3);
  });

  it("should filter by search name", () => {
    const result = filterMembers(mockMembers, "John", "", "", "", "");
    expect(result).toHaveLength(2);
    expect(result[0].first_name).toBe("John");
    expect(result[1].last_name).toBe("Johnson");
  });

  it("should filter by chapter name", () => {
    const result = filterMembers(mockMembers, "San Francisco", "", "", "", "");
    expect(result).toHaveLength(2);
    expect(result.every(m => m.chapter_id === "ch1")).toBe(true);
  });

  it("should filter by verification level", () => {
    const result = filterMembers(mockMembers, "", "2", "", "", "");
    expect(result).toHaveLength(1);
    expect(result[0].verification_level).toBe(2);
  });

  it("should filter by onboarding status complete", () => {
    const result = filterMembers(mockMembers, "", "", "complete", "", "");
    expect(result).toHaveLength(2);
    expect(result.every(m => m.onboarding_completed)).toBe(true);
  });

  it("should filter by onboarding status pending", () => {
    const result = filterMembers(mockMembers, "", "", "pending", "", "");
    expect(result).toHaveLength(1);
    expect(result[0].onboarding_completed).toBe(false);
  });

  it("should filter by date from", () => {
    const result = filterMembers(mockMembers, "", "", "", "2026-02-01", "");
    expect(result).toHaveLength(2);
    expect(result.every(m => new Date(m.created_at!) >= new Date("2026-02-01"))).toBe(true);
  });

  it("should filter by date to", () => {
    const result = filterMembers(mockMembers, "", "", "", "", "2026-02-28");
    expect(result).toHaveLength(2);
  });

  it("should filter by date range", () => {
    const result = filterMembers(mockMembers, "", "", "", "2026-01-01", "2026-02-28");
    expect(result).toHaveLength(2);
  });

  it("should combine multiple filters", () => {
    const result = filterMembers(mockMembers, "San", "2", "complete", "", "");
    expect(result).toHaveLength(1);
    expect(result[0].first_name).toBe("John");
  });

  it("should handle empty search string as no filter", () => {
    const result = filterMembers(mockMembers, "   ", "", "", "", "");
    expect(result).toHaveLength(3);
  });

  it("should handle case-insensitive search", () => {
    const result = filterMembers(mockMembers, "jane smith", "", "", "", "");
    expect(result).toHaveLength(1);
    expect(result[0].first_name).toBe("Jane");
  });

  it("should return empty array when no matches found", () => {
    const result = filterMembers(mockMembers, "NonExistent", "", "", "", "");
    expect(result).toHaveLength(0);
  });

  it("should handle members without created_at", () => {
    const membersWithoutDate = [{
      ...mockMembers[0],
      created_at: undefined,
    }];
    const result = filterMembers(membersWithoutDate, "", "", "", "2026-01-01", "");
    expect(result).toHaveLength(0);
  });

  it("should apply date range with time boundaries", () => {
    const result = filterMembers(mockMembers, "", "", "", "2026-02-20", "2026-02-20");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });
});
