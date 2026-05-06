import { neon, neonConfig } from '@neondatabase/serverless';
import { Agent, fetch as undiciFetch } from 'undici';

neonConfig.fetchFunction = (url: string, opts: unknown) =>
  undiciFetch(url as Parameters<typeof undiciFetch>[0], {
    ...(opts as Parameters<typeof undiciFetch>[1]),
    dispatcher: new Agent({ connect: { family: 4 } }),
  });

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return neon(url);
}

export interface LeadSummary {
  id: string;
  founderName: string;
  email: string;
  phone: string;
  companyName: string;
  sector: string;
  createdAt: string;
  totalScore: number | null;
  tier: string | null;
}

export interface LeadDetail {
  id: string;
  founderName: string;
  email: string;
  phone: string;
  companyName: string;
  sector: string;
  createdAt: string;
  totalScore: number;
  tier: string;
  dimensionScores: Record<string, number>;
  weakestDimension: string;
  flags: string[];
  responses: Array<{ questionId: string; answer: string; score: number | null }>;
  aiOutput: {
    executiveVerdict: string;
    top3Actions: Array<{ title: string; body: string }>;
    industryBenchmark: string;
  };
}

export interface ResultSummary {
  id: string;
  founderName: string;
  email: string;
  companyName: string;
  sector: string;
  createdAt: string;
  totalScore: number;
  tier: string;
  dimensionScores: Record<string, number>;
  weakestDimension: string;
  flags: string[];
}

export interface AdminStats {
  totalSubmissions: number;
  avgScore: number;
  maxScore: number;
  minScore: number;
  tierBreakdown: Record<string, number>;
  sectorBreakdown: Record<string, number>;
  recentSubmissions: Array<{ id: string; companyName: string; totalScore: number; createdAt: string }>;
  submissionsLast7Days: number;
  submissionsLast30Days: number;
}

export async function adminGetLeads(page: number, limit: number): Promise<{ data: LeadSummary[]; total: number }> {
  const sql = getSql();
  const offset = (page - 1) * limit;

  const [rows, countRows] = await Promise.all([
    sql`
      SELECT
        l.id,
        l.name        AS founder_name,
        l.email,
        l.phone,
        l.company     AS company_name,
        l.sector,
        l.created_at  AS created_at,
        r.total_score,
        r.tier
      FROM leads l
      LEFT JOIN results r ON r.lead_id = l.id
      ORDER BY l.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    sql`SELECT COUNT(*) AS total FROM leads`,
  ]);

  return {
    total: Number(countRows[0].total),
    data: rows.map((row) => ({
      id: row.id,
      founderName: row.founder_name,
      email: row.email,
      phone: row.phone,
      companyName: row.company_name,
      sector: row.sector,
      createdAt: String(row.created_at),
      totalScore: row.total_score != null ? Number(row.total_score) : null,
      tier: row.tier ?? null,
    })),
  };
}

export async function adminGetLeadById(id: string): Promise<LeadDetail | null> {
  const sql = getSql();

  const [mainRows, responseRows] = await Promise.all([
    sql`
      SELECT
        l.id,
        l.name         AS founder_name,
        l.email,
        l.phone,
        l.company      AS company_name,
        l.sector,
        l.created_at,
        r.total_score,
        r.tier,
        r.dimension_scores,
        r.weakest_dimension,
        r.flags,
        a.executive_verdict,
        a.actions,
        a.benchmark
      FROM leads l
      JOIN results    r ON r.lead_id = l.id
      JOIN ai_outputs a ON a.lead_id = l.id
      WHERE l.id = ${id}
      LIMIT 1
    `,
    sql`
      SELECT question_id, answer, score
      FROM responses
      WHERE lead_id = ${id}
      ORDER BY question_id
    `,
  ]);

  if (!mainRows.length) return null;
  const row = mainRows[0];

  return {
    id: row.id,
    founderName: row.founder_name,
    email: row.email,
    phone: row.phone,
    companyName: row.company_name,
    sector: row.sector,
    createdAt: String(row.created_at),
    totalScore: Number(row.total_score),
    tier: row.tier,
    dimensionScores: row.dimension_scores as Record<string, number>,
    weakestDimension: row.weakest_dimension,
    flags: row.flags as string[],
    responses: responseRows.map((r) => ({
      questionId: r.question_id,
      answer: r.answer,
      score: r.score != null ? Number(r.score) : null,
    })),
    aiOutput: {
      executiveVerdict: row.executive_verdict,
      top3Actions: row.actions as Array<{ title: string; body: string }>,
      industryBenchmark: row.benchmark,
    },
  };
}

export async function adminGetResults(
  page: number,
  limit: number,
  tier?: string,
): Promise<{ data: ResultSummary[]; total: number }> {
  const sql = getSql();
  const offset = (page - 1) * limit;

  const rows = tier
    ? await sql`
        SELECT
          l.id,
          l.name    AS founder_name,
          l.email,
          l.company AS company_name,
          l.sector,
          l.created_at,
          r.total_score,
          r.tier,
          r.dimension_scores,
          r.weakest_dimension,
          r.flags
        FROM leads l
        JOIN results r ON r.lead_id = l.id
        WHERE r.tier = ${tier}
        ORDER BY r.total_score DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    : await sql`
        SELECT
          l.id,
          l.name    AS founder_name,
          l.email,
          l.company AS company_name,
          l.sector,
          l.created_at,
          r.total_score,
          r.tier,
          r.dimension_scores,
          r.weakest_dimension,
          r.flags
        FROM leads l
        JOIN results r ON r.lead_id = l.id
        ORDER BY r.total_score DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

  const countRows = tier
    ? await sql`SELECT COUNT(*) AS total FROM results WHERE tier = ${tier}`
    : await sql`SELECT COUNT(*) AS total FROM results`;

  return {
    total: Number(countRows[0].total),
    data: rows.map((row) => ({
      id: row.id,
      founderName: row.founder_name,
      email: row.email,
      companyName: row.company_name,
      sector: row.sector,
      createdAt: String(row.created_at),
      totalScore: Number(row.total_score),
      tier: row.tier,
      dimensionScores: row.dimension_scores as Record<string, number>,
      weakestDimension: row.weakest_dimension,
      flags: row.flags as string[],
    })),
  };
}

export async function adminGetStats(): Promise<AdminStats> {
  const sql = getSql();

  const [aggregateRows, tierRows, sectorRows, recentRows, last7Rows, last30Rows] = await Promise.all([
    sql`
      SELECT
        COUNT(*)             AS total,
        ROUND(AVG(total_score), 1) AS avg_score,
        MAX(total_score)     AS max_score,
        MIN(total_score)     AS min_score
      FROM results
    `,
    sql`
      SELECT tier, COUNT(*) AS count
      FROM results
      GROUP BY tier
      ORDER BY count DESC
    `,
    sql`
      SELECT sector, COUNT(*) AS count
      FROM leads
      GROUP BY sector
      ORDER BY count DESC
    `,
    sql`
      SELECT l.id, l.company AS company_name, r.total_score, l.created_at
      FROM leads l
      JOIN results r ON r.lead_id = l.id
      ORDER BY l.created_at DESC
      LIMIT 5
    `,
    sql`
      SELECT COUNT(*) AS count
      FROM leads
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `,
    sql`
      SELECT COUNT(*) AS count
      FROM leads
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `,
  ]);

  const agg = aggregateRows[0];

  const tierBreakdown: Record<string, number> = {};
  for (const row of tierRows) {
    tierBreakdown[row.tier] = Number(row.count);
  }

  const sectorBreakdown: Record<string, number> = {};
  for (const row of sectorRows) {
    sectorBreakdown[row.sector] = Number(row.count);
  }

  return {
    totalSubmissions: Number(agg.total),
    avgScore: Number(agg.avg_score),
    maxScore: Number(agg.max_score),
    minScore: Number(agg.min_score),
    tierBreakdown,
    sectorBreakdown,
    recentSubmissions: recentRows.map((r) => ({
      id: r.id,
      companyName: r.company_name,
      totalScore: Number(r.total_score),
      createdAt: String(r.created_at),
    })),
    submissionsLast7Days: Number(last7Rows[0].count),
    submissionsLast30Days: Number(last30Rows[0].count),
  };
}
