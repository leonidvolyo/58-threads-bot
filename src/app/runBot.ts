import type { IAIPostProvider, IThreadsPublisher, IPostCacheStore } from '../core/interfaces.js';
import type { PostLogService } from '../services/PostLogService.js';
import type { PublishResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface RunBotDependencies {
  aiProvider: IAIPostProvider;
  threadsPublisher: IThreadsPublisher;
  cache: IPostCacheStore;
  postLog: PostLogService;
}

/**
 * Direct publish cycle: generate (or use cached), check duplicates, publish, log.
 * Used for --once mode and auto-publish (no Telegram draft approval).
 */
export async function runBot(deps: RunBotDependencies): Promise<PublishResult> {
  const { aiProvider, threadsPublisher, cache, postLog } = deps;

  let post = await cache.get();

  if (post) {
    logger.info({ topic: post.topic }, 'Using cached post');
  } else {
    // Try up to 3 times to get a non-duplicate post
    for (let attempt = 1; attempt <= 3; attempt++) {
      const topic = await aiProvider.getRandomTopic();
      const hookIntent = aiProvider.getRandomHookIntent();
      const text = await aiProvider.generatePost({ topic, hookIntent });
      const isDuplicate = await postLog.isDuplicate(text);

      if (!isDuplicate) {
        post = { topic, text };
        logger.info({ topic, hookIntent, attempt }, 'Generated new post');
        break;
      }
      logger.info({ attempt, topic }, 'Post too similar to recent — retrying');
    }

    if (!post) {
      const topic = await aiProvider.getRandomTopic();
      const hookIntent = aiProvider.getRandomHookIntent();
      const text = await aiProvider.generatePost({ topic, hookIntent });
      post = { topic, text };
      logger.warn({ topic }, 'Using post despite possible similarity (all attempts were duplicates)');
    }
  }

  try {
    const result = await threadsPublisher.publish(post.text);
    await cache.set(null);
    await postLog.add({
      text: post.text,
      topic: post.topic,
      timestamp: new Date().toISOString(),
      status: 'published',
    });
    logger.info({ creation_id: result.creation_id }, 'Published successfully');
    return result;
  } catch (err) {
    await cache.set(post);
    await postLog.add({
      text: post.text,
      topic: post.topic,
      timestamp: new Date().toISOString(),
      status: 'failed',
    });
    logger.error({ err, topic: post.topic }, 'Publish failed; post cached for retry');
    throw err;
  }
}
