import type { PostCache, PublishResult } from '../types/index.js';

/** Options for AI post generation */
export interface GeneratePostOptions {
  /** Topic from the topic buckets (or custom text) */
  topic?: string;
  /** Hook intent to guide the opening strategy */
  hookIntent?: string;
  /** Free-form custom angle, overrides topic (used in topical mode) */
  customAngle?: string;
}

/**
 * Contract for an AI post generation provider (e.g. Gemini, Claude).
 */
export interface IAIPostProvider {
  /** Returns a random topic from the configured list */
  getRandomTopic(): Promise<string>;
  /** Returns a random hook intent */
  getRandomHookIntent(): string;
  /**
   * Generates post text.
   * Accepts a topic string (legacy) or a GeneratePostOptions object.
   */
  generatePost(options?: string | GeneratePostOptions): Promise<string>;
}

/**
 * Contract for publishing content to Threads.
 */
export interface IThreadsPublisher {
  /** Publishes text to Threads and returns the creation id */
  publish(text: string): Promise<PublishResult>;
}

/**
 * Contract for reading/writing the post cache (e.g. file-based).
 */
export interface IPostCacheStore {
  get(): Promise<PostCache | null>;
  set(data: PostCache | null): Promise<void>;
}
