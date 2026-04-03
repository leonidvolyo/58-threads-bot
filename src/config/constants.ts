import path from 'node:path';

// ── Post Mode Policy ──────────────────────────────────────────────────────────

export const POST_MODES = ['default', 'question', 'story', 'open_loop'] as const;
export type PostMode = (typeof POST_MODES)[number];

/** Weight of each post mode (must sum to 1.0) */
export const POST_MODE_POLICY: Record<PostMode, number> = {
  default: 0.50,    // 50%: standard post
  question: 0.25,   // 25%: uncomfortable question that triggers debate
  story: 0.15,      // 15%: micro-story format
  open_loop: 0.10,  // 10%: unresolved tension, no clean wrap-up
};

export function pickPostMode(): PostMode {
  const r = Math.random();
  let cum = 0;
  for (const [mode, weight] of Object.entries(POST_MODE_POLICY) as [PostMode, number][]) {
    cum += weight;
    if (r < cum) return mode;
  }
  return 'default';
}

/** Post mode instructions injected into the prompt per mode */
export const POST_MODE_INSTRUCTIONS: Record<PostMode, string> = {
  default: '',
  question:
    'POST MODE — UNCOMFORTABLE QUESTION: End with one sharp, uncomfortable question. It should expose a hidden business problem, force self-recognition, or trigger debate. The type of question that makes someone stop and think "hm, why do we do it that way?" — not generic. Examples of the right direction: "Why does every growing business eventually invent 3 jobs just to compensate for tools not talking to each other?" / "At what point does \'scrappy\' become expensive?" / "Why do companies buy AI before fixing the step where leads go cold?" Do NOT use: "agree?", "thoughts?", "have you experienced this?" — that is cheap bait.',
  story:
    'POST MODE — MICRO-STORY: Structure as a tight 2–4 sentence story: specific situation → wrong assumption or missed step → consequence or reveal. Keep it short and punchy. No long narrative. The reveal should feel like recognition, not instruction.',
  open_loop:
    'POST MODE — OPEN LOOP: Leave the post intentionally unresolved. Raise the tension, build toward something — then stop before the answer. The reader should sit with it or go to comments. Do NOT wrap it up. Do NOT resolve the observation. A clean ending is a dead ending.',
};

// ── Prompt ────────────────────────────────────────────────────────────────────

export const PROMPT = `
You write short Threads posts for the founder of 58 Systems — a company that fixes broken operations for small businesses.

Target reader: SMB owner or operator. Skeptical, busy, tired of generic advice.

USE THIS HOOK INTENT: {HOOK_INTENT}

Hook intent guide:
contrarian_diagnosis — the obvious fix is wrong; name what's actually broken. Not a subtle disagreement — a direct challenge to the popular narrative.
hidden_cost — something silently bleeding time or money that never shows up in any report. Name it precisely.
uncomfortable_truth — the thing most people avoid saying out loud about business ops. Say it without softening.
pain_diagnosis — name a specific symptom the reader recognizes immediately from lived experience. Specific beats general.
dry_humor — one dry, slightly bitter observation about operational chaos. Do NOT explain the joke. If you have to explain it, it failed.
topical_reaction — grounded, skeptical take on a trend, tool announcement, or AI hype. Don't just disagree — say why the framing is broken.
myth_busting — dismantle one widely believed fix for ops, tooling, or AI problems. Name the myth, name what it misses.
false_growth_signal — something that looks like progress but masks a deeper operational problem. The reader should feel a flicker of discomfort recognizing it.
operator_confession — the hard-to-say thing that only comes after seeing the same pattern 30+ times. Earned, not clever.
wrong_problem — the reader is solving the symptom, not the root cause. Make the root cause visible.
invisible_drain — something nobody names, nobody budgets for, but everyone quietly pays for. Make the reader feel: "nobody said that out loud before."
scaling_paradox — the system that worked fine at 10 clients is now the ceiling at 30. Specific. Recognizable.

READ-TO-END MECHANICS:
The first line must create enough tension, recognition, or curiosity that the reader feels pulled to finish.
Use an open loop — raise something unresolved, imply a cost, or name a pattern the reader hasn't labeled yet.
Each sentence should add something the previous one didn't. Build, don't repeat.
The ending should leave the reader thinking — not cleanly resolved. A fully wrapped-up post is a forgettable post.

COMMENT MECHANICS:
Some posts should make the reader want to respond. Smart ways to pull that out — without cheap bait:
- End on something unresolved ("and nobody ever actually fixes it")
- End on a question that exposes a problem ("why does everyone solve this by hiring someone instead?")
- End on something slightly incomplete ("the part that usually doesn't make it into the retro")
- End with a mild contradiction ("which is strange, because the data was always there")
Never use: "agree?", "thoughts?", "comment if you've experienced this", "tag someone who needs this".

{POST_MODE_INSTRUCTION}

Format:
— 1 to 4 sentences. No lists. No bullets. No headers.
— First sentence: must create immediate tension, recognition, or curiosity. NOT "businesses often struggle with X" — something specific, named, and slightly uncomfortable.
— Include at least one concrete business object: CRM, lead, spreadsheet, inbox, follow-up, invoice, handoff, onboarding, tool, report, workflow, pipeline, meeting, email, task, client, etc.
— Length: 80–350 characters total.
— No links. One emoji MAX if it fits naturally — skip entirely if unsure.
— Voice: direct, slightly annoyed, a little dry. Like someone who has seen this pattern one too many times and stopped being surprised.
— Slightly imperfect sentence structure is fine. Don't over-polish.

Optional: one Threads hashtag as the very last line if clearly on-target (e.g. #SMBOps). One max. Most posts should not have one.

Output ONLY the post text. No quotes. No labels. No explanation.

BANNED — regenerate if found:
"in today's world", "leverage", "unlock potential", "game-changer", "streamline your",
"scalable solution", "best practices", "digital transformation", "revolutionize",
"here are", "empower", "you've got this", "start today", "take action",
"excited to share", "proud of this", "key takeaway", "the lesson here",
"it all comes down to", "the secret to", "with the right mindset",
numbered or bulleted lists, hollow motivational endings, LinkedIn-voice opener

Topic: {TOPIC}
`.trim();

// ── AI Config ─────────────────────────────────────────────────────────────────

export const AI_CONFIG = {
  model: 'gemini-2.5-flash',
  maxRetries: 4,
  threadCharLimit: 500,
} as const;

// ── Hook Intents ──────────────────────────────────────────────────────────────

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

// ── Topic Buckets ─────────────────────────────────────────────────────────────

export const TOPIC_BUCKETS: Record<string, string[]> = {
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

  // ── High-tension additions ─────────────────────────────────────────────────
  'founder-as-middleware': [
    'The founder who is still the connection between every part of the business',
    'Every handoff in the company quietly routes through you',
    'You\'re not a bottleneck. You\'re a system that was never built.',
    'The business that runs fine as long as the founder never goes on vacation',
  ],
  'comms-vs-systems': [
    'When a team calls something a "communication problem" and it\'s actually a systems failure',
    'The Slack thread that replaced the process nobody ever documented',
    'Miscommunication that isn\'t about people at all — it\'s about information not having a home',
    'Every "we need to communicate better" that was really "we need a system"',
  ],
  'ai-theater': [
    'Announcing AI adoption while still copy-pasting data between tools every morning',
    '"We\'re experimenting with AI" meaning one person has a ChatGPT tab open',
    'The AI transformation that didn\'t touch the broken step it was supposed to fix',
    'Buying AI tools for a process that isn\'t even documented yet',
  ],
  'revenue-heavier-not-lighter': [
    'The business that earns more but somehow feels harder to run every quarter',
    'Why operations get more expensive per client as the business grows, not cheaper',
    'Revenue went up. Margin went flat. Nobody can explain why.',
    'The scaling moment where more volume means more chaos, not more clarity',
  ],
};

export const ALL_TOPICS: string[] = Object.values(TOPIC_BUCKETS).flat();

// ── Banned Phrases ────────────────────────────────────────────────────────────

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
  'excited to share',
  'proud of this',
  'key takeaway',
  'the lesson here',
  'it all comes down to',
  'the secret to',
  'with the right mindset',
];

// ── Quality Filter ────────────────────────────────────────────────────────────

export const QUALITY_FILTER = {
  // Reject if first sentence contains these — too generic or AI-opener
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
    'let me tell you',
    'here is the thing',
    "here's the thing",
  ],
  // Reject if post contains these — too advice-y, too instructional
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
  // Reject if post contains these — too polished, too resolved, kills tension
  tooPolished: [
    'key takeaway',
    'the lesson here',
    'it all comes down to',
    'the secret to',
    'the good news is',
    'simple fix',
    'the solution is simple',
    'easy fix',
    'the answer is simple',
    'all you need to',
    'just remember',
    'the bottom line',
  ],
  // Reject if post contains these — LinkedIn performance voice
  linkedinPatterns: [
    'excited to share',
    'proud of this',
    'humbled by',
    'grateful for this',
    'my journey',
    'hot take:',
    'unpopular opinion:',
    'real talk:',
    'hard truth:',
    'psa:',
  ],
  // Post must contain at least one of these — keeps it grounded in real ops
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
    'sales rep', 'account', 'contract', 'proposal', 'founder', 'middleware',
  ],
  // Reject if too many newlines (blog-post format)
  maxNewlines: 4,
};

// ── Schedule Config ───────────────────────────────────────────────────────────

export const SCHEDULE_CONFIG = {
  morningHour: 9,
  eveningHour: 18,
  variationMinutes: 30,
  twoPostsPerDay: false,
} as const;

export const DUPLICATE_CHECK_WINDOW = 15;

// ── Path Config ───────────────────────────────────────────────────────────────

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
