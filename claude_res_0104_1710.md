● Everything wires up correctly. Here's the complete summary:

  ---
1. Why the current logic underperformed

The prompt asked Gemini for "a real thought" — which it interprets as a clean, polished observation. No tension requirement,
no hook logic, no first-sentence pressure. The topic alone drove generation with no second dimension. There was no quality
gate, so safe, bland posts went through. Gemini's default register is "confident business commentary" — without explicit
counterpressure it will always produce thought-leadership-shaped output.

  ---
2. Code changes made

┌────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────┐
│                File                │                                       Change                                       │
├────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
│                                    │ New prompt with hook intent framework + {HOOK_INTENT} placeholder; HOOK_INTENTS    │
│ src/config/constants.ts            │ array (12 intents); 8 new high-tension topic buckets; QUALITY_FILTER config;       │
│                                    │ maxRetries bumped to 4                                                             │
├────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ src/core/interfaces.ts             │ Added GeneratePostOptions type; added getRandomHookIntent() to IAIPostProvider;    │
│                                    │ updated generatePost signature to accept string | GeneratePostOptions              │
├────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ src/core/index.ts                  │ Export GeneratePostOptions                                                         │
├────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ src/types/index.ts                 │ Added hookIntent?: string to DraftPost                                             │
├────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
│                                    │ Full rewrite: getRandomHookIntent(), updated generatePost(), callGemini(topic,     │
│ src/services/GeminiService.ts      │ hookIntent), checkQuality() with 3-rule filter, combined retry loop for banned     │
│                                    │ phrases + quality                                                                  │
├────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
│                                    │ /generate parses topical <angle> and <custom text>; all generation calls pass {    │
│ src/services/TelegramBotService.ts │ topic, hookIntent }; formatDraft shows hook intent; /status shows hook intent in   │
│                                    │ pending draft                                                                      │
├────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ src/app/index.ts                   │ Scheduler tick passes hookIntent to all generate calls                             │
├────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ src/app/runBot.ts                  │ Passes hookIntent to generate calls                                                │
├────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ api/webhook.ts                     │ Imports HOOK_INTENTS; standalone generatePost now fills {HOOK_INTENT} in prompt    │
└────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────┘

  ---
3. Hook intent taxonomy (12 types)

┌──────────────────────┬────────────────────────────────────────────────────────────┐
│        Intent        │                      What it produces                      │
├──────────────────────┼────────────────────────────────────────────────────────────┤
│ contrarian_diagnosis │ "The real problem isn't X, it's Y"                         │
├──────────────────────┼────────────────────────────────────────────────────────────┤
│ hidden_cost          │ Something bleeding time/money that never shows in reports  │
├──────────────────────┼────────────────────────────────────────────────────────────┤
│ uncomfortable_truth  │ The thing most people avoid saying                         │
├──────────────────────┼────────────────────────────────────────────────────────────┤
│ pain_diagnosis       │ A specific named symptom the reader immediately recognizes │
├──────────────────────┼────────────────────────────────────────────────────────────┤
│ dry_humor            │ One deadpan observation about business chaos               │
├──────────────────────┼────────────────────────────────────────────────────────────┤
│ topical_reaction     │ Grounded skeptical take on a trend or AI announcement      │
├──────────────────────┼────────────────────────────────────────────────────────────┤
│ myth_busting         │ Destroy one popular belief about ops/tools/AI              │
├──────────────────────┼────────────────────────────────────────────────────────────┤
│ false_growth_signal  │ Something that looks like progress but hides a problem     │
├──────────────────────┼────────────────────────────────────────────────────────────┤
│ operator_confession  │ Said after seeing the same pattern 30 times                │
├──────────────────────┼────────────────────────────────────────────────────────────┤
│ wrong_problem        │ Reader is solving the symptom, not the cause               │
├──────────────────────┼────────────────────────────────────────────────────────────┤
│ invisible_drain      │ Nobody names it, nobody budgets for it, everyone pays      │
├──────────────────────┼────────────────────────────────────────────────────────────┤
│ scaling_paradox      │ What worked at 10 clients is the ceiling at 30             │
└──────────────────────┴────────────────────────────────────────────────────────────┘

  ---
4. New high-tension topic buckets (8 added)

things-owners-wont-admit · expensive-lies · fake-growth-signals · hiring-wont-fix-it · invisible-operational-debt ·
what-breaks-at-volume · ai-changes-nothing · bottleneck-nobody-budgets

  ---
5. Quality filter (3 rules, lightweight heuristics)

A post is rejected and regenerated if:
1. Generic opener — first sentence contains phrases like "the truth is,", "in my experience,", "as a business owner", "at the
   end of the day"
2. Broad advice phrase — text contains "you should ", "make sure to ", "the solution is to", "build trust", "create value",
   etc.
3. No concrete business term — text has zero words from a ~50-word list (CRM, lead, workflow, invoice, onboarding, pipeline,
   revenue, headcount, etc.)

On each retry the hook intent is re-varied for more diverse attempts.

  ---
6. Updated Telegram command behavior

/generate                           → random topic + random hook intent
/generate topical <angle>           → angle as topic, hook = topical_reaction
/generate <any custom text>         → text as custom angle, random hook intent

Examples:
/generate topical new OpenAI agents release
/generate why SMBs still won't benefit from this AI wave
/generate everyone's excited about AI agents but nobody's fixed their follow-up

The draft preview in Telegram now shows the hook intent used, so you can see why the post was framed the way it was.

  ---
7. Twenty example outputs the improved logic should produce

contrarian_diagnosis + losing-leads
▎ Your lead problem isn't volume. It's that the form fills, the CRM gets the entry, and then nothing happens for 3 days.

hidden_cost + bottleneck-nobody-budgets
▎ Nobody tracks the 40 minutes a day someone spends copy-pasting between your CRM and your invoicing tool. But it's on the
payroll.

dry_humor + light-humor
▎ The spreadsheet that runs the business has a tab called "DO NOT TOUCH" and nobody remembers why.

uncomfortable_truth + hiring-wont-fix-it
▎ The coordinator role you're hiring for exists because two tools don't talk to each other. That's a $60k/yr fix for a
$300/yr automation.

false_growth_signal + fake-growth-signals
▎ Pipeline full. Team overwhelmed. Margins flat. Everyone in the meeting calls it a growth problem. It's an ops problem.

operator_confession + things-owners-wont-admit
▎ Every business I've walked into has a workaround that became the workflow. Nobody made it official. It just… stayed.

scaling_paradox + scaling-problems
▎ The onboarding process that worked fine at 8 clients fails visibly at 25. Not because the team got worse — because it was
never a process.

myth_busting + ai-changes-nothing
▎ Getting an AI tool for a broken workflow doesn't fix the workflow. It just surfaces how broken it is, faster.

wrong_problem + operational-bottleneck
▎ The bottleneck isn't your team. It's the three manual steps between when a lead fills the form and when anyone actually
follows up.

invisible_drain + manual-frustration
▎ Nobody budgets for the 45 minutes a week someone spends rebuilding the same report. But multiply that by every person on
the team.

topical_reaction + ai-hype-reality (via /generate topical)
▎ The new AI agent everyone's demoing can't fix the fact that your CRM hasn't been updated in 6 weeks.

pain_diagnosis + losing-leads
▎ If your follow-up depends on someone remembering to send an email — you're not losing leads to competitors. You're losing
them to silence.

contrarian_diagnosis + tool-overload
▎ The problem isn't that you need better tools. It's that you have 11 tools and none of them know what the others are doing.

dry_humor + expensive-lies
▎ "We'll automate that once things slow down." Things will not slow down.

hidden_cost + what-breaks-at-volume
▎ The handoff that works perfectly at 15 clients breaks silently at 40. You find out when a client mentions they never heard
back.

false_growth_signal + smb-chaos
▎ More clients without fixing ops isn't growth. It's the same chaos running faster.

uncomfortable_truth + founder-pain
▎ If you're the only person who knows how the whole operation fits together, you haven't built a business. You've built a
dependency.

myth_busting + ai-news-opinion
▎ Everyone's talking about AI replacing roles. Most businesses still have someone manually copying data between two tools
they both pay for.

operator_confession + invisible-operational-debt
▎ The real technical debt in a small business isn't in the code. It's in the undocumented steps everyone works around without
naming them.

wrong_problem + smb-chaos
▎ You don't have a communication problem. You have a system where important decisions live in Slack threads that nobody can
find later.

  ---
8. Remaining limitations

- Hook intent selection is random — no weighting toward intents that historically perform better (would need engagement data
  to fix this)
- Quality filter has no semantic understanding — a clever post that avoids the literal banned words but is still hollow will
  pass
- Topical mode depends on your own awareness of what's current — no news ingestion (by design per task constraints)
- The quality filter's concrete-terms check catches most cases but could reject a legitimately strong abstract post on rare
  occasions — the fallback path handles this gracefully

✻ Churned for 9m 56s

