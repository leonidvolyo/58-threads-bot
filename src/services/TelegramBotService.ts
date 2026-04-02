import { Bot, type Context, InlineKeyboard } from 'grammy';
import type { IAIPostProvider, IThreadsPublisher } from '../core/interfaces.js';
import type { BotStateService } from './BotStateService.js';
import type { PostLogService } from './PostLogService.js';
import type { DraftPost } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface TelegramBotConfig {
  botToken: string;
  adminIds: number[];
  accessPassword?: string;
}

export interface TelegramBotDependencies {
  aiProvider: IAIPostProvider;
  threadsPublisher: IThreadsPublisher;
  botState: BotStateService;
  postLog: PostLogService;
}

const authenticatedUsers = new Set<number>();

const approvalKeyboard = new InlineKeyboard()
  .text('✅ Publish', 'approve')
  .text('🔄 Regenerate', 'regenerate');

function formatDraft(draft: DraftPost): string {
  const lines = ['📝 Draft ready:', '', draft.text, '', '—', `Topic: ${draft.topic}`];
  if (draft.hookIntent) lines.push(`Hook: ${draft.hookIntent}`);
  return lines.join('\n');
}

/**
 * Creates and configures the Telegram bot.
 *
 * /generate [topical <angle>|<custom angle>]
 *   — no argument: random topic + random hook intent
 *   — "topical <text>": use text as custom angle, force topical_reaction hook
 *   — "<any text>": use text as custom angle, random hook intent
 */
export function createTelegramBot(
  config: TelegramBotConfig,
  deps: TelegramBotDependencies
): Bot {
  const bot = new Bot(config.botToken);
  const { aiProvider, threadsPublisher, botState, postLog } = deps;

  // Auth middleware
  bot.use(async (ctx: Context, next) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (config.adminIds.includes(userId) || authenticatedUsers.has(userId)) {
      await next();
      return;
    }

    const text =
      ctx.message && 'text' in ctx.message ? ctx.message.text : undefined;
    if (text && config.accessPassword && text.trim() === config.accessPassword) {
      authenticatedUsers.add(userId);
      await ctx.reply('Access granted. Use /help to see available commands.');
      logger.info({ userId }, 'User authenticated via password');
      return;
    }

    logger.warn({ userId }, 'Unauthorized access attempt');
  });

  // /generate [topical <angle> | <custom angle>]
  bot.command('generate', async (ctx) => {
    const match = (ctx.match ?? '').trim();

    // Parse the argument
    let customAngle: string | undefined;
    let hookIntent: string | undefined;

    if (match.toLowerCase().startsWith('topical ')) {
      customAngle = match.slice(8).trim(); // strip "topical "
      hookIntent = 'topical_reaction';
    } else if (match.length > 0) {
      customAngle = match; // treat anything else as a custom angle
    }

    const replyText = customAngle
      ? `Generating post about: "${customAngle}"...`
      : 'Generating draft...';
    await ctx.reply(replyText);

    try {
      const topic = customAngle ? customAngle : await aiProvider.getRandomTopic();
      const resolvedHookIntent = hookIntent ?? aiProvider.getRandomHookIntent();

      let text = await aiProvider.generatePost({
        customAngle,
        topic: customAngle ? undefined : topic,
        hookIntent: resolvedHookIntent,
      });

      // Duplicate check — one retry if needed
      if (await postLog.isDuplicate(text)) {
        logger.info({ topic }, '/generate: duplicate detected — regenerating');
        const newTopic = customAngle ? customAngle : await aiProvider.getRandomTopic();
        text = await aiProvider.generatePost({
          customAngle,
          topic: customAngle ? undefined : newTopic,
          hookIntent: aiProvider.getRandomHookIntent(),
        });
      }

      const draft: DraftPost = {
        text,
        topic,
        hookIntent: resolvedHookIntent,
        generatedAt: new Date().toISOString(),
      };
      await botState.setDraft(draft);
      await ctx.reply(formatDraft(draft), { reply_markup: approvalKeyboard });
      logger.info({ topic, hookIntent: resolvedHookIntent }, 'Draft generated via /generate');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.reply(`Failed to generate: ${msg}`);
      logger.error({ err }, '/generate failed');
    }
  });

  // /approve — publish the pending draft
  bot.command('approve', async (ctx) => {
    const draft = await botState.getDraft();
    if (!draft) {
      await ctx.reply('No pending draft. Use /generate to create one.');
      return;
    }
    await ctx.reply('Publishing...');
    try {
      const result = await threadsPublisher.publish(draft.text);
      await postLog.add({
        text: draft.text,
        topic: draft.topic,
        timestamp: new Date().toISOString(),
        status: 'published',
      });
      await botState.setDraft(null);
      await ctx.reply(`Published ✅\n\nID: ${result.creation_id}`);
      logger.info({ creation_id: result.creation_id, topic: draft.topic }, 'Published via /approve');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await postLog.add({
        text: draft.text,
        topic: draft.topic,
        timestamp: new Date().toISOString(),
        status: 'failed',
      });
      await ctx.reply(`Publish failed: ${msg}`);
      logger.error({ err }, '/approve publish failed');
    }
  });

  // /reject — discard the pending draft
  bot.command('reject', async (ctx) => {
    const draft = await botState.getDraft();
    if (!draft) {
      await ctx.reply('No pending draft.');
      return;
    }
    await postLog.add({
      text: draft.text,
      topic: draft.topic,
      timestamp: new Date().toISOString(),
      status: 'rejected',
    });
    await botState.setDraft(null);
    await ctx.reply('Draft rejected. Use /generate to create a new one.');
    logger.info({ topic: draft.topic }, 'Draft rejected via /reject');
  });

  // /post_now — generate and publish immediately (no review)
  bot.command('post_now', async (ctx) => {
    await ctx.reply('Generating and publishing now...');
    try {
      const topic = await aiProvider.getRandomTopic();
      const hookIntent = aiProvider.getRandomHookIntent();
      const text = await aiProvider.generatePost({ topic, hookIntent });
      const result = await threadsPublisher.publish(text);
      await postLog.add({
        text,
        topic,
        timestamp: new Date().toISOString(),
        status: 'published',
      });
      await ctx.reply(`Done ✅\n\n${text}\n\n—\nID: ${result.creation_id}`);
      logger.info({ creation_id: result.creation_id, topic, hookIntent }, 'Published via /post_now');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.reply(`Failed: ${msg}`);
      logger.error({ err }, '/post_now failed');
    }
  });

  // /pause
  bot.command('pause', async (ctx) => {
    await botState.setPaused(true);
    await ctx.reply('Scheduled posts paused. Use /resume to re-enable.');
    logger.info('Bot paused via /pause');
  });

  // /resume
  bot.command('resume', async (ctx) => {
    await botState.setPaused(false);
    await ctx.reply('Scheduled posts resumed.');
    logger.info('Bot resumed via /resume');
  });

  // /status
  bot.command('status', async (ctx) => {
    const state = await botState.get();
    const recent = await postLog.getRecent(5);

    const lines: string[] = [
      `Status: ${state.paused ? '⏸ Paused' : '▶️ Running'}`,
      '',
      state.draft
        ? `Pending draft:\n${state.draft.text}\n\nTopic: ${state.draft.topic}${state.draft.hookIntent ? `\nHook: ${state.draft.hookIntent}` : ''}\nGenerated: ${new Date(state.draft.generatedAt).toLocaleString()}`
        : 'No pending draft.',
    ];

    if (recent.length > 0) {
      lines.push('', 'Last 5 posts:');
      for (const entry of [...recent].reverse()) {
        const icon = entry.status === 'published' ? '✅' : entry.status === 'failed' ? '❌' : '🚫';
        const date = new Date(entry.timestamp).toLocaleDateString();
        lines.push(`${icon} [${date}] ${entry.text.slice(0, 60)}...`);
      }
    }

    await ctx.reply(lines.join('\n'));
  });

  // /start and /help
  bot.command('start', (ctx) =>
    ctx.reply('Threads bot is running.\n\nUse /help to see commands.')
  );

  bot.command('help', (ctx) =>
    ctx.reply(
      [
        'Commands:',
        '/generate — generate a draft (random topic + hook)',
        '/generate topical <angle> — generate a post about a specific angle',
        '/generate <custom text> — same as topical, but picks hook randomly',
        '/approve — publish the pending draft',
        '/reject — discard the pending draft',
        '/post_now — generate and publish immediately',
        '/pause — pause scheduled posts',
        '/resume — resume scheduled posts',
        '/status — show current state',
        config.accessPassword ? '\nSend the password to authenticate.' : '',
      ]
        .filter(Boolean)
        .join('\n')
    )
  );

  // Inline keyboard callbacks
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (data === 'approve') {
      const draft = await botState.getDraft();
      if (!draft) { await ctx.answerCallbackQuery('No pending draft.'); return; }
      await ctx.answerCallbackQuery('Publishing...');
      try {
        const result = await threadsPublisher.publish(draft.text);
        await postLog.add({
          text: draft.text,
          topic: draft.topic,
          timestamp: new Date().toISOString(),
          status: 'published',
        });
        await botState.setDraft(null);
        await ctx.editMessageText(`✅ Published!\n\n${draft.text}\n\n—\nID: ${result.creation_id}`);
        logger.info({ creation_id: result.creation_id, topic: draft.topic }, 'Published via inline approve');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await postLog.add({
          text: draft.text,
          topic: draft.topic,
          timestamp: new Date().toISOString(),
          status: 'failed',
        });
        await ctx.editMessageText(`❌ Publish failed: ${msg}`);
        logger.error({ err }, 'Inline approve failed');
      }
    }

    if (data === 'regenerate') {
      await ctx.answerCallbackQuery('Regenerating...');
      try {
        const topic = await aiProvider.getRandomTopic();
        const hookIntent = aiProvider.getRandomHookIntent();
        const text = await aiProvider.generatePost({ topic, hookIntent });
        const draft: DraftPost = { text, topic, hookIntent, generatedAt: new Date().toISOString() };
        await botState.setDraft(draft);
        await ctx.editMessageText(formatDraft(draft), { reply_markup: approvalKeyboard });
        logger.info({ topic, hookIntent }, 'Draft regenerated via inline button');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await ctx.editMessageText(`❌ Regeneration failed: ${msg}`);
        logger.error({ err }, 'Inline regenerate failed');
      }
    }
  });

  return bot;
}

/**
 * Wrapper for long-polling mode.
 */
export class TelegramBotService {
  private readonly bot: Bot;
  private readonly adminId: number;

  constructor(config: TelegramBotConfig, deps: TelegramBotDependencies) {
    this.bot = createTelegramBot(config, deps);
    this.adminId = config.adminIds[0]!;
  }

  async start(): Promise<void> {
    logger.info('Starting Telegram bot (long polling)...');
    this.bot.start({
      onStart: () => logger.info('Telegram bot is running'),
    });
  }

  stop(): void {
    this.bot.stop();
    logger.info('Telegram bot stopped');
  }

  async sendDraftForApproval(draft: DraftPost): Promise<void> {
    await this.bot.api.sendMessage(this.adminId, formatDraft(draft), {
      reply_markup: approvalKeyboard,
    });
    logger.info({ topic: draft.topic, hookIntent: draft.hookIntent }, 'Draft sent to Telegram for approval');
  }
}
