import { mkdir } from 'node:fs/promises';
import type { PostLogEntry } from '../types/index.js';
import { PATH_CONFIG, DUPLICATE_CHECK_WINDOW } from '../config/index.js';
import { logger } from '../utils/logger.js';

const LOG_FILE = PATH_CONFIG.postLog;

/**
 * Persists per-post history (text, topic, timestamp, status) to a JSON file.
 * Also provides duplicate detection against recent posts.
 */
export class PostLogService {
  /**
   * Returns the N most recent log entries.
   */
  async getRecent(n: number = DUPLICATE_CHECK_WINDOW): Promise<PostLogEntry[]> {
    try {
      const file = Bun.file(LOG_FILE);
      if (!(await file.exists())) return [];
      const entries: PostLogEntry[] = JSON.parse(await file.text());
      return Array.isArray(entries) ? entries.slice(-n) : [];
    } catch {
      return [];
    }
  }

  /**
   * Appends a new entry to the log.
   */
  async add(entry: PostLogEntry): Promise<void> {
    try {
      await mkdir(PATH_CONFIG.dataDir, { recursive: true });
      const existing = await this.getRecent(1000);
      existing.push(entry);
      await Bun.write(LOG_FILE, JSON.stringify(existing, null, 2));
    } catch (err) {
      logger.warn({ err }, 'Failed to write post log');
    }
  }

  /**
   * Returns true if the given text is too similar to any recent published post.
   * Uses Jaccard similarity on meaningful words (length > 3, not stop words).
   */
  async isDuplicate(text: string): Promise<boolean> {
    const recent = await this.getRecent();
    const published = recent.filter((e) => e.status === 'published');
    if (published.length === 0) return false;

    const threshold = 0.5;
    const wordsOf = (t: string): Set<string> => {
      const stopWords = new Set([
        'the', 'and', 'that', 'this', 'with', 'your', 'they', 'have',
        'for', 'not', 'are', 'was', 'been', 'from', 'their', 'will',
        'more', 'what', 'when', 'just', 'also', 'than', 'into', 'some',
      ]);
      return new Set(
        t.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter((w) => w.length > 3 && !stopWords.has(w))
      );
    };

    const newWords = wordsOf(text);
    if (newWords.size === 0) return false;

    for (const entry of published) {
      const existingWords = wordsOf(entry.text);
      if (existingWords.size === 0) continue;
      const intersection = [...newWords].filter((w) => existingWords.has(w));
      const union = new Set([...newWords, ...existingWords]);
      const similarity = intersection.length / union.size;
      if (similarity >= threshold) {
        logger.info(
          { similarity: similarity.toFixed(2), existingTopic: entry.topic },
          'Duplicate post detected'
        );
        return true;
      }
    }
    return false;
  }
}
