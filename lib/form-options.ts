export interface Option {
  value: string;
  label: string;
}

export const STATE_OPTIONS: Option[] = [
  { value: "TX", label: "Texas" },
  { value: "TN", label: "Tennessee" },
  { value: "OK", label: "Oklahoma" },
  { value: "LA", label: "Louisiana" },
  { value: "OTHER", label: "Another state" },
];

export const LAND_OPTIONS: Option[] = [
  { value: "own-outright", label: "Yes — I own it outright" },
  { value: "own-financing", label: "Yes — still paying it off" },
  { value: "looking", label: "No — actively looking for land" },
  { value: "need-help", label: "No — I'll need help finding land" },
];

export const ACREAGE_OPTIONS: Option[] = [
  { value: "under-2", label: "Under 2 acres" },
  { value: "2-5", label: "2–5 acres" },
  { value: "5-20", label: "5–20 acres" },
  { value: "20-plus", label: "20+ acres" },
];

export const TIMELINE_OPTIONS: Option[] = [
  { value: "0-6mo", label: "Within 6 months" },
  { value: "6-12mo", label: "6–12 months" },
  { value: "12-18mo", label: "12–18 months" },
  { value: "18mo-plus", label: "18+ months — still early" },
];

export const STAGE_OPTIONS: Option[] = [
  { value: "exploring", label: "Just starting to explore" },
  { value: "need-design", label: "Have a rough idea, need design help" },
  { value: "need-builder", label: "Know what I want, need a builder" },
  { value: "starting-over", label: "Bad experience before — starting over" },
];

export const BUDGET_OPTIONS: Option[] = [
  { value: "under-150k", label: "Under $150k" },
  { value: "150-300k", label: "$150k–$300k" },
  { value: "300-500k", label: "$300k–$500k" },
  { value: "500k-plus", label: "$500k+" },
  { value: "unsure", label: "Not sure yet" },
];

export const BEST_TIME_OPTIONS: Option[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];
