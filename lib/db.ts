import { neon } from '@neondatabase/serverless';
import type { AIOutput, DiagnosticAnswers, DimensionScores, ResultRecord, ScoringResult, TierValue } from '@/types';

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is not set');
  return neon(url);
}

export async function saveSubmission(
  answers:  DiagnosticAnswers,
  scoring:  ScoringResult,
  aiOutput: AIOutput,
): Promise<string> {
  const sql = getSql();

  // 1. Insert lead
  const [lead] = await sql`
    INSERT INTO leads (name, email, phone, company, sector)
    VALUES (
      ${answers.founderName},
      ${answers.email},
      ${answers.phone},
      ${answers.companyName},
      ${answers.sector}
    )
    RETURNING id
  `;
  const leadId = lead.id as string;

  // 2. Insert responses
  const responseFields: Array<[string, string | undefined]> = [
    ['q3',  answers.q3],
    ['q4',  answers.q4],
    ['q5',  answers.q5],
    ['q6',  answers.q6],
    ['q7',  answers.q7],
    ['q8',  answers.q8],
    ['q9',  answers.q9],
    ['q10', answers.q10],
    ['q11', answers.q11],
  ];
  for (const [qId, val] of responseFields) {
    if (!val) continue;
    const score = scoring.dimensionScores[
      qId === 'q3' ? 'stage'
      : (qId === 'q4' || qId === 'q5' || qId === 'q6') ? 'opportunity'
      : (qId === 'q7' || qId === 'q8') ? 'mgmt'
      : qId === 'q9'  ? 'competitive'
      : qId === 'q10' ? 'channels'
      : 'funding'
    ];
    await sql`
      INSERT INTO responses (lead_id, question_id, answer, score)
      VALUES (${leadId}, ${qId}, ${val}, ${score ?? null})
    `;
  }

  // 3. Insert results
  await sql`
    INSERT INTO results (lead_id, total_score, tier, dimension_scores, weakest_dimension, flags)
    VALUES (
      ${leadId},
      ${scoring.finalScore},
      ${scoring.tier},
      ${JSON.stringify(scoring.dimensionScores)},
      ${scoring.weakestDimension},
      ${JSON.stringify(scoring.flags)}
    )
  `;

  // 4. Insert AI output
  await sql`
    INSERT INTO ai_outputs (lead_id, executive_verdict, actions, benchmark)
    VALUES (
      ${leadId},
      ${aiOutput.executive_verdict},
      ${JSON.stringify(aiOutput.top_3_actions)},
      ${aiOutput.industry_benchmark}
    )
  `;

  return leadId;
}

export async function getResultById(id: string): Promise<ResultRecord | null> {
  const sql = getSql();

  const rows = await sql`
    SELECT
      l.id,
      l.name        AS "founderName",
      l.company     AS "companyName",
      l.sector,
      l.created_at  AS "createdAt",
      r.total_score      AS "finalScore",
      r.tier,
      r.dimension_scores AS "dimensionScores",
      r.weakest_dimension AS "weakestDimension",
      r.flags,
      a.executive_verdict,
      a.actions,
      a.benchmark
    FROM leads l
    JOIN results    r ON r.lead_id = l.id
    JOIN ai_outputs a ON a.lead_id = l.id
    WHERE l.id = ${id}
    LIMIT 1
  `;

  if (!rows.length) return null;
  const row = rows[0];

  return {
    id:               row.id,
    founderName:      row.founderName,
    companyName:      row.companyName,
    sector:           row.sector,
    createdAt:        String(row.createdAt),
    finalScore:       Number(row.finalScore),
    tier:             row.tier as TierValue,
    dimensionScores:  row.dimensionScores as DimensionScores,
    weakestDimension: row.weakestDimension as keyof DimensionScores,
    flags:            row.flags as string[],
    aiOutput: {
      executive_verdict:  row.executive_verdict,
      top_3_actions:      row.actions as AIOutput['top_3_actions'],
      industry_benchmark: row.benchmark,
    },
  };
}
