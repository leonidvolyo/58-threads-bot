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
You write short Threads posts for a tech practitioner who builds automations and systems for small businesses, follows AI and the tech industry closely, and has strong opinions about how things actually work versus how they get talked about.

This is not a brand account. Posts can be: a reaction to something in tech or AI, an observation about how tools or teams actually work, a hot take on startup or SaaS culture, a dry joke, a mildly infuriating pattern from the industry, or a grounded perspective from working with real businesses. 58 Systems context (ops/automation for SMBs) shows up naturally in some posts — not all.

Target reader: tech-aware operators, founders, builders — skeptical of hype, experienced enough to recognize patterns.

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
ragebait — the mildly infuriating true thing that most people think but won't say. Specific enough that people stop to either agree hard or argue out loud. Not mean, not unhinged — just the take everyone was already thinking.

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
— Ground the post in something specific — a situation, a decision, a recurring moment, a human pattern, a tool friction, or a cost nobody names. Don't force a tool mention if the observation is stronger without one.
— Length: 80–480 characters. Shorter is usually better — but reactions and commentary can use the space they need.
— No links. One emoji MAX if it fits naturally — skip entirely if unsure.
— Voice: direct, occasionally dry or sharp. Can be a quick reaction to something just read, a pattern observation, or a provocation. Never corporate, never thought-leader.
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
  'ragebait',
] as const;

export type HookIntent = (typeof HOOK_INTENTS)[number];

// ── Topic Buckets ─────────────────────────────────────────────────────────────
// Composition: ~33% ops/business (7 buckets), ~67% tech/culture/industry (14 buckets)

export const TOPIC_BUCKETS: Record<string, string[]> = {

  // ── Ops / business (~33%) ──────────────────────────────────────────────────
  'smb-chaos': [
    'The spreadsheet that "temporarily" became core infrastructure 3 years ago',
    'Running a business on 6 tools that don\'t talk to each other',
    'When the entire operation runs in someone\'s head, not a system',
    'What Monday morning looks like when nothing is automated',
  ],
  'losing-leads': [
    'Leads that fill a form and wait 48 hours to hear back',
    'The follow-up that never happened because someone forgot',
    'What happens to leads that come in on Friday evening',
    'Losing a deal because no one sent a second email',
  ],
  'founder-pain': [
    'Can\'t take a week off because the business stops without you',
    'Being the only person who knows how the whole thing works',
    'The moment you realize you built yourself a job, not a business',
    'Every handoff in the company quietly routes through the founder',
  ],
  'scaling-problems': [
    'What worked at 10 clients breaks completely at 30',
    'Revenue doubles. Chaos doubles with it.',
    'Growth that creates more firefighting, not less',
    'The systems that made sense when you started are strangling you now',
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
  'hiring-wont-fix-it': [
    'Hiring someone to manage the problem instead of fixing the system',
    'The coordinator role that exists because the tools don\'t talk',
    '"We need a person for that" — for something that should run automatically',
    'Adding headcount to a broken process just means more people doing it wrong',
  ],

  // ── AI / tech (with and without ops lens) ─────────────────────────────────
  'ai-hype-reality': [
    '"We\'re using AI now" meaning they got a ChatGPT account',
    'The gap between AI demos and what actually works in a 20-person business',
    'Why most AI advice is written for 500-person companies, not 15-person ones',
    'AI tools that promised everything — you still do it manually',
  ],
  'ai-theater': [
    'Announcing AI adoption while still copy-pasting data between tools every morning',
    '"We\'re experimenting with AI" meaning one person has a ChatGPT tab open',
    'The AI transformation that didn\'t touch the broken step it was supposed to fix',
    'Buying AI tools for a process that isn\'t even documented yet',
  ],
  'ai-news-opinion': [
    'What the latest AI model release actually means for a real 15-person business',
    'The honest gap between what AI can do and what most businesses actually need',
    'Why AI demos always work on the clean version of the problem',
    'What\'s genuinely useful in the new wave of no-code AI tools vs. what\'s hype',
  ],
  'ai-future-takes': [
    'The AI predictions from 2023 that were supposed to come true by now',
    'Every year is the year AI replaces software engineers, according to someone on LinkedIn',
    'The confident AI prediction from someone who has never integrated an API in production',
    '"AGI within 2 years" — the goalpost keeps moving, the confidence never does',
  ],
  'tech-ai-reactions': [
    'What actually changes for a small business after a major AI model release',
    'Every AI announcement sounds like it will replace something. Most don\'t.',
    '"Agents will handle everything" from people who\'ve never tried to get two SaaS tools to sync',
    'The gap between what AI can demo and what it can do in production without babysitting',
  ],

  // ── Tech / industry / culture ──────────────────────────────────────────────
  'industry-observations': [
    'Why every SaaS product eventually adds AI features nobody asked for',
    'How no-code tools are marketed vs. how they actually get used six months in',
    'The startup that raised $20M and still can\'t explain what problem it solves',
    '"Move fast and break things" — the things are still broken',
  ],
  'tech-culture-takes': [
    'The engineer who spent 3 weeks automating a task that took 10 minutes',
    'Every productivity app now has a feature to manage all your other productivity apps',
    'The Slack workspace with more channels than employees',
    'Why "it works on my machine" is still somehow a valid response in 2025',
  ],
  'light-humor': [
    'The Excel file that IS the business',
    'A meeting to discuss why there are too many meetings',
    'The email thread that replaced your entire project management tool',
    'Process documentation: a blank Google Doc created in 2022',
  ],
  'work-culture': [
    'Remote work promised async. Everyone just moved the meetings to Zoom.',
    'The calendar with 6 hours of meetings and 2 hours to do the actual work',
    '"Flexible hours" meaning available at all hours, just in a friendly way',
    'The all-hands where leadership asks for honest feedback and nobody gives honest feedback',
  ],
  'product-culture': [
    'The roadmap that exists to give the impression of having a strategy',
    'Adding an AI feature before fixing the bug that\'s been open for 8 months',
    'The feature nobody asked for that took 3 sprints to ship',
    '"We\'ll prioritize that next quarter" — said every quarter for two years',
  ],
  'developer-observations': [
    '"We\'ll refactor it properly later" — the lie every codebase is built on',
    'The documentation that describes what the code was supposed to do',
    'Estimating how long something will take before understanding what it is',
    'The technical debt conversation that never actually makes it onto the roadmap',
  ],
  'vc-startup-culture': [
    'Raising a Series B to figure out the business model that should have existed at seed',
    '"We\'re pre-revenue" as a fundraising narrative, not a problem to fix',
    'The startup with a VP of everything and 12 employees total',
    'Disrupting an industry that wasn\'t asking to be disrupted',
  ],
  'online-tech-discourse': [
    'The LinkedIn post about "lessons learned" published 4 hours after the thing happened',
    'Every tech layoff announcement followed by a thread about personal growth and resilience',
    'The "hot take" that is just the consensus opinion said with more confidence',
    'How every new programming language gets announced as the one that finally fixes everything',
  ],
  'team-dynamics': [
    'The person who holds all institutional knowledge and doesn\'t realize it',
    'Meetings where everyone agrees and nothing actually changes afterward',
    'When everyone is busy but nothing important moves',
    'The team member doing three jobs because one process was never designed',
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
