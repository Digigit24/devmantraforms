export type Sector = 'saas' | 'd2c' | 'fintech' | 'manufacturing' | 'services' | 'other';

export type QuestionType = 'founder_name' | 'company_name' | 'sector' | 'single_select' | 'lead_capture';

export type DimensionKey = 'mgmt' | 'opportunity' | 'competitive' | 'channels' | 'stage' | 'funding';

export type TierValue =
  | 'idea_stage'
  | 'seed_ready_with_gaps'
  | 'series_a_fundable'
  | 'top_decile_founder';

export interface QuestionOption {
  value: string;
  label: string;
  points: number;
  description?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  helperText?: string;
  dimension: DimensionKey | null;
  weight: number;
  options?: QuestionOption[];
  sectorOptions?: Partial<Record<Sector, QuestionOption[]>>;
}

export interface DimensionScores {
  mgmt:        number;
  opportunity: number;
  competitive: number;
  channels:    number;
  stage:       number;
  funding:     number;
}

export interface ScoringResult {
  finalScore:       number;
  tier:             TierValue;
  dimensionScores:  DimensionScores;
  weakestDimension: DimensionKey;
  flags:            string[];
}

export interface AIOutput {
  executive_verdict: string;
  top_3_actions:     Array<{ title: string; body: string }>;
  industry_benchmark: string;
}

export interface DiagnosticAnswers {
  founderName: string;
  companyName: string;
  sector:      Sector;
  q3:  string;
  q4?: string;
  q5:  string;
  q6:  string;
  q7:  string;
  q8:  string;
  q9:  string;
  q10: string;
  q11: string;
  email: string;
  phone: string;
}

export interface SubmitPayload {
  answers: DiagnosticAnswers;
}

export interface ResultRecord {
  id:               string;
  founderName:      string;
  companyName:      string;
  sector:           Sector;
  finalScore:       number;
  tier:             TierValue;
  dimensionScores:  DimensionScores;
  weakestDimension: DimensionKey;
  flags:            string[];
  aiOutput:         AIOutput;
  createdAt:        string;
}

export const TIER_META: Record<TierValue, { label: string; color: string; bg: string; range: string }> = {
  idea_stage:           { label: 'Idea Stage',           color: '#CC1F2A', bg: '#FEF2F2', range: '0–49'   },
  seed_ready_with_gaps: { label: 'Seed-Ready with Gaps', color: '#C8890A', bg: '#FFFBEB', range: '50–69'  },
  series_a_fundable:    { label: 'Series A Fundable',    color: '#4A73C4', bg: '#EFF6FF', range: '70–89'  },
  top_decile_founder:   { label: 'Top-Decile Founder',   color: '#0E7C4F', bg: '#ECFDF5', range: '90–100' },
};

export const DIMENSION_META: Record<DimensionKey, { label: string; weight: number }> = {
  mgmt:        { label: 'Management Team',      weight: 30 },
  opportunity: { label: 'Market Opportunity',   weight: 25 },
  competitive: { label: 'Competitive Moat',     weight: 15 },
  channels:    { label: 'Sales Channels',       weight: 10 },
  stage:       { label: 'Business Stage',       weight: 10 },
  funding:     { label: 'Funding Ask',          weight: 10 },
};
