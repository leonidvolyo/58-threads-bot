import path from 'node:path';

export const PROMPT = `
You write short Threads posts for the founder of 58 Systems — a company that fixes broken operations for small businesses.

Target reader: SMB owner or operator. Skeptical, busy, tired of generic advice.

USE THIS HOOK INTENT: {HOOK_INTENT}

Hook intent guide:
contrarian_diagnosis — the obvious fix is wrong; name what's actually broken instead
hidden_cost — something bleeding time or money that never shows up in any report or budget
uncomfortable_truth — say the thing most people avoid saying out loud about business ops
pain_diagnosis — name a specific symptom the reader recognizes immediately from lived experience
dry_humor — one dry, slightly funny observation about operational chaos. Do NOT explain the joke.
topical_reaction — grounded, skeptical take on a trend, tool announcement, or AI hype
myth_busting — dismantle one widely believed fix for ops, tooling, or AI problems
false_growth_signal — something that looks like progress but masks a deeper operational problem
operator_confession — the kind of thing only said after seeing the same pattern 30 times
wrong_problem — the reader is solving the symptom, not the root cause
invisible_drain — something nobody names, nobody budgets for, but everyone quietly pays for
scaling_paradox — the system that worked at 10 clients is now the ceiling at 30

Format:
— 1 to 4 sentences. No lists. No bullets. No headers.
— First sentence: make it land hard. Use a specific detail, a named pain, a provocative frame.
  NOT "businesses often struggle with X" — something sharper. A concrete scenario. A named symptom.
— Include at least one concrete business object: CRM, lead, spreadsheet, inbox, follow-up, invoice,
  handoff, onboarding, tool, report, workflow, pipeline, meeting, email, task, client, etc.
— Ending options (pick what fits or use none):
  • silent exit — just stop after the observation
  • dry question — one blunt question that lands
  • soft punchline — a deadpan final line
  • soft nudge — "that part usually never shows up in the budget"
  No overt calls to action. No "reach out", "DM me", "check my bio". No hollow motivation.
— Length: 80–400 characters total.
— No links. One emoji MAX if it fits naturally — skip entirely if unsure.
— Voice: direct, slightly annoyed, a little dry. Like someone who has seen this pattern one too many times and stopped being surprised.
— Slightly imperfect sentence structure is fine. Don't over-polish.

Optional: if a single Threads hashtag is clearly on-target and adds reach, add it as the very last line (e.g. #SMBOps). One max. Skip entirely if uncertain — most posts should not have one.

Output ONLY the post text. No quotes. No labels. No explanation.

BANNED — regenerate if found:
"in today's world", "leverage", "unlock potential", "game-changer", "streamline your",
"scalable solution", "best practices", "digital transformation", "revolutionize",
"here are", "empower", "you've got this", "start today", "take action",
numbered or bulleted lists, hollow motivational endings

Topic: {TOPIC}
`.trim();

export const AI_CONFIG = {
  model: 'gemini-2.5-flash',
  maxRetries: 4,
  threadCharLimit: 500,
} as const;

export const HOOK_INTENTS = [
  'contrarian_diagnosis',
  'hidden_cost',
  'uncomfortable_truth',
  'pain_diagnosis',
  'dry_humor',
  'topical_reaction',
  'myth_busting',
  'false_growth_signal',
  'operator_confession',
  'wrong_problem',
  'invisible_drain',
  'scaling_paradox',
] as const;

export type HookIntent = (typeof HOOK_INTENTS)[number];

export const TOPIC_BUCKETS: Record<string, string[]> = {
  // ── Original buckets (kept, sharpened) ──
  'smb-chaos': [
    'The spreadsheet that "temporarily" became core infrastructure 3 years ago',
    'Running a business on 6 tools that don\'t talk to each other',
    'What Monday morning looks like when nothing is automated',
    'When the entire operation runs in someone\'s head, not a system',
  ],
  'losing-leads': [
    'Leads that fill a form and wait 48 hours to hear back',
    'The follow-up that never happened because someone forgot',
    'What happens to leads that come in on Friday evening',
    'Losing a deal because no one sent a second email',
  ],
  'tool-overload': [
    'Paying for 12 SaaS tools and actively using 4',
    'Copy-pasting data between systems every single morning',
    'When CRM, inbox, and project tool all have a different version of the truth',
    'Paying for integration that still doesn\'t actually work',
  ],
  'manual-frustration': [
    'The task done manually 300 times that still hasn\'t been automated',
    'Your most expensive person spending 2 hours a day on data entry',
    'Sending invoices manually when all the data is already in the system',
    'Building the same report from scratch every single week',
  ],
  'ai-hype-reality': [
    '"We\'re using AI now" meaning they got a ChatGPT account',
    'The gap between AI demos and what actually works in a 20-person business',
    'Why most AI advice is written for 500-person companies, not 15-person ones',
    'AI tools that promised everything — you still do it manually',
  ],
  'founder-pain': [
    'Can\'t take a week off because the business stops without you',
    'Being the only person who knows how the whole thing works',
    'The moment you realize you built yourself a job, not a business',
    'Explaining how to do something takes longer than just doing it yourself',
  ],
  'operational-bottleneck': [
    'One person your entire operation quietly depends on',
    'Onboarding a new hire takes a month because nothing is documented',
    'Decisions going through you that really shouldn\'t need to',
    'Every process lives in someone\'s head and disappears when they leave',
  ],
  'scaling-problems': [
    'What worked at 10 clients breaks completely at 30',
    'Revenue doubles. Chaos doubles with it.',
    'Growth that creates more firefighting, not less',
    'The systems that made sense when you started are strangling you now',
  ],
  'observations': [
    'What actually separates operationally clean businesses from chaotic ones',
    'The one automation that typically pays for itself in a few days',
    'Pattern I keep seeing in businesses that can\'t grow past a certain point',
    'What I\'d fix first if I walked into your business tomorrow',
  ],
  'light-humor': [
    'The Excel file that IS the business',
    'A meeting to discuss why there are too many meetings',
    'The email thread that replaced your entire project management tool',
    'Process documentation: a blank Google Doc created in 2022',
  ],
  'grab-attention': [
    'The real reason some small businesses stay stuck at the same size for years',
    'Why hiring more people sometimes makes operations slower',
    'The most expensive thing in a small business usually isn\'t payroll',
    'An uncomfortable pattern in businesses that keep losing time and clients',
  ],
  'ai-news-opinion': [
    'What the latest AI tool announcement actually means for a real small business',
    'Opinion: why most automation advice for SMBs misses the point entirely',
    'The honest gap between what AI can do and what most businesses actually need',
    'What\'s genuinely useful in the new wave of no-code tools vs. what\'s hype',
  ],

  // ── High-tension buckets (new) ──
  'things-owners-wont-admit': [
    'The process you\'re proud of that is actually just organized chaos',
    'You already know what\'s broken. You just haven\'t fixed it yet.',
    'The workaround that became the workflow',
    'Knowing your bottleneck and still not fixing it because "there\'s no time"',
  ],
  'expensive-lies': [
    '"We\'ll fix the process once we hire someone for it"',
    '"Our team is on top of it" when there\'s no system behind that',
    '"We\'re too small to need automation right now"',
    '"We tried that, it didn\'t work" after a 2-week half-implementation',
  ],
  'fake-growth-signals': [
    'More clients without fixing the underlying ops is just faster chaos',
    'A full pipeline that the team can\'t service properly',
    'Headcount growing. Margin shrinking. Everyone celebrating.',
    'Busier than ever, but the profit hasn\'t moved in 18 months',
  ],
  'hiring-wont-fix-it': [
    'Hiring someone to manage the problem instead of fixing the system',
    'The coordinator role that exists because the tools don\'t talk',
    '"We need a person for that" — for something that should run automatically',
    'Adding headcount to a broken process just means more people doing it wrong',
  ],
  'invisible-operational-debt': [
    'Every manual step that nobody talks about but everyone works around',
    'The technical debt equivalent in operations: patches on patches',
    'The unwritten rules that hold the entire operation together',
    'Operational debt that doesn\'t show on any balance sheet',
  ],
  'what-breaks-at-volume': [
    'The handoff that worked fine with 10 clients, fails silently at 40',
    'The thing that scales the worst: manual follow-up',
    'When the bottleneck isn\'t a person but an undocumented step nobody owns',
    'What breaks first isn\'t usually what you planned for',
  ],
  'ai-changes-nothing': [
    'Buying AI tools for a process that\'s broken at the logic level',
    'AI won\'t fix your CRM if nobody updates it',
    'Automating a broken workflow just breaks it faster',
    'The AI that was supposed to save 5 hours now needs 3 hours to babysit',
  ],
  'bottleneck-nobody-budgets': [
    'The cost of the 45-minute manual handoff nobody tracks',
    'Time spent looking for information that should be in one place',
    'The "5-minute task" someone does 40 times per day',
    'Nobody budgets for the hour a week lost to copy-pasting between systems',
  ],
};

export const ALL_TOPICS: string[] = Object.values(TOPIC_BUCKETS).flat();

export const BANNED_PHRASES: readonly string[] = [
  "in today's world",
  "in today's fast-paced",
  'leverage ai',
  'leverage technology',
  'leverage your',
  'unlock potential',
  'unlock growth',
  'unlock your',
  'game-changer',
  'game changer',
  'game-changing',
  'streamline your',
  'streamline the',
  'scalable solution',
  'best practices',
  'digital transformation',
  'revolutionize',
  'revolutionary',
  'here are ',
  'empower',
  'synergy',
  'cutting-edge',
  'seamlessly',
  'robust solution',
  'actionable insights',
  "you've got this",
  'start today',
  'take action',
];

/**
 * Quality filter heuristics.
 * A post that triggers genericOpeners or broadAdvicePhrases is rejected and regenerated.
 * A post without at least one concreteTerm is also rejected.
 */
export const QUALITY_FILTER = {
  // If first sentence starts with / contains one of these → reject
  genericOpeners: [
    'one of the things',
    'something i ',
    "it's not about",
    'the truth is,',
    'the reality is,',
    'did you know',
    'as a founder,',
    'as a business owner',
    'the key to',
    'at the end of the day',
    'in my experience,',
    'when it comes to',
    'the thing about',
    'every business needs',
    'all businesses',
    'most companies need to',
    'being a business',
    'running a business is',
  ],
  // If post contains one of these → reject
  broadAdvicePhrases: [
    'you should ',
    'you need to ',
    'make sure to ',
    'remember to ',
    'the solution is to',
    "here's how to",
    'here is how to',
    'the answer is to',
    'build trust',
    'create value',
    'add value',
    'focus on what matters',
    "it's important to",
    'it is important to',
    'step back and',
    'always remember',
    'never forget that',
    'the best way to',
    'try to always',
  ],
  // Post must contain at least one of these
  concreteTerms: [
    'crm', 'lead', 'leads', 'spreadsheet', 'inbox', 'handoff', 'follow-up',
    'follow up', 'invoice', 'onboarding', 'workflow', 'workflows', 'email',
    'tool', 'tools', 'form', 'automation', 'automations', 'process', 'processes',
    'client', 'clients', 'customer', 'customers', 'hire', 'hired', 'hiring',
    'team', 'staff', 'employee', 'employees', 'manual', 'data entry', 'report',
    'reports', 'dashboard', 'meeting', 'meetings', 'reply', 'pipeline', 'task',
    'tasks', 'system', 'systems', 'software', 'integration', 'integrations',
    'notification', 'revenue', 'growth', 'scaling', 'scale', 'budget', 'cost',
    'expense', 'payroll', 'subscription', 'quota', 'deadline', 'headcount',
    'operation', 'operations', 'ops', 'sales', 'support', 'coordinator',
    'sales rep', 'account', 'contract', 'proposal',
  ],
};

export const SCHEDULE_CONFIG = {
  morningHour: 9,
  eveningHour: 18,
  variationMinutes: 30,
  twoPostsPerDay: false,
} as const;

export const DUPLICATE_CHECK_WINDOW = 15;

export const PATH_CONFIG = {
  dataDir: path.resolve('data'),
  get textStyle(): string {
    return path.join(this.dataDir, 'textStyle.txt');
  },
  get postCache(): string {
    return path.join(this.dataDir, 'post-cache.json');
  },
  get postLog(): string {
    return path.join(this.dataDir, 'post-log.json');
  },
  get botState(): string {
    return path.join(this.dataDir, 'bot-state.json');
  },
} as const;

export const CONFIG = PATH_CONFIG;
export const THREADS_MAX_LENGTH = 500;
