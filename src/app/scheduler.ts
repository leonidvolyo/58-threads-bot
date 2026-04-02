import cron from 'node-cron';
import { SCHEDULE_CONFIG } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { padStart } from '../utils/string.js';

type Slot = 'morning' | 'evening';

/**
 * Calculates a random time near the given slot center (±variationMinutes).
 */
function getSlotTime(slot: Slot): { hour: number; minute: number } {
  const baseHour =
    slot === 'morning' ? SCHEDULE_CONFIG.morningHour : SCHEDULE_CONFIG.eveningHour;
  const baseMinute = 0;
  const variation = SCHEDULE_CONFIG.variationMinutes;

  // Offset in range [-variation, +variation]
  const offsetMinutes = Math.floor(Math.random() * (variation * 2 + 1)) - variation;
  let totalMinutes = baseHour * 60 + baseMinute + offsetMinutes;

  // Clamp to 0–23:59
  totalMinutes = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  return {
    hour: Math.floor(totalMinutes / 60),
    minute: totalMinutes % 60,
  };
}

/**
 * Schedules a single slot (morning or evening). After it fires, reschedules itself for the next day.
 * @param onTick - Async callback to run at scheduled time
 * @param slot - 'morning' or 'evening'
 */
function scheduleSlot(onTick: () => Promise<void>, slot: Slot): void {
  const { hour, minute } = getSlotTime(slot);
  const cronExpr = `${minute} ${hour} * * *`;

  logger.info(
    { slot, time: `${padStart(hour, 2)}:${padStart(minute, 2)}` },
    'Post scheduled'
  );

  const task = cron.schedule(cronExpr, async () => {
    task.stop(); // Stop this instance — rescheduled after run
    try {
      await onTick();
    } catch (err) {
      logger.error({ err, slot }, 'Scheduled post failed');
    }
    // Short delay to ensure task is fully cleaned up before next schedule
    setTimeout(() => scheduleSlot(onTick, slot), 2000);
  });
}

/**
 * Starts the posting schedule.
 * Schedules morning (and optionally evening) posts with random variation.
 * @param onTick - Called at each scheduled post time. Should handle paused check + generation.
 */
export function schedulePosts(onTick: () => Promise<void>): void {
  scheduleSlot(onTick, 'morning');
  if (SCHEDULE_CONFIG.twoPostsPerDay) {
    scheduleSlot(onTick, 'evening');
  }
}
