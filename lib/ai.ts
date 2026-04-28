import OpenAI from 'openai';
import type { AIOutput, DiagnosticAnswers, DimensionScores, ScoringResult, TierValue } from '@/types';
import { DIMENSION_META, TIER_META } from '@/types';

// ── Provider config ────────────────────────────────────────────────────────
// To switch providers, set AI_PROVIDER=openai in .env (default: mistral)
const PROVIDERS = {
  mistral: {
    baseURL: 'https://api.mistral.ai/v1',
    apiKey:  process.env.MISTRAL_API_KEY ?? '',
    model:   'mistral-large-latest',
  },
  openai: {
    baseURL: undefined,                      // OpenAI default endpoint
    apiKey:  process.env.OPENAI_API_KEY ?? '',
    model:   'gpt-4o-mini',
  },
} as const;

type ProviderKey = keyof typeof PROVIDERS;

function getProvider(): (typeof PROVIDERS)[ProviderKey] {
  const key = (process.env.AI_PROVIDER ?? 'mistral') as ProviderKey;
  return PROVIDERS[key] ?? PROVIDERS.mistral;
}

function getClient(): { client: OpenAI; model: string } {
  const p = getProvider();
  return {
    client: new OpenAI({ apiKey: p.apiKey, ...(p.baseURL ? { baseURL: p.baseURL } : {}) }),
    model:  p.model,
  };
}
// ──────────────────────────────────────────────────────────────────────────

const FLAG_DESCRIPTIONS: Record<string, string> = {
  ambitious_raise_for_stage:        'Founder is pre-revenue but targeting a large raise (Series A range)',
  under_capitalized_for_revenue:    'Revenue exceeds ₹50 cr but raise amount seems under-sized',
  team_depth_mismatch_with_raise:   'Team depth is weak relative to the size of raise being targeted',
  projection_exceeds_market_capture:'5-year projection significantly exceeds stated TAM - sizing may need revisiting',
  unclear_market_sizing:            'Founder is unsure of their TAM',
  pre_moat_fintech:                 'Fintech startup has no regulatory licence yet',
};

// Hardcoded fallbacks when the AI call fails
const FALLBACK: Record<TierValue, AIOutput> = {
  idea_stage: {
    executive_verdict:
      `{name}, the Fundability Index places {company} at the Idea Stage. At this point, the fundamentals investors evaluate - market validation, team depth, and a defensible moat - are still being established. That is not a disqualifier; it is a clear roadmap.\n\nThe most common mistake founders at this stage make is pursuing capital before the business is ready to absorb it productively. Investors are not just buying an idea; they are backing an operating system. Your immediate priority should be converting concept into evidence.\n\nDev Mantra's advisory team works with founders precisely at this inflection point - helping compress the timeline from idea to investor-readiness through structured financial modelling, compliance foundations, and pitch positioning.`,
    top_3_actions: [
      { title: 'Build your financial model',       body: 'A bottom-up revenue model with 3-year projections is the single document that separates an investor-ready founder from an idea-stage one. It forces you to validate assumptions before pitching.' },
      { title: 'Validate with paying customers',   body: 'Even 10 paying customers - or letters of intent - transform your narrative from "I believe" to "the market has confirmed." Prioritise this above all else.' },
      { title: 'Establish compliance foundations', body: 'GST registration, shareholders\' agreement, IP assignment, and basic corporate governance are non-negotiable for institutional investors. Get these in order early to avoid delays at due diligence.' },
    ],
    industry_benchmark: 'Across Dev Mantra\'s portfolio of 500+ Indian startups assessed at the Idea Stage, roughly 30% reach Seed-Ready status within 12 months when they focus on the three areas above.',
  },
  seed_ready_with_gaps: {
    executive_verdict:
      `{name}, {company} is operating in the Seed-Ready zone - meaningful progress has been made, but there are identifiable gaps that sophisticated investors will surface in diligence.\n\nInvestors evaluating seed-stage companies are pattern-matching against a mental model of what a Series A looks like. The gaps in your profile are what stand between you and a confident yes.\n\nThe next 90 days are critical. Targeted improvements to the weakest dimensions of your profile can meaningfully shift your fundability tier.`,
    top_3_actions: [
      { title: 'Strengthen your management narrative', body: 'Add at least one domain-credible advisor or senior hire before your next investor meeting. Investors back teams, not ideas.' },
      { title: 'Document your traction clearly',       body: 'Organise your revenue, user, and engagement metrics into a clean one-page "traction summary." Ambiguity about traction is one of the top reasons seed deals stall.' },
      { title: 'Commission a Virtual CFO review',      body: 'A structured financial health check - cash flow, burn rate, unit economics - is the foundation of a compelling data room. Dev Mantra\'s Virtual CFO service provides this in 2-3 weeks.' },
    ],
    industry_benchmark: 'Seed-Ready companies that address their top two dimension gaps within a quarter see an average 18-point improvement in their fundability score.',
  },
  series_a_fundable: {
    executive_verdict:
      `{name}, {company} scores in the Series A Fundable range - a strong result that places you in the top quartile of founders who take this diagnostic.\n\nAt this stage, the difference between a good process and a great one is preparation. Institutional investors at the Series A level are conducting detailed due diligence. A single gap can delay or kill a deal that was otherwise moving forward.\n\nThe priority now is to run a tight, professional fundraising process with a clean data room and a compelling investor narrative built on your actual metrics.`,
    top_3_actions: [
      { title: 'Prepare an investor-grade data room',   body: 'This includes audited financials, a detailed financial model, cap table, all material contracts, IP documentation, and compliance certificates. Gaps here cause deals to stall 60 days in.' },
      { title: 'Build a Series A-ready financial model', body: 'Your model should show 36-month projections with clear assumptions, unit economics, and a fundraising schedule tied to milestones.' },
      { title: 'Engage M&A or growth advisory early',   body: 'Dev Mantra\'s M&A Advisory practice works with Series A candidates to structure the raise and manage the process - increasing close rates and reducing dilution.' },
    ],
    industry_benchmark: 'Series A Fundable founders raise capital 40% faster when they enter the process with a complete data room and a rehearsed financial narrative.',
  },
  top_decile_founder: {
    executive_verdict:
      `{name}, {company} scores in the Top-Decile range - placing you among the most investor-ready founders in India by the metrics this diagnostic measures.\n\nAt this level, the risks are more subtle. Execution risk, market timing, and the quality of the specific investors you bring on board matter more than fundability itself.\n\nThe question is no longer "can you raise?" - it is "who do you raise from, on what terms, and what does the cap table look like five years from now?"`,
    top_3_actions: [
      { title: 'Create investor optionality',          body: 'Run parallel conversations with 8-12 qualified investors simultaneously. Optionality is the only leverage a founder has in a negotiation.' },
      { title: 'Stress-test your cap table strategy',  body: 'At this stage, dilution decisions compound significantly. Model out three scenarios with different investor profiles and terms.' },
      { title: 'Begin IPO or exit readiness planning', body: 'Top-decile founders think about the full journey from day one. Dev Mantra\'s IPO Readiness practice can help you shape governance and reporting standards today.' },
    ],
    industry_benchmark: 'Top-Decile founders consistently cite two differentiators: a fully prepared data room and a clear view of their cap table five years forward.',
  },
};

export async function generateAIReport(
  answers: DiagnosticAnswers,
  scoring: ScoringResult,
): Promise<AIOutput> {
  const { founderName, companyName, sector } = answers;
  const { finalScore, tier, dimensionScores, weakestDimension, flags } = scoring;

  const dimensionSummary = (Object.entries(dimensionScores) as [keyof DimensionScores, number][])
    .map(([k, v]) => `${DIMENSION_META[k].label}: ${(v * 10).toFixed(0)}/100`)
    .join(', ');

  const flagSummary = flags.length
    ? flags.map((f) => FLAG_DESCRIPTIONS[f] ?? f).join('\n- ')
    : 'None';

  const prompt = `You are the senior advisory voice at Dev Mantra Financial Services - 20+ years of experience, ₹5,000 Cr+ in transactions. Tone: authoritative, calm, specific, commercially aware. Never gushing, never harsh.

Founder: ${founderName}
Company: ${companyName}
Sector: ${sector}
Fundability Score: ${finalScore}/100
Tier: ${TIER_META[tier].label} (${TIER_META[tier].range})
Dimension scores: ${dimensionSummary}
Weakest area: ${DIMENSION_META[weakestDimension].label}
Advisory flags:
- ${flagSummary}

Return ONLY valid JSON (no markdown fences) matching this exact shape:
{
  "executive_verdict": "2-3 paragraphs. Reference the founder by name in the first paragraph. Be specific about what is strong and what needs work.",
  "top_3_actions": [
    { "title": "Short action title", "body": "2-3 sentences. At least one action should reference a Dev Mantra service area (Virtual CFO, M&A Advisory, IPO Readiness, Compliance, GCC Setup) naturally." },
    { "title": "...", "body": "..." },
    { "title": "...", "body": "..." }
  ],
  "industry_benchmark": "1 paragraph comparing this founder's score/tier against Indian startup fundraising patterns."
}`;

  try {
    const { client, model } = getClient();

    const response = await client.chat.completions.create(
      {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      },
      { timeout: 20_000 }, // 20 s hard cap - fall back to templates if exceeded
    );

    const raw    = response.choices[0]?.message?.content ?? '';
    const parsed = JSON.parse(raw) as AIOutput;

    if (!parsed.executive_verdict || !parsed.top_3_actions || !parsed.industry_benchmark)
      throw new Error('Incomplete AI response');

    return sanitizeOutput(parsed);
  } catch (err) {
    console.error(`[AI] ${process.env.AI_PROVIDER ?? 'mistral'} call failed:`, err);
    const fb = FALLBACK[tier];
    return sanitizeOutput({
      executive_verdict:  fb.executive_verdict.replace(/{name}/g, founderName).replace(/{company}/g, companyName),
      top_3_actions:      fb.top_3_actions,
      industry_benchmark: fb.industry_benchmark,
    });
  }
}

// Replace em dash (-) and en dash (-) with a plain keyboard hyphen (-)
function sanitizeOutput(output: AIOutput): AIOutput {
  const clean = (s: string) => s.replace(/-|-/g, '-');
  return {
    executive_verdict:  clean(output.executive_verdict),
    top_3_actions:      output.top_3_actions.map(a => ({ title: clean(a.title), body: clean(a.body) })),
    industry_benchmark: clean(output.industry_benchmark),
  };
}
