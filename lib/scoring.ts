import type { DiagnosticAnswers, DimensionKey, DimensionScores, ScoringResult, TierValue } from '@/types';
import { getOptionPoints } from './questions';

function pts(answers: Partial<DiagnosticAnswers>, qId: string): number {
  const val = answers[qId as keyof DiagnosticAnswers] as string | undefined;
  if (!val) return 0;
  return getOptionPoints(qId, val, answers.sector);
}

export function computeScore(answers: Partial<DiagnosticAnswers>): ScoringResult {
  const q3Points  = pts(answers, 'q3');
  const q4Shown   = Boolean(answers.q4);
  const q4Points  = q4Shown ? pts(answers, 'q4') : null;
  const q5Points  = pts(answers, 'q5');
  const q6Points  = pts(answers, 'q6');
  const q7Points  = pts(answers, 'q7');
  const q8Points  = pts(answers, 'q8');
  const q9Points  = pts(answers, 'q9');
  const q10Points = pts(answers, 'q10');
  const q11Points = pts(answers, 'q11');

  // Step 1 — Raw dimension scores (0–10)
  const mgmtScore        = (q7Points + q8Points) / 2;
  const opportunityScore = q4Points !== null
    ? (q4Points + q5Points + q6Points) / 3
    : (q5Points + q6Points) / 2;
  const competitiveScore = q9Points;
  const channelsScore    = q10Points;
  const stageScore       = q3Points;
  const fundingScore     = q11Points;

  // Step 2 — Weighted score (still 0–10)
  const weightedScore =
    mgmtScore        * 0.30 +
    opportunityScore * 0.25 +
    competitiveScore * 0.15 +
    channelsScore    * 0.10 +
    stageScore       * 0.10 +
    fundingScore     * 0.10;

  // Step 3 — Normalize to 0–100
  const finalScore = Math.round(weightedScore * 10);

  // Step 4 — Tier
  let tier: TierValue;
  if      (finalScore <= 49) tier = 'idea_stage';
  else if (finalScore <= 69) tier = 'seed_ready_with_gaps';
  else if (finalScore <= 89) tier = 'series_a_fundable';
  else                       tier = 'top_decile_founder';

  const dimensionScores: DimensionScores = {
    mgmt:        mgmtScore,
    opportunity: opportunityScore,
    competitive: competitiveScore,
    channels:    channelsScore,
    stage:       stageScore,
    funding:     fundingScore,
  };

  // Weakest dimension by raw score
  const weakestDimension = (Object.entries(dimensionScores) as [DimensionKey, number][])
    .sort(([, a], [, b]) => a - b)[0][0];

  // Cross-check flags
  const flags = computeFlags(answers as DiagnosticAnswers, q4Shown);

  return { finalScore, tier, dimensionScores, weakestDimension, flags };
}

function computeFlags(answers: DiagnosticAnswers, q4Shown: boolean): string[] {
  const flags: string[] = [];

  const preRevenue = new Set(['business_plan', 'product_described', 'product_ready']);
  const bigRaise   = new Set(['10_to_20cr', 'over_20cr']);

  if (preRevenue.has(answers.q3) && bigRaise.has(answers.q11))
    flags.push('ambitious_raise_for_stage');

  if (q4Shown && answers.q4 === 'over_50cr' &&
      (answers.q11 === 'under_2cr' || answers.q11 === '2_to_5cr'))
    flags.push('under_capitalized_for_revenue');

  if ((answers.q8 === 'solo' || answers.q8 === 'team_no_mgmt') && bigRaise.has(answers.q11))
    flags.push('team_depth_mismatch_with_raise');

  if ((answers.q5 === 'under_100cr' || answers.q5 === '100_to_500cr') &&
       answers.q6 === 'over_100cr')
    flags.push('projection_exceeds_market_capture');

  if (answers.q5 === 'not_sure')
    flags.push('unclear_market_sizing');

  if (answers.sector === 'fintech' && answers.q9 === 'fintech_no_license')
    flags.push('pre_moat_fintech');

  return flags;
}
