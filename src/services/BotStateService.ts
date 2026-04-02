import { mkdir } from 'node:fs/promises';
import type { BotState, DraftPost } from '../types/index.js';
import { PATH_CONFIG } from '../config/index.js';
import { logger } from '../utils/logger.js';

const STATE_FILE = PATH_CONFIG.botState;

const DEFAULT_STATE: BotState = {
  paused: false,
  draft: null,
};

/**
 * Manages persistent bot state: paused flag and pending draft post.
 * State is stored in a JSON file so it survives restarts.
 */
export class BotStateService {
  private async read(): Promise<BotState> {
    try {
      const file = Bun.file(STATE_FILE);
      if (!(await file.exists())) return { ...DEFAULT_STATE };
      return JSON.parse(await file.text()) as BotState;
    } catch {
      return { ...DEFAULT_STATE };
    }
  }

  private async write(state: BotState): Promise<void> {
    try {
      await mkdir(PATH_CONFIG.dataDir, { recursive: true });
      await Bun.write(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (err) {
      logger.warn({ err }, 'Failed to write bot state');
    }
  }

  async isPaused(): Promise<boolean> {
    return (await this.read()).paused;
  }

  async setPaused(paused: boolean): Promise<void> {
    const state = await this.read();
    await this.write({ ...state, paused });
  }

  async getDraft(): Promise<DraftPost | null> {
    return (await this.read()).draft;
  }

  async setDraft(draft: DraftPost | null): Promise<void> {
    const state = await this.read();
    await this.write({ ...state, draft });
  }

  async get(): Promise<BotState> {
    return this.read();
  }
}
