/**
 * Shared domain and API types for the Threads bot.
 */

/** Cached post before publishing */
export interface PostCache {
  topic: string;
  text: string;
}

/** Result of Threads API publish */
export interface PublishResult {
  creation_id: string;
  [key: string]: unknown;
}

/** Threads API container response */
export interface ThreadsContainerResponse {
  id?: string;
  creation_id?: string;
}

/** Gemini API error detail (e.g. RetryInfo) */
export interface GeminiErrorDetail {
  '@type'?: string;
  retryDelay?: string;
}

/** Gemini API error shape */
export interface GeminiError extends Error {
  errorDetails?: GeminiErrorDetail[];
}

/** Topic list: array or object of topics */
export type TopicsInput = string[] | Record<string, string>;

/** A post draft waiting for Telegram approval */
export interface DraftPost {
  text: string;
  topic: string;
  hookIntent?: string;
  generatedAt: string;
}

/** Persistent bot state (paused flag + current draft) */
export interface BotState {
  paused: boolean;
  draft: DraftPost | null;
}

/** Entry in the post history log */
export interface PostLogEntry {
  text: string;
  topic: string;
  timestamp: string;
  status: 'published' | 'rejected' | 'failed';
}
