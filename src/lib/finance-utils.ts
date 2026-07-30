export interface RecurringPledge {
  id: string;
  member_id: string;
  fund_id: string;
  amount: number;
  currency: string;
  interval: "weekly" | "monthly" | "quarterly" | "yearly";
  start_date: string;
  end_date: string | null;
  status: "active" | "paused" | "cancelled";
  notes: string | null;
}

export interface FundraisingCampaign {
  id: string;
  title: string;
  description: string;
  goal_amount: number;
  currency: string;
  start_date: string;
  end_date: string;
  status: "draft" | "active" | "completed" | "cancelled";
  campaign_type: string;
  chapter_id: string | null;
  created_by: string;
  cover_image_url: string | null;
}

const INTERVAL_MULTIPLIERS: Record<string, number> = {
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

export function calculateAnnualPledge(amount: number, interval: string): number {
  const multiplier = INTERVAL_MULTIPLIERS[interval] ?? 12;
  return amount * multiplier;
}

export function calculatePledgeTotal(
  pledge: Pick<RecurringPledge, "amount" | "interval" | "start_date" | "end_date">
): number {
  const start = new Date(pledge.start_date);
  const end = pledge.end_date ? new Date(pledge.end_date) : new Date();
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return 0;

  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  switch (pledge.interval) {
    case "weekly":
      return Math.floor(diffDays / 7) * pledge.amount;
    case "monthly":
      return Math.floor(diffDays / 30.44) * pledge.amount;
    case "quarterly":
      return Math.floor(diffDays / 91.31) * pledge.amount;
    case "yearly":
      return Math.floor(diffDays / 365.25) * pledge.amount;
    default:
      return Math.floor(diffDays / 30.44) * pledge.amount;
  }
}

export function getCampaignProgress(raised: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((raised / goal) * 100));
}

export function getCampaignDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function isCampaignActive(campaign: Pick<FundraisingCampaign, "status" | "start_date" | "end_date">): boolean {
  if (campaign.status !== "active") return false;
  const now = new Date();
  const start = new Date(campaign.start_date);
  const end = new Date(campaign.end_date);
  return now >= start && now <= end;
}

export function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    INR: "\u20B9",
    USD: "$",
    GBP: "\u00A3",
    AED: "AED ",
    SGD: "S$",
    AUD: "A$",
  };
  return `${symbols[currency] ?? currency + " "}${amount.toLocaleString()}`;
}
