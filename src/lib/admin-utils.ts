import { format } from "date-fns";

export interface AdminMember {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  verification_level: number;
  onboarding_completed: boolean;
  chapter_id: string | null;
  created_at?: string;
  chapters: { name: string } | null;
}

export const VALID_ADMIN_TABS = [
  "stats", "members", "chapters", "roles", "events",
  "news-publisher", "moderator", "announcements", "finance",
  "verification", "reports", "transfers", "audits", "tag-requests",
  "directory", "samiti", "whatsapp", "sms", "bulk-content",
  "banned-keywords", "analytics",
] as const;

export type AdminTab = typeof VALID_ADMIN_TABS[number];

export const LEVEL_LABELS: Record<number, string> = {
  0: "Basic", 1: "Verified", 2: "Trusted", 3: "Senior", 4: "Elder", 5: "Patron",
};

export const MIN_LEVEL = 0;
export const MAX_LEVEL = 5;

export function resolveAdminTab(tabParam: string | null): AdminTab {
  if (!tabParam) return "stats";
  if ((VALID_ADMIN_TABS as readonly string[]).includes(tabParam)) return tabParam as AdminTab;
  return "stats";
}

export function buildAdminUrl(tab: AdminTab, params?: Record<string, string>): string {
  const url = new URLSearchParams();
  url.set("tab", tab);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) url.set(key, value);
    }
  }
  return `/admin?${url.toString()}`;
}

// ─── Filtering ───────────────────────────────────────────────────────────────

export function filterMembers(
  members: AdminMember[],
  search: string,
  filterLevel: string,
  filterStatus: string,
  dateFrom: string,
  dateTo: string,
  memberStatuses?: Record<string, { suspended: boolean; blocked: boolean }>
): AdminMember[] {
  let list = [...members];

  if (search?.trim()) {
    const q = search.toLowerCase();
    list = list.filter(
      (m) =>
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
        (m.chapters as { name: string } | null)?.name?.toLowerCase().includes(q)
    );
  }

  if (filterLevel !== "" && filterLevel !== "all") {
    list = list.filter((m) => m.verification_level === Number(filterLevel));
  }

  if (filterStatus === "complete") list = list.filter((m) => m.onboarding_completed);
  if (filterStatus === "pending") list = list.filter((m) => !m.onboarding_completed);
  if (filterStatus === "suspended") list = list.filter((m) => memberStatuses?.[m.id]?.suspended);
  if (filterStatus === "blocked") list = list.filter((m) => memberStatuses?.[m.id]?.blocked);

  // Parse YYYY-MM-DD as UTC calendar bounds so same-day filters work in all timezones.
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

// ─── Sidebar Shortcuts ───────────────────────────────────────────────────────

export interface UserRoles {
  isGlobalAdmin: boolean;
  isChapterAdmin: boolean;
  isDataSteward: boolean;
  isDirectoryManager: boolean;
  isEventManager: boolean;
  isFinanceAdmin: boolean;
  isPublisher: boolean;
  isModerator: boolean;
}

export interface AdminShortcut {
  label: string;
  tab: AdminTab;
  icon: string;
}

export function getAdminShortcuts(roles: UserRoles): AdminShortcut[] {
  const shortcuts: AdminShortcut[] = [];

  if (roles.isGlobalAdmin) {
    shortcuts.push(
      { label: "Members", tab: "members", icon: "Users" },
      { label: "Chapters", tab: "chapters", icon: "Building2" },
      { label: "Roles", tab: "roles", icon: "Shield" },
      { label: "Events", tab: "events", icon: "Calendar" },
      { label: "News", tab: "news-publisher", icon: "Newspaper" },
      { label: "Finance", tab: "finance", icon: "DollarSign" },
      { label: "Analytics", tab: "analytics", icon: "BarChart2" },
      { label: "Audits", tab: "audits", icon: "FileText" },
      { label: "Announcements", tab: "announcements", icon: "Megaphone" },
    );
  } else {
    if (roles.isChapterAdmin) {
      shortcuts.push(
        { label: "Members", tab: "members", icon: "Users" },
        { label: "Events", tab: "events", icon: "Calendar" },
        { label: "Roles", tab: "roles", icon: "Shield" },
        { label: "Announcements", tab: "announcements", icon: "Megaphone" },
      );
    }
    if (roles.isDataSteward) {
      shortcuts.push({ label: "Members", tab: "members", icon: "Users" });
    }
    if (roles.isDirectoryManager) {
      shortcuts.push({ label: "Directory", tab: "directory", icon: "Building2" });
    }
    if (roles.isEventManager) {
      shortcuts.push({ label: "Events", tab: "events", icon: "Calendar" });
    }
    if (roles.isFinanceAdmin) {
      shortcuts.push({ label: "Finance", tab: "finance", icon: "DollarSign" });
    }
    if (roles.isPublisher) {
      shortcuts.push({ label: "News", tab: "news-publisher", icon: "Newspaper" });
    }
    if (roles.isModerator) {
      shortcuts.push({ label: "Moderator", tab: "moderator", icon: "Flag" });
    }
  }

  const seen = new Set<string>();
  return shortcuts.filter((s) => {
    if (seen.has(s.tab)) return false;
    seen.add(s.tab);
    return true;
  });
}

// ─── Authorization ───────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  roles: string[];
  chapter_id?: string | null;
}

export interface EditableMember {
  id: string;
  chapter_id: string | null;
  verification_level: number;
}

export function canEditMember(user: AuthUser, member: EditableMember): boolean {
  if (user.roles.includes("Global Admin")) return true;
  if (user.roles.includes("Chapter Admin")) {
    return !!user.chapter_id && member.chapter_id === user.chapter_id;
  }
  if (user.roles.includes("Data Steward")) {
    return !!user.chapter_id && member.chapter_id === user.chapter_id;
  }
  return false;
}

export function getEditDisabledReason(user: AuthUser, member: EditableMember): string | null {
  if (canEditMember(user, member)) return null;
  if (user.roles.includes("Chapter Admin") || user.roles.includes("Data Steward")) {
    return "This member belongs to a different chapter";
  }
  return "You do not have permission to edit members";
}

export function canChangeLevel(user: AuthUser, member: EditableMember): boolean {
  return canEditMember(user, member);
}

export function canLevelUp(member: EditableMember): boolean {
  return member.verification_level < MAX_LEVEL;
}

export function canLevelDown(member: EditableMember): boolean {
  return member.verification_level > MIN_LEVEL;
}

export function getLevelChangeDisabledReason(
  user: AuthUser,
  member: EditableMember,
  direction: "up" | "down"
): string | null {
  if (!canChangeLevel(user, member)) {
    return getEditDisabledReason(user, member);
  }
  if (direction === "up" && !canLevelUp(member)) return "Already at maximum level (L5 Patron)";
  if (direction === "down" && !canLevelDown(member)) return "Already at minimum level (L0 Basic)";
  return null;
}

// ─── CSV Export ──────────────────────────────────────────────────────────────

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsvContent(members: AdminMember[]): string {
  const header = "Name,Chapter,Verification Level,Onboarding,Joined";
  const rows = members.map((m) => {
    const name = escapeCsvField(`${m.first_name} ${m.last_name}`);
    const chapter = escapeCsvField((m.chapters as { name: string } | null)?.name ?? "");
    const level = `L${m.verification_level} — ${LEVEL_LABELS[m.verification_level] ?? "Unknown"}`;
    const status = m.onboarding_completed ? "Complete" : "Pending";
    const joined = m.created_at ? format(new Date(m.created_at), "yyyy-MM-dd") : "";
    return [name, chapter, level, status, joined].join(",");
  });
  return [header, ...rows].join("\n");
}

export function exportFilteredCsv(members: AdminMember[]) {
  const csv = buildCsvContent(members);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `members-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Tab Access Control ──────────────────────────────────────────────────────

export function canAccessAdmin(roles: UserRoles): boolean {
  return (
    roles.isGlobalAdmin ||
    roles.isChapterAdmin ||
    roles.isDataSteward ||
    roles.isDirectoryManager ||
    roles.isEventManager ||
    roles.isFinanceAdmin ||
    roles.isPublisher ||
    roles.isModerator
  );
}

export function canAccessTab(roles: UserRoles, tab: AdminTab): boolean {
  switch (tab) {
    case "stats":
      return canAccessAdmin(roles);
    case "members":
      return roles.isGlobalAdmin || roles.isChapterAdmin || roles.isDataSteward;
    case "chapters":
      return roles.isGlobalAdmin;
    case "roles":
      return roles.isGlobalAdmin || roles.isChapterAdmin || roles.isDataSteward;
    case "events":
      return roles.isGlobalAdmin || roles.isChapterAdmin || roles.isEventManager;
    case "news-publisher":
      return roles.isGlobalAdmin || roles.isPublisher;
    case "moderator":
      return roles.isGlobalAdmin || roles.isModerator;
    case "announcements":
      return roles.isGlobalAdmin || roles.isChapterAdmin;
    case "finance":
      return roles.isGlobalAdmin || roles.isFinanceAdmin;
    case "verification":
      return roles.isGlobalAdmin || roles.isChapterAdmin || roles.isDataSteward;
    case "reports":
      return roles.isGlobalAdmin || roles.isModerator;
    case "transfers":
      return roles.isGlobalAdmin || roles.isChapterAdmin;
    case "audits":
      return roles.isGlobalAdmin;
    case "tag-requests":
      return roles.isGlobalAdmin || roles.isChapterAdmin || roles.isDataSteward;
    case "directory":
      return roles.isGlobalAdmin || roles.isDirectoryManager;
    case "samiti":
      return roles.isGlobalAdmin || roles.isChapterAdmin;
    case "whatsapp":
      return roles.isGlobalAdmin || roles.isChapterAdmin;
    case "sms":
      return roles.isGlobalAdmin || roles.isChapterAdmin;
    case "bulk-content":
      return roles.isGlobalAdmin;
    case "banned-keywords":
      return roles.isGlobalAdmin || roles.isModerator;
    case "analytics":
      return roles.isGlobalAdmin;
    default:
      return false;
  }
}
