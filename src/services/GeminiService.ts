import { GoogleGenerativeAI } from '@google/generative-ai';
import type { IAIPostProvider, GeneratePostOptions } from '../core/interfaces.js';
import {
  PROMPT,
  AI_CONFIG,
  PATH_CONFIG,
  ALL_TOPICS,
  HOOK_INTENTS,
  BANNED_PHRASES,
  QUALITY_FILTER,
  type PostMode,
  POST_MODE_INSTRUCTIONS,
  pickPostMode,
} from '../config/index.js';
import { AIProviderError } from '../core/errors.js';
import { logger } from '../utils/logger.js';
import { truncate } from '../utils/string.js';

/**
 * Gemini-based AI post generation service.
 * Combines topic + hook intent + post mode, enforces banned phrases, and applies quality filter.
 */
export class GeminiService implements IAIPostProvider {
  constructor(private readonly apiKey: string) {}

  async getRandomTopic(): Promise<string> {
    if (!ALL_TOPICS.length) throw new AIProviderError('Topics list is empty');
    return ALL_TOPICS[Math.floor(Math.random() * ALL_TOPICS.length)] ?? '';
  }

  getRandomHookIntent(): string {
    return HOOK_INTENTS[Math.floor(Math.random() * HOOK_INTENTS.length)] ?? 'pain_diagnosis';
  }

  /**
   * Generates a post using topic + hook intent + post mode.
   * Retries on banned phrases or failed quality checks (up to maxRetries).
   *
   * @param options - Topic string (legacy) or GeneratePostOptions
   */
  async generatePost(options?: string | GeneratePostOptions): Promise<string> {
    const opts: GeneratePostOptions =
      typeof options === 'string' ? { topic: options } : (options ?? {});

    // customAngle overrides topic (used in topical mode)
    const topic = opts.customAngle ?? opts.topic ?? (await this.getRandomTopic());
    const hookIntent = opts.hookIntent ?? this.getRandomHookIntent();
    const postMode: PostMode = (opts.postMode as PostMode) ?? pickPostMode();

    let lastText = '';

    for (let attempt = 1; attempt <= AI_CONFIG.maxRetries; attempt++) {
      // Vary the hook intent on retries for more diverse attempts
      const currentHook = attempt === 1 ? hookIntent : this.getRandomHookIntent();
      const text = await this.callGemini(topic, currentHook, postMode);
      lastText = text;

      const banned = this.findBannedPhrase(text);
      if (banned) {
        logger.warn({ attempt, banned, topic }, 'Banned phrase — retrying');
        continue;
      }

      const quality = this.checkQuality(text);
      if (!quality.pass) {
        logger.warn({ attempt, reason: quality.reason, topic }, 'Quality check failed — retrying');
        continue;
      }

      logger.debug({ attempt, hookIntent: currentHook, postMode, topic }, 'Post accepted');
      return truncate(text, AI_CONFIG.threadCharLimit);
    }

    // Fallback: use last generated text regardless
    logger.warn({ topic, hookIntent, postMode }, 'Using fallback post after exhausting retries');
    return truncate(lastText || (await this.callGemini(topic, hookIntent, postMode)), AI_CONFIG.threadCharLimit);
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private async callGemini(topic: string, hookIntent: string, postMode: PostMode): Promise<string> {
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: AI_CONFIG.model });
    const style = await this.getStyleContext();

    const modeInstruction = POST_MODE_INSTRUCTIONS[postMode];

    const promptText = PROMPT
      .replace('{TOPIC}', topic)
      .replace('{HOOK_INTENT}', hookIntent)
      .replace('{POST_MODE_INSTRUCTION}', modeInstruction);

    const fullPrompt = style
      ? `${promptText}\n\nAdditional voice context:\n${style}`
      : promptText;

    const result = await model.generateContent(fullPrompt);
    return result.response.text().trim();
  }

  private findBannedPhrase(text: string): string | null {
    const lower = text.toLowerCase();
    for (const phrase of BANNED_PHRASES) {
      if (lower.includes(phrase.toLowerCase())) return phrase;
    }
    return null;
  }

  /**
   * Lightweight quality heuristics.
   * Rejects posts that are too generic, too advisory, too polished, or lack concrete business context.
   */
  private checkQuality(text: string): { pass: boolean; reason?: string } {
    const lower = text.toLowerCase().trim();
    const firstSentence = lower.split(/[.!?\n]/)[0] ?? '';
    const newlineCount = (text.match(/\n/g) ?? []).length;

    // Too many line breaks → blog-style, not punchy
    if (newlineCount > QUALITY_FILTER.maxNewlines) {
      return { pass: false, reason: `too many newlines (${newlineCount})` };
    }

    // Generic openers
    for (const opener of QUALITY_FILTER.genericOpeners) {
      if (firstSentence.includes(opener)) {
        return { pass: false, reason: `generic opener: "${opener}"` };
      }
    }

    // Broad advice / how-to patterns
    for (const phrase of QUALITY_FILTER.broadAdvicePhrases) {
      if (lower.includes(phrase)) {
        return { pass: false, reason: `broad advice: "${phrase}"` };
      }
    }

    // Too polished / closed endings
    for (const phrase of QUALITY_FILTER.tooPolished) {
      if (lower.includes(phrase)) {
        return { pass: false, reason: `too polished: "${phrase}"` };
      }
    }

    // LinkedIn / performative voice patterns
    for (const phrase of QUALITY_FILTER.linkedinPatterns) {
      if (lower.includes(phrase)) {
        return { pass: false, reason: `linkedin pattern: "${phrase}"` };
      }
    }

    return { pass: true };
  }

  private async getStyleContext(): Promise<string> {
    const file = Bun.file(PATH_CONFIG.textStyle);
    if (!(await file.exists())) return '';
    return file.text();
  }
}
