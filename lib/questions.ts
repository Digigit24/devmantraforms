import type { Question, Sector, QuestionOption } from '@/types';

export const Q9_SECTOR_OPTIONS: Record<Sector, QuestionOption[]> = {
  saas: [
    { value: 'saas_no_moat',         label: "No moat yet — we're first to market",               points: 2  },
    { value: 'saas_brand',           label: 'Brand recognition and early customer relationships', points: 4  },
    { value: 'saas_data',            label: 'Proprietary data / network effects building',        points: 6  },
    { value: 'saas_patents_pending', label: 'Core patents pending or trademarks filed',           points: 8  },
    { value: 'saas_patents_at_scale',label: 'Patents issued + proprietary platform at scale',     points: 10 },
  ],
  d2c: [
    { value: 'd2c_no_moat',      label: 'No moat yet',                                        points: 2  },
    { value: 'd2c_brand',        label: 'Brand and customer reviews',                          points: 4  },
    { value: 'd2c_loyalty',      label: 'Strong repeat purchase / customer loyalty metrics',   points: 6  },
    { value: 'd2c_supply_chain', label: 'Proprietary supply chain or trademarks',              points: 8  },
    { value: 'd2c_full_estate',  label: 'Full brand estate + exclusive distribution',          points: 10 },
  ],
  fintech: [
    { value: 'fintech_no_license',         label: 'No regulatory license yet',                             points: 2  },
    { value: 'fintech_license_pending',    label: 'License application in process',                        points: 4  },
    { value: 'fintech_license_approved',   label: 'License approved, building compliance moat',            points: 6  },
    { value: 'fintech_proprietary_models', label: 'Licensed + proprietary risk / underwriting models',     points: 8  },
    { value: 'fintech_full_stack',         label: 'Licensed + patents + scale-based network effects',      points: 10 },
  ],
  manufacturing: [
    { value: 'mfg_no_ip',              label: 'No IP yet',                                          points: 2  },
    { value: 'mfg_proprietary_process',label: 'Proprietary process, no patents',                   points: 4  },
    { value: 'mfg_patents_pending',    label: 'Patents pending',                                    points: 6  },
    { value: 'mfg_patents_issued',     label: 'Patents issued',                                     points: 8  },
    { value: 'mfg_full_estate',        label: 'Complete patent estate + proprietary equipment',     points: 10 },
  ],
  services: [
    { value: 'svc_no_diff',               label: 'No differentiation yet',                                            points: 2  },
    { value: 'svc_brand',                 label: 'Brand and team expertise',                                          points: 4  },
    { value: 'svc_contracts',             label: 'Signed client contracts and case studies',                          points: 6  },
    { value: 'svc_methodology',           label: 'Proprietary methodology / frameworks',                              points: 8  },
    { value: 'svc_industry_recognition',  label: 'Published frameworks + trademarked process + industry recognition', points: 10 },
  ],
  other: [
    { value: 'mfg_no_ip',              label: 'No IP yet',                                          points: 2  },
    { value: 'mfg_proprietary_process',label: 'Proprietary process, no patents',                   points: 4  },
    { value: 'mfg_patents_pending',    label: 'Patents pending',                                    points: 6  },
    { value: 'mfg_patents_issued',     label: 'Patents issued',                                     points: 8  },
    { value: 'mfg_full_estate',        label: 'Complete patent estate + proprietary equipment',     points: 10 },
  ],
};

export const QUESTIONS: Question[] = [
  {
    id: 'q1a',
    type: 'founder_name',
    question: "First, what's your name?",
    dimension: null,
    weight: 0,
  },
  {
    id: 'q1b',
    type: 'company_name',
    question: "And what's your startup called, {founder_name}?",
    dimension: null,
    weight: 0,
  },
  {
    id: 'q2',
    type: 'sector',
    question: 'Which sector best describes {company_name}?',
    dimension: null,
    weight: 0,
    options: [
      { value: 'saas',          label: 'SaaS / B2B Software',              points: 0 },
      { value: 'd2c',           label: 'D2C / Consumer',                   points: 0 },
      { value: 'fintech',       label: 'Fintech',                          points: 0 },
      { value: 'manufacturing', label: 'Manufacturing / Deep Tech',        points: 0 },
      { value: 'services',      label: 'Services / Professional Services', points: 0 },
      { value: 'other',         label: 'Other',                            points: 0 },
    ],
  },
  {
    id: 'q3',
    type: 'single_select',
    question: 'Where is {company_name} today?',
    dimension: 'stage',
    weight: 0.10,
    options: [
      { value: 'business_plan',    label: 'Only have a business plan',                         points: 2  },
      { value: 'product_described',label: 'Product / service description ready',               points: 4  },
      { value: 'product_ready',    label: 'Product ready for customer evaluation',             points: 6  },
      { value: 'beta_acceptance',  label: 'Positive customer acceptance via beta testing',     points: 8  },
      { value: 'full_acceptance',  label: 'Full customer acceptance of product / service',     points: 10 },
    ],
  },
  {
    id: 'q4',
    type: 'single_select',
    question: "What's {company_name}'s current annual revenue?",
    dimension: 'opportunity',
    weight: 0,
    options: [
      { value: 'under_1cr',  label: 'Under ₹1 cr',   points: 2  },
      { value: '1_to_5cr',   label: '₹1 – 5 cr',     points: 4  },
      { value: '5_to_25cr',  label: '₹5 – 25 cr',    points: 6  },
      { value: '25_to_50cr', label: '₹25 – 50 cr',   points: 8  },
      { value: 'over_50cr',  label: '₹50 cr+',        points: 10 },
    ],
  },
  {
    id: 'q5',
    type: 'single_select',
    question: "What's the total addressable market (TAM) for your product or service in India?",
    helperText: 'Rough estimate is fine — investors look for ballpark sizing.',
    dimension: 'opportunity',
    weight: 0,
    options: [
      { value: 'under_100cr',    label: 'Less than ₹100 cr',     points: 0 },
      { value: '100_to_500cr',   label: '₹100 – 500 cr',         points: 2 },
      { value: '500_to_1000cr',  label: '₹500 – 1,000 cr',       points: 4 },
      { value: '1000_to_5000cr', label: '₹1,000 – 5,000 cr',     points: 6 },
      { value: 'over_5000cr',    label: '₹5,000 cr+',             points: 8 },
      { value: 'not_sure',       label: 'Not sure yet',            points: 0 },
    ],
  },
  {
    id: 'q6',
    type: 'single_select',
    question: "What's your honest 5-year revenue projection for {company_name}?",
    dimension: 'opportunity',
    weight: 0,
    options: [
      { value: 'under_10cr',  label: 'Less than ₹10 cr', points: 2  },
      { value: '10_to_25cr',  label: '₹10 – 25 cr',      points: 4  },
      { value: '25_to_50cr',  label: '₹25 – 50 cr',      points: 6  },
      { value: '50_to_100cr', label: '₹50 – 100 cr',     points: 8  },
      { value: 'over_100cr',  label: '₹100 cr+',          points: 10 },
    ],
  },
  {
    id: 'q7',
    type: 'single_select',
    question: "What's your professional background before {company_name}?",
    dimension: 'mgmt',
    weight: 0,
    options: [
      { value: 'fresh_grad',       label: 'Straight out of college',             points: 2  },
      { value: 'exec_no_client',   label: 'Executive role, no client interface', points: 4  },
      { value: 'senior_mgmt',      label: 'Senior management role',              points: 6  },
      { value: 'sector_experience',label: 'Experience in this specific sector',  points: 8  },
      { value: 'prior_ceo',        label: 'Prior MD / CEO / CFO role',           points: 10 },
    ],
  },
  {
    id: 'q8',
    type: 'single_select',
    question: 'Which best describes your current team?',
    dimension: 'mgmt',
    weight: 0,
    options: [
      { value: 'solo',               label: 'Solo founder, no management team yet',                              points: 2  },
      { value: 'team_no_mgmt',       label: 'Team in place but no strong management background',                 points: 4  },
      { value: 'team_with_degrees',  label: 'Team with professional / management degrees',                       points: 6  },
      { value: 'team_plus_advisors', label: 'Complete core team + strong advisory board',                        points: 8  },
      { value: 'team_with_successors',label: 'Complete experienced team with named successors for key roles',    points: 10 },
    ],
  },
  {
    id: 'q9',
    type: 'single_select',
    question: "What's your defensibility — what stops a competitor from copying you?",
    dimension: 'competitive',
    weight: 0.15,
    sectorOptions: Q9_SECTOR_OPTIONS,
    options: Q9_SECTOR_OPTIONS.other,
  },
  {
    id: 'q10',
    type: 'single_select',
    question: 'How is {company_name} reaching customers today?',
    dimension: 'channels',
    weight: 0.10,
    options: [
      { value: 'no_channels',       label: "Haven't worked out sales channels yet",            points: 2  },
      { value: 'identified_partners',label: 'Identified potential channel partners',            points: 4  },
      { value: 'testing_channels',  label: 'Narrowed to one or two channels, testing',         points: 6  },
      { value: 'verified_revenue',  label: 'Initial channels verified, generating revenue',    points: 8  },
      { value: 'multi_channel_scale',label: 'Multiple channels established and scalable',      points: 10 },
    ],
  },
  {
    id: 'q11',
    type: 'single_select',
    question: 'How much capital are you looking to raise in your next round?',
    dimension: 'funding',
    weight: 0.10,
    options: [
      { value: 'under_2cr',  label: 'Under ₹2 cr',  description: 'Pre-seed',       points: 4  },
      { value: '2_to_5cr',   label: '₹2 – 5 cr',    description: 'Seed',           points: 6  },
      { value: '5_to_10cr',  label: '₹5 – 10 cr',   description: 'Pre-Series A',   points: 8  },
      { value: '10_to_20cr', label: '₹10 – 20 cr',  description: 'Series A',       points: 10 },
      { value: 'over_20cr',  label: '₹20 cr+',       description: 'Series A / B',  points: 10 },
    ],
  },
  {
    id: 'q12',
    type: 'lead_capture',
    question: 'Your Fundability Report is ready.',
    dimension: null,
    weight: 0,
  },
];

const PRE_REVENUE_VALUES = new Set(['business_plan', 'product_described', 'product_ready']);

export function getQuestionSequence(q3Answer?: string): string[] {
  const isPreRevenue = !q3Answer || PRE_REVENUE_VALUES.has(q3Answer);
  const seq = ['q1a', 'q1b', 'q2', 'q3'];
  if (!isPreRevenue) seq.push('q4');
  seq.push('q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12');
  return seq;
}

export function getQuestionById(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

export function getOptionPoints(questionId: string, value: string, sector?: string): number {
  const q = getQuestionById(questionId);
  if (!q) return 0;
  if (questionId === 'q9' && sector && q.sectorOptions) {
    const opts = q.sectorOptions[sector as Sector];
    if (opts) return opts.find((o) => o.value === value)?.points ?? 0;
  }
  return q.options?.find((o) => o.value === value)?.points ?? 0;
}
