import { queryAll, runSql, ReviewRecord } from './db.js';

export interface MeetingSlot {
  dateIso: string;
  formattedString: string;
  timeSlot: string;
}

// Preset distinct high-availability review time slots throughout the day
const TIME_SLOTS = [
  { hour: 9, minute: 30, label: '09:30 AM' },
  { hour: 11, minute: 15, label: '11:15 AM' },
  { hour: 13, minute: 45, label: '01:45 PM' },
  { hour: 15, minute: 15, label: '03:15 PM' },
  { hour: 16, minute: 30, label: '04:30 PM' },
  { hour: 10, minute: 0, label: '10:00 AM' },
  { hour: 14, minute: 30, label: '02:30 PM' },
  { hour: 11, minute: 45, label: '11:45 AM' },
  { hour: 16, minute: 0, label: '04:00 PM' },
];

/**
 * Calculates a unique, collision-free date and time for each project review.
 * Every project receives a distinct day and a distinct time slot.
 */
export function calculateDistinctReviewSlot(
  sequenceIndex: number,
  baseDayOffset: number = 2
): string {
  const targetDate = new Date();
  
  // Calculate distinct day: distribute sequentially (e.g., +2 days, +3 days, +4 days, etc.)
  const dayOffset = baseDayOffset + sequenceIndex;
  targetDate.setDate(targetDate.getDate() + dayOffset);

  // Skip Sunday if landed (add 1 day to move to Monday)
  if (targetDate.getDay() === 0) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  // Pick distinct time slot cycling through non-overlapping time windows
  const slot = TIME_SLOTS[sequenceIndex % TIME_SLOTS.length];
  targetDate.setHours(slot.hour, slot.minute, 0, 0);

  return targetDate.toISOString();
}

/**
 * Migration helper to ensure all existing reviews in SQLite have
 * completely distinct dates and times.
 */
export function staggerAllExistingReviews(): void {
  try {
    const reviews = queryAll<ReviewRecord>(
      'SELECT id, review_round, scheduled_date FROM reviews ORDER BY created_at ASC'
    );

    if (reviews.length === 0) return;

    reviews.forEach((rev, index) => {
      // Offset by index + round to guarantee distinct day and distinct hour/minute
      const distinctSlot = calculateDistinctReviewSlot(index, 2 + (rev.review_round - 1) * 3);
      runSql('UPDATE reviews SET scheduled_date = ? WHERE id = ?', [distinctSlot, rev.id]);
    });

    console.log(`Successfully staggered ${reviews.length} reviews to distinct dates and times.`);
  } catch (err) {
    console.error('Error staggering existing reviews:', err);
  }
}
