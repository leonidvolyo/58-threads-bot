import { mkdir } from 'node:fs/promises';
import { loadEnv, PATH_CONFIG, SCHEDULE_CONFIG } from '../config/index.js';
import {
  GeminiService,
  ThreadsService,
  PostCacheService,
  PostLogService,
  BotStateService,
  TelegramBotService,
} from '../services/index.js';
import type {
  TelegramBotConfig,
  TelegramBotDependencies,
} from '../services/index.js';
import type { DraftPost } from '../types/index.js';
import { runBot, type RunBotDependencies } from './runBot.js';
import { schedulePosts } from './scheduler.js';
import { logger } from '../utils/logger.js';
import { ConfigError } from '../core/errors.js';

interface AppContainer {
  runBotDeps: RunBotDependencies;
  telegramBot: TelegramBotService | null;
  telegramAdminId: number | null;
  botState: BotStateService;
  postLog: PostLogService;
}

/**
 * Ensures the data directory and required state files exist before anything runs.
 */
async function bootstrap(): Promise<void> {
  await mkdir(PATH_CONFIG.dataDir, { recursive: true });
  logger.info({ dataDir: PATH_CONFIG.dataDir }, 'Data directory ready');
}

function buildContainer(): AppContainer {
  const env = loadEnv(true);

  const aiProvider = new GeminiService(env.GEMINI_API_KEY!);
  const threadsPublisher = new ThreadsService(
    env.THREADS_USER_ID!,
    env.THREADS_ACCESS_TOKEN!
  );
  const cache = new PostCacheService();
  const postLog = new PostLogService();
  const botState = new BotStateService();

  let telegramBot: TelegramBotService | null = null;
  let telegramAdminId: number | null = null;

  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ADMIN_ID) {
    const adminIds = [Number(env.TELEGRAM_ADMIN_ID)];
    if (env.TELEGRAM_ADMIN_ID_2) adminIds.push(Number(env.TELEGRAM_ADMIN_ID_2));
    telegramAdminId = adminIds[0]!;

    const botConfig: TelegramBotConfig = {
      botToken: env.TELEGRAM_BOT_TOKEN,
      adminIds,
      accessPassword: env.BOT_ACCESS_PASSWORD,
    };
    const botDeps: TelegramBotDependencies = {
      aiProvider,
      threadsPublisher,
      botState,
      postLog,
    };
    telegramBot = new TelegramBotService(botConfig, botDeps);
  }

  return {
    runBotDeps: { aiProvider, threadsPublisher, cache, postLog },
    telegramBot,
    telegramAdminId,
    botState,
    postLog,
  };
}

/**
 * Creates the scheduled tick function.
 * - Checks if paused
 * - Generates post with duplicate check
 * - If Telegram bot: saves as draft and sends for approval
 * - If no Telegram: publishes directly
 */
function createScheduleTick(container: AppContainer): () => Promise<void> {
  const { runBotDeps, telegramBot, botState, postLog } = container;
  const { aiProvider, threadsPublisher } = runBotDeps;

  return async () => {
    const paused = await botState.isPaused();
    if (paused) {
      logger.info('Bot is paused — skipping scheduled post');
      return;
    }

    if (telegramBot) {
      // Draft approval flow: generate → notify admin → wait for approval
      logger.info('Generating draft for Telegram approval...');
      try {
        let topic = await aiProvider.getRandomTopic();
        let hookIntent = aiProvider.getRandomHookIntent();
        let text = await aiProvider.generatePost({ topic, hookIntent });

        if (await postLog.isDuplicate(text)) {
          logger.info({ topic }, 'Scheduled draft is a duplicate — regenerating');
          topic = await aiProvider.getRandomTopic();
          hookIntent = aiProvider.getRandomHookIntent();
          text = await aiProvider.generatePost({ topic, hookIntent });
        }

        const draft: DraftPost = { text, topic, hookIntent, generatedAt: new Date().toISOString() };
        await botState.setDraft(draft);
        await telegramBot.sendDraftForApproval(draft);
      } catch (err) {
        logger.error({ err }, 'Scheduled draft generation failed');
      }
    } else {
      // Auto-publish flow (no Telegram configured)
      logger.info('No Telegram configured — auto-publishing');
      try {
        let topic = await aiProvider.getRandomTopic();
        let hookIntent = aiProvider.getRandomHookIntent();
        let text = await aiProvider.generatePost({ topic, hookIntent });

        if (await postLog.isDuplicate(text)) {
          logger.info({ topic }, 'Auto-publish: duplicate detected — regenerating');
          topic = await aiProvider.getRandomTopic();
          hookIntent = aiProvider.getRandomHookIntent();
          text = await aiProvider.generatePost({ topic, hookIntent });
        }

        const result = await threadsPublisher.publish(text);
        await postLog.add({
          text,
          topic,
          timestamp: new Date().toISOString(),
          status: 'published',
        });
        logger.info({ creation_id: result.creation_id, topic, hookIntent }, 'Auto-published successfully');
      } catch (err) {
        logger.error({ err }, 'Auto-publish failed');
      }
    }
  };
}

const isRunOnce = Bun.argv.some((arg) => arg.includes('once'));
const isBotOnly = Bun.argv.some((arg) => arg.includes('bot'));

async function main(): Promise<void> {
  try {
    await bootstrap();

    const container = buildContainer();
    const { runBotDeps, telegramBot, botState } = container;

    // Startup summary
    const state = await botState.get();
    const mode = isRunOnce ? 'once' : isBotOnly ? 'bot-only' : 'scheduler';
    logger.info(
      {
        mode,
        telegramEnabled: !!telegramBot,
        schedulerEnabled: !isRunOnce && !isBotOnly,
        paused: state.paused,
        twoPostsPerDay: SCHEDULE_CONFIG.twoPostsPerDay,
        timezone: Bun.env.TZ ?? 'system default',
        dataDir: PATH_CONFIG.dataDir,
      },
      '58-threads-bot starting'
    );

    if (isRunOnce) {
      await runBot(runBotDeps);
      process.exit(0);
    }

    if (isBotOnly) {
      if (!telegramBot) {
        throw new ConfigError(
          'TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_ID are required for --bot mode'
        );
      }
      await telegramBot.start();
      return;
    }

    // Normal mode: scheduler + optional Telegram bot
    const tick = createScheduleTick(container);
    schedulePosts(tick);

    if (telegramBot) {
      await telegramBot.start();
    } else {
      logger.info(
        'Telegram not configured — running scheduler in auto-publish mode. ' +
        'Set TELEGRAM_BOT_TOKEN + TELEGRAM_ADMIN_ID to enable draft approval.'
      );
    }
  } catch (err) {
    if (err instanceof ConfigError) {
      logger.error(err.message, 'Configuration error — fix and restart');
    } else {
      logger.error({ err }, 'Fatal startup error');
    }
    process.exit(1);
  }
}

main();
