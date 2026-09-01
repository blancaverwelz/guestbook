export interface AdminEvent {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  // ISO date string (YYYY-MM-DD) from Postgres `date`. No editor field
  // existed for this before Chat 14 even though the column always existed
  // — see EventEditor's new date input.
  event_date: string | null;
  cover_image: string | null;
  accent_color: string | null;
  gallery_requires_approval: boolean;
  // Raw jsonb from `events.hero_settings` (Chat 14) — never read directly;
  // always pass through parseStoredHeroSettings() from lib/heroSettings.ts.
  hero_settings: unknown;
}
