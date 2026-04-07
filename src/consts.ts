export const SITE_TITLE = 'Inner Light Journal';
export const SITE_DESCRIPTION = 'Exploring mindfulness, meditation, and spirituality for a more conscious life.';

export const CATEGORIES = ['Mindfulness', 'Meditation', 'Spirituality', 'Wellness', 'Practice'] as const;
export type Category = typeof CATEGORIES[number];
