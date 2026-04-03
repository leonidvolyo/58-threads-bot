# 58 Systems — Content & Conversion Strategy

## Conversion Flow

```
POST → stops scrolling
  ↓
PROFILE → bio makes it click
  ↓
BIO LINK → landing page
  ↓
LANDING → single CTA: book a call
  ↓
FORM → short qualifier
  ↓
CALL → audit / consultation
```

### What makes people click the profile
- Post hits a real nerve (they recognize the problem)
- Voice sounds like a peer, not an ad
- No link in post → the only way to learn more is the profile

### Bio variants (pick one)

**Variant A (problem-focused):**
```
I fix broken business operations.
Automations, integrations, workflows — for SMBs that are drowning in manual work.
→ Free audit: [link]
```

**Variant B (direct/sharp):**
```
Your business should run without you babysitting it.
I build the systems that make that happen.
Book a call ↓
```

**Variant C (credibility + CTA):**
```
Automation systems for small businesses.
Less manual work. Less lead leakage. Cleaner ops.
58systems.com
```

---

## Link-in-Bio Structure (max 5 links)

1. **Book a Free Audit** ← primary CTA (link to Calendly or landing)
2. **What We Do** ← brief service description
3. **Case Studies / Results** ← 2–3 before/after examples (when available)
4. *(optional)* Recent insight or free resource

Keep it short. One primary CTA above the fold.

---

## Landing Page Structure

**Hero:**
- Headline: "Your business loses time and leads because things aren't connected."
- Sub: "We build the systems that fix that."
- CTA: "Book a free 30-min audit →"

**Pain block (3 bullets, no fluff):**
- You're handling things manually that should be automatic
- Leads fall through because no one follows up in time
- Your team's time goes to copy-pasting data between tools

**What happens in an audit:**
- We look at your current tools and workflows
- We identify where time and leads are leaking
- We give you a clear picture of what to fix — whether you work with us or not

**CTA block:**
- "30 minutes. No pitch deck. Just a real look at your operations."
- [Book a Call] button

**Trust:**
- Short statement: "We've worked with [X type of business]..."
- No fake testimonials until you have real ones

---

## Main Offer

**Free Operations Audit (30 min call)**
- Look at current tools, workflows, pain points
- Identify the biggest time/lead leak
- Propose a fix — whether they work with us or not
- No-pressure, no-pitch framing: "We'll show you what's broken"

This is the foot in the door. Real value upfront. Converts to paid work when the problem is visible.

---

## Topic Buckets

24 buckets covering SMB operations pain. Each bucket has 4 specific topic strings used as generation seeds.

| Bucket | Focus |
|---|---|
| `smb-chaos` | Spreadsheets as infrastructure, tool fragmentation, nothing automated |
| `losing-leads` | Follow-up failures, leads going cold, Friday-evening leads |
| `tool-overload` | Paying for unused tools, CRM/inbox/project drift, broken integrations |
| `manual-frustration` | Repetitive tasks never automated, expensive people doing data entry |
| `ai-hype-reality` | ChatGPT ≠ AI strategy, advice written for 500-person companies |
| `founder-pain` | Can't take vacation, only person who knows how it works |
| `operational-bottleneck` | Single point of failure, undocumented onboarding, everything in someone's head |
| `scaling-problems` | Works at 10 clients, breaks at 30; chaos doubles with revenue |
| `observations` | Patterns separating clean ops from chaotic ones; what to fix first |
| `light-humor` | The Excel file that IS the business; meetings about meetings |
| `grab-attention` | Why some businesses stay stuck; hiring making things slower |
| `ai-news-opinion` | What AI announcements actually mean for real small businesses |
| `things-owners-wont-admit` | Known bottlenecks not fixed, workarounds that became workflows |
| `expensive-lies` | "We'll fix it once we hire someone"; "we're too small for automation" |
| `fake-growth-signals` | More clients + broken ops = faster chaos; margin flat while celebrating |
| `hiring-wont-fix-it` | Coordinator role that exists because tools don't talk; headcount on broken process |
| `invisible-operational-debt` | Manual steps nobody talks about; patches on patches |
| `what-breaks-at-volume` | Handoff that fails at 40 clients; bottlenecks nobody owns |
| `ai-changes-nothing` | AI on a broken process breaks it faster; CRM nobody updates |
| `bottleneck-nobody-budgets` | 45-min manual handoff nobody tracks; "5-minute task" done 40x per day |
| `founder-as-middleware` | Founder still the connection between every part; every handoff routes through you |
| `comms-vs-systems` | "Communication problem" that's actually systems failure; Slack replacing process |
| `ai-theater` | Announcing AI adoption while still copy-pasting every morning |
| `revenue-heavier-not-lighter` | More revenue, harder to run; ops more expensive per client as you scale |

To add or change topics, edit `TOPIC_BUCKETS` in `src/config/constants.ts`.

---

## Hook Intent Taxonomy (12)

Controls the opening angle and emotional direction of each post.

| Intent | What it produces |
|---|---|
| `contrarian_diagnosis` | The obvious fix is wrong. Names what's actually broken — a direct challenge to the popular narrative |
| `hidden_cost` | Something silently bleeding time or money that never shows up in any report — named precisely |
| `uncomfortable_truth` | The thing most people avoid saying out loud about business ops — said without softening |
| `pain_diagnosis` | A specific symptom the reader recognizes immediately from lived experience. Specific beats general |
| `dry_humor` | One dry, slightly bitter observation about operational chaos. Never explained |
| `topical_reaction` | Grounded, skeptical take on a trend, tool announcement, or AI hype. Not just disagreement — why the framing is broken |
| `myth_busting` | Dismantles one widely believed fix for ops, tooling, or AI problems. Names the myth and what it misses |
| `false_growth_signal` | Something that looks like progress but masks a deeper operational problem |
| `operator_confession` | The hard-to-say thing that only comes after seeing the same pattern 30+ times. Earned, not clever |
| `wrong_problem` | The reader is solving the symptom, not the root cause. Makes the root cause visible |
| `invisible_drain` | Something nobody names, nobody budgets for, but everyone quietly pays for |
| `scaling_paradox` | The system that worked fine at 10 clients is now the ceiling at 30 |

---

## Post Modes

Each post is randomly assigned a structure mode that shapes its format and ending.

| Mode | Weight | Behaviour |
|---|---|---|
| `default` | 50% | Standard post, no forced structure |
| `question` | 25% | Ends with one sharp, uncomfortable question |
| `story` | 15% | Micro-story: specific situation → wrong assumption → consequence |
| `open_loop` | 10% | Deliberately unresolved — raises tension, stops before the answer |

~50% of posts will include either a question, a story structure, or an open loop. This drives comments and re-reads without forcing it on every post.

**There is no Telegram command to force a specific post mode.** Mode is always picked randomly.

To change the distribution, edit `POST_MODE_POLICY` in `src/config/constants.ts`:

```typescript
export const POST_MODE_POLICY: Record<PostMode, number> = {
  default: 0.50,    // 50%: standard post
  question: 0.25,   // 25%: uncomfortable question that triggers debate
  story: 0.15,      // 15%: micro-story format
  open_loop: 0.10,  // 10%: unresolved tension, no clean wrap-up
};
```

Weights must sum to `1.0`. Set a weight to `0` to disable a mode entirely (e.g. `open_loop: 0` to never use it).

---

## Quality Filter Logic

Posts are rejected and regenerated if:

- **First sentence** contains a generic AI opener — "as a business owner", "the truth is,", "at the end of the day", "let me tell you", etc. (20 patterns)
- **Post body** contains broad advice/instructional patterns — "you should", "make sure to", "the best way to", "you need to", etc. (18 patterns)
- **Post body** contains too-polished, clean-resolution phrases — "the lesson here", "the good news is", "simple fix", "the bottom line", etc. (12 patterns)
- **Post body** contains LinkedIn performance voice — "excited to share", "hot take:", "real talk:", "hard truth:", etc. (10 patterns)
- **Post has no concrete business term** — must include at least one of ~60 terms: crm, lead, workflow, handoff, invoice, onboarding, spreadsheet, tool, process, founder, middleware, etc.
- **More than 4 newlines** — too blog-post-like

---

## Telegram Commands

```
/generate                     — random topic + random hook + random post mode
/generate topical <angle>     — specific angle, forces topical_reaction hook
/generate <custom text>       — custom angle, random hook, random mode
/approve                      — publish pending draft
/reject                       — discard pending draft
/post_now                     — generate and publish immediately
/pause / /resume              — scheduler control
/status                       — current state + recent posts
```

---

## Content Principles

### What works
- **Specific over general** — "48-hour reply time" beats "slow follow-up"
- **Recognition over education** — make them say "that's me", not "interesting"
- **One idea per post** — no thread of thoughts, just one sharp punch
- **Silence is fine** — posts without a CTA convert better than posts with a weak one
- **Dry > enthusiastic** — deadpan observations outperform excited tips
- **Open loops pull** — unresolved tension keeps people reading and commenting
- **Tension in the first line** — if the opener doesn't catch, nothing else matters

### What doesn't work
- Lists ("Here are 5 things...")
- Explaining something they already know
- Motivational endings ("You've got this!")
- Anything that sounds like a LinkedIn post
- CTAs in every post — feels desperate, kills trust
- Clean wrap-ups — a fully resolved post is a forgettable post
- Cheap engagement bait ("agree?", "thoughts?", "tag someone")

### Tone rules
- Write for the person who is slightly skeptical
- Never explain the joke
- Never be preachy
- One punchline max
- Slightly imperfect sentence structure is fine — don't over-polish
- Read it out loud — if it sounds like a marketer wrote it, rewrite it

---

## 20 Post Ideas

1. The spreadsheet that "temporarily" became core infrastructure 3 years ago
2. What "we're implementing AI" looks like in most small businesses
3. The most common reason a business can't take a vacation
4. Why the same lead gets emailed three times from different people
5. The onboarding process that lives in one person's head
6. What breaks first when a small business grows past 10 clients
7. The follow-up email that never got sent because "someone would handle it"
8. Paying for 12 SaaS tools and actually using 4
9. Why "hire someone to manage it" is sometimes the wrong fix
10. The Excel file that runs the entire company
11. What I'd look at in your business before suggesting anything
12. AI tools that promised to change everything — still doing it manually
13. The report that takes 3 hours to build and no one reads
14. Why operational chaos tends to hide until a business tries to scale
15. You're not a bottleneck. You're a system that was never built.
16. What a clean operation actually looks like (it's boring — that's the point)
17. The CRM that nobody updates so nobody trusts it
18. "We have a process for that" — but it's in someone's memory
19. When a team calls something a "communication problem" and it's actually a systems failure
20. Revenue went up. Margin went flat. Nobody can explain why.

---

## 15 Example Posts

**1. Lead loss**
Most leads don't ghost you. They just waited too long for a reply and moved on.
If your follow-up depends on someone remembering to send an email, you're already losing.

**2. Spreadsheet chaos**
Every business has a spreadsheet that was never supposed to be this important.
It started as a quick fix. Now it runs invoicing, tracks clients, and nobody's allowed to touch it.

**3. The vacation test**
Can you take a week off without your phone becoming a work terminal?
If the answer is no, that's not a staffing problem. It's an operations problem.

**4. AI hype (dry)**
"We're using AI now."
*Opens ChatGPT, asks it to rewrite an email.*

**5. Tool overload**
12 tools. 4 actually used. 8 still on the credit card.
Somewhere in that stack there are two tools doing the same thing and a third that was supposed to connect them but doesn't.

**6. The bottleneck person**
There's someone in your business who knows how everything actually works.
When they're sick, things slow down. When they leave, things break.
That's not a person problem. That's an architecture problem.

**7. The growing pains post**
At 10 clients everything works fine.
At 30 clients, every crack in your process becomes a flood.
Most businesses find this out the expensive way.

**8. Manual frustration**
You've done that task manually 200+ times.
You know exactly what the automated version would look like.
You just haven't had a Tuesday afternoon to build it. You won't.

**9. The "it's fine" trap**
The systems that make a business feel chaotic usually don't feel like systems.
They feel like just how things work here.

**10. Founder as middleware**
Every decision, every handoff, every exception routes through you.
That's not leadership. That's a system that was never built.

**11. AI theater**
Announced the AI transformation in Q1.
Still copy-pasting the same data between the same three tools every morning.

**12. Communication vs. systems**
The team said it was a communication problem.
It wasn't. The information just didn't have anywhere to live.

**13. Comms vs. systems (question mode)**
Why does every growing business eventually invent 3 jobs just to compensate for tools not talking to each other?

**14. Revenue paradox (open loop)**
Revenue went up 40%. The business got harder to run, not easier.
Nobody on the leadership call mentioned that.

**15. Hiring fix myth (micro-story)**
Hired a coordinator to manage the client handoff.
The handoff was still broken — now there was just a person in the middle of it.

---

## What Posts Should Feel Like

The best posts should feel like:
- **"that's exactly us"** — immediate painful recognition
- **"damn"** — a named cost or pattern they've never seen labeled before
- **"explain this"** — something incomplete that pulls them to comments
- **"why do we do it that way?"** — self-recognition triggered by a question
- **"this should not work like this"** — mild frustration at a recognized absurdity

Desired qualities: specific first line, emotional recognizability, compact, comment-worthy.
Avoid: advice-column tone, formal structure, lists, corporate phrasing, LinkedIn voice.
