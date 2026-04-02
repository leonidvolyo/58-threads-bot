import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFile } from 'node:fs/promises';
import { Bot, type Context, InlineKeyboard } from 'grammy';
import type { Update } from 'grammy/types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

import {
  PROMPT,
  AI_CONFIG,
  CONFIG,
  THREADS_MAX_LENGTH,
  BANNED_PHRASES,
  ALL_TOPICS,
  HOOK_INTENTS,
} from '../src/config/constants.js';
import { truncate } from '../src/utils/string.js';

interface WebhookEnv {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_ADMIN_ID: string;
  TELEGRAM_ADMIN_ID_2?: string;
  BOT_ACCESS_PASSWORD?: string;
  WEBHOOK_SECRET: string;
  GEMINI_API_KEY: string;
  THREADS_USER_ID: string;
  THREADS_ACCESS_TOKEN: string;
}

function loadWebhookEnv(): WebhookEnv {
  const {
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_ADMIN_ID,
    TELEGRAM_ADMIN_ID_2,
    BOT_ACCESS_PASSWORD,
    WEBHOOK_SECRET,
    GEMINI_API_KEY,
    THREADS_USER_ID,
    THREADS_ACCESS_TOKEN,
  } = process.env;

  if (!TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is required');
  if (!TELEGRAM_ADMIN_ID) throw new Error('TELEGRAM_ADMIN_ID is required');
  if (!WEBHOOK_SECRET) throw new Error('WEBHOOK_SECRET is required');
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is required');
  if (!THREADS_USER_ID) throw new Error('THREADS_USER_ID is required');
  if (!THREADS_ACCESS_TOKEN) throw new Error('THREADS_ACCESS_TOKEN is required');

  return {
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_ADMIN_ID,
    TELEGRAM_ADMIN_ID_2,
    BOT_ACCESS_PASSWORD,
    WEBHOOK_SECRET,
    GEMINI_API_KEY,
    THREADS_USER_ID,
    THREADS_ACCESS_TOKEN,
  };
}

function getRandomTopic(): string {
  return ALL_TOPICS[Math.floor(Math.random() * ALL_TOPICS.length)] ?? ALL_TOPICS[0]!;
}

function getRandomHookIntent(): string {
  return HOOK_INTENTS[Math.floor(Math.random() * HOOK_INTENTS.length)] ?? 'pain_diagnosis';
}

function hasBannedPhrase(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.some((p) => lower.includes(p.toLowerCase()));
}

async function generatePost(apiKey: string, topic: string, hookIntent?: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: AI_CONFIG.model });

  let style = '';
  try {
    style = await readFile(CONFIG.textStyle, 'utf-8');
  } catch {
    /* textStyle.txt not present on Vercel — expected */
  }

  const resolvedHook = hookIntent ?? getRandomHookIntent();
  const promptText = PROMPT
    .replace('{TOPIC}', topic)
    .replace('{HOOK_INTENT}', resolvedHook);
  const fullPrompt = style
    ? `${promptText}\n\nAdditional voice context:\n${style}`
    : promptText;

  for (let attempt = 0; attempt < AI_CONFIG.maxRetries; attempt++) {
    const result = await model.generateContent(fullPrompt);
    const text = result.response.text().trim();
    if (!hasBannedPhrase(text)) {
      return truncate(text, AI_CONFIG.threadCharLimit);
    }
  }

  const result = await model.generateContent(fullPrompt);
  return truncate(result.response.text().trim(), AI_CONFIG.threadCharLimit);
}

interface ThreadsContainerResponse {
  id?: string;
  creation_id?: string;
}

interface PublishResult {
  creation_id: string;
  [key: string]: unknown;
}

async function publishToThreads(
  userId: string,
  accessToken: string,
  text: string
): Promise<PublishResult> {
  const client = axios.create({
    baseURL: `https://graph.threads.net/v1.0/${userId}`,
    params: { access_token: accessToken },
  });

  const content = truncate(text, THREADS_MAX_LENGTH);

  const { data: container } = await client.post<ThreadsContainerResponse>(
    '/threads',
    null,
    { params: { media_type: 'TEXT', text: content } }
  );

  const creationId = container.id ?? container.creation_id;
  if (!creationId) throw new Error('Failed to obtain creation_id from Threads');

  const { data: publishResult } = await client.post<PublishResult>(
    '/threads_publish',
    null,
    { params: { creation_id: creationId } }
  );

  return { ...publishResult, creation_id: creationId };
}

// In-memory draft state for webhook (resets on cold start)
let pendingDraft: { text: string; topic: string } | null = null;
const authenticatedUsers = new Set<number>();
let bot: Bot | undefined;

const approvalKeyboard = new InlineKeyboard()
  .text('✅ Publish', 'approve')
  .text('🔄 Regenerate', 'regenerate');

function getBot(): Bot {
  if (bot) return bot;

  const env = loadWebhookEnv();
  const adminIds = [Number(env.TELEGRAM_ADMIN_ID)];
  if (env.TELEGRAM_ADMIN_ID_2) adminIds.push(Number(env.TELEGRAM_ADMIN_ID_2));

  bot = new Bot(env.TELEGRAM_BOT_TOKEN);

  bot.use(async (ctx: Context, next) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (adminIds.includes(userId) || authenticatedUsers.has(userId)) {
      await next();
      return;
    }

    const text =
      ctx.message && 'text' in ctx.message ? ctx.message.text : undefined;
    if (text && env.BOT_ACCESS_PASSWORD && text.trim() === env.BOT_ACCESS_PASSWORD) {
      authenticatedUsers.add(userId);
      await ctx.reply('Access granted. Use /help to see commands.');
    }
  });

  bot.command('start', (ctx) =>
    ctx.reply('Threads bot is active. Use /help for commands.')
  );

  bot.command('help', (ctx) =>
    ctx.reply(
      [
        'Commands:',
        '/generate — generate a draft',
        '/approve — publish pending draft',
        '/reject — discard pending draft',
        '/post_now — generate and publish immediately',
      ]
        .filter(Boolean)
        .join('\n')
    )
  );

  bot.command('generate', async (ctx) => {
    await ctx.reply('Generating draft...');
    try {
      const topic = getRandomTopic();
      const text = await generatePost(env.GEMINI_API_KEY, topic);
      pendingDraft = { text, topic };
      await ctx.reply(`📝 Draft ready:\n\n${text}\n\n—\nTopic: ${topic}`, {
        reply_markup: approvalKeyboard,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.reply(`Failed to generate: ${msg}`);
    }
  });

  bot.command('approve', async (ctx) => {
    if (!pendingDraft) {
      await ctx.reply('No pending draft. Use /generate to create one.');
      return;
    }
    await ctx.reply('Publishing...');
    try {
      const result = await publishToThreads(
        env.THREADS_USER_ID,
        env.THREADS_ACCESS_TOKEN,
        pendingDraft.text
      );
      const published = pendingDraft;
      pendingDraft = null;
      await ctx.reply(`Published ✅\n\n${published.text}\n\nID: ${result.creation_id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.reply(`Publish failed: ${msg}`);
    }
  });

  bot.command('reject', async (ctx) => {
    if (!pendingDraft) {
      await ctx.reply('No pending draft.');
      return;
    }
    pendingDraft = null;
    await ctx.reply('Draft discarded. Use /generate to create a new one.');
  });

  bot.command('post_now', async (ctx) => {
    await ctx.reply('Generating and publishing now...');
    try {
      const topic = getRandomTopic();
      const text = await generatePost(env.GEMINI_API_KEY, topic);
      const result = await publishToThreads(
        env.THREADS_USER_ID,
        env.THREADS_ACCESS_TOKEN,
        text
      );
      await ctx.reply(`Done ✅\n\n${text}\n\nID: ${result.creation_id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.reply(`Failed: ${msg}`);
    }
  });

  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (data === 'approve') {
      if (!pendingDraft) { await ctx.answerCallbackQuery('No pending draft.'); return; }
      await ctx.answerCallbackQuery('Publishing...');
      try {
        const result = await publishToThreads(
          env.THREADS_USER_ID,
          env.THREADS_ACCESS_TOKEN,
          pendingDraft.text
        );
        const published = pendingDraft;
        pendingDraft = null;
        await ctx.editMessageText(`✅ Published!\n\n${published.text}\n\nID: ${result.creation_id}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await ctx.editMessageText(`❌ Failed: ${msg}`);
      }
    }
    if (data === 'regenerate') {
      await ctx.answerCallbackQuery('Regenerating...');
      try {
        const topic = getRandomTopic();
        const text = await generatePost(env.GEMINI_API_KEY, topic);
        pendingDraft = { text, topic };
        await ctx.editMessageText(`📝 Draft ready:\n\n${text}\n\n—\nTopic: ${topic}`, {
          reply_markup: approvalKeyboard,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await ctx.editMessageText(`❌ Regeneration failed: ${msg}`);
      }
    }
  });

  return bot;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
  const expectedSecret = process.env.WEBHOOK_SECRET;

  if (!expectedSecret || secretHeader !== expectedSecret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const instance = getBot();
    await instance.init();
    await instance.handleUpdate(req.body as Update);
  } catch (err) {
    console.error('Webhook handler error:', err);
  }

  res.status(200).json({ ok: true });
}
