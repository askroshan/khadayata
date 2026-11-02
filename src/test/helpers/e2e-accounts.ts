/** Shared E2E / integration seed accounts (password hashes restored via scripts/seed-e2e-role-users.mjs). */
export const E2E_PASSWORD = "TestPass123!";

export type E2ERoleKey =
  | "globalAdmin"
  | "chapterAdmin"
  | "dataSteward"
  | "directoryManager"
  | "eventManager"
  | "financeAdmin"
  | "publisher"
  | "moderator"
  | "member"
  | "unverified";

export const E2E_ACCOUNTS: Record<
  E2ERoleKey,
  { email: string; roleLabel: string | null; adminTabs: string[] }
> = {
  globalAdmin: {
    email: "global-admin@khadayataonline.com",
    roleLabel: "Global Admin",
    adminTabs: ["members", "chapters", "finance", "analytics", "roles"],
  },
  chapterAdmin: {
    email: "chapter-admin@khadayataonline.com",
    roleLabel: "Chapter Admin",
    adminTabs: ["members", "events", "announcements", "roles"],
  },
  dataSteward: {
    email: "data-steward@khadayataonline.com",
    roleLabel: "Data Steward",
    adminTabs: ["verification", "members", "audits", "tag-requests"],
  },
  directoryManager: {
    email: "dir-manager@khadayataonline.com",
    roleLabel: "Directory Manager",
    adminTabs: ["directory"],
  },
  eventManager: {
    email: "event-manager@khadayataonline.com",
    roleLabel: "Event Manager",
    adminTabs: ["events"],
  },
  financeAdmin: {
    email: "finance-admin@khadayataonline.com",
    roleLabel: "Finance Admin",
    adminTabs: ["finance"],
  },
  publisher: {
    email: "publisher@khadayataonline.com",
    roleLabel: "Global Publisher",
    adminTabs: ["news-publisher"],
  },
  moderator: {
    email: "moderator@khadayataonline.com",
    roleLabel: "Moderator",
    adminTabs: ["reports", "members", "banned-keywords"],
  },
  member: {
    email: "member@khadayataonline.com",
    roleLabel: null,
    adminTabs: [],
  },
  unverified: {
    email: "unverified@khadayataonline.com",
    roleLabel: null,
    adminTabs: [],
  },
};
