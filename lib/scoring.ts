export interface LeadInput {
  state: string;
  landOwnership: string;
  acreage: string;
  timeline: string;
  buildStage: string;
  budget: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  bestTime: string;
  source: string;
  variant?: string;
}

export type Tier = "A" | "B" | "Nurture";

export interface ScoredLead {
  score: number;
  tier: Tier;
}

export function scoreLead(lead: LeadInput): ScoredLead {
  let score = 0;

  if (lead.landOwnership === "own-outright") score += 30;
  if (lead.landOwnership === "own-financing") score += 20;

  if (lead.timeline === "0-6mo" || lead.timeline === "6-12mo") score += 25;

  if (
    lead.budget === "150-300k" ||
    lead.budget === "300-500k" ||
    lead.budget === "500k-plus"
  ) {
    score += 20;
  }

  if (lead.state === "TX" || lead.state === "TN") score += 15;

  if (lead.acreage === "5-20" || lead.acreage === "20-plus") score += 10;

  if (lead.buildStage === "need-builder") score += 15;

  if (lead.timeline === "18mo-plus") score -= 20;

  let tier: Tier;
  if (score >= 85) tier = "A";
  else if (score >= 50) tier = "B";
  else tier = "Nurture";

  return { score, tier };
}
