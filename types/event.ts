export interface LandingEvent {
  id: string;
  title: string;
  subtitle: string | null;
  event_date: string | null; // ISO date string (YYYY-MM-DD) from Postgres `date`
  cover_image: string | null;
  accent_color: string | null;
  // Raw jsonb from `events.hero_settings` (Chat 14) — never read directly;
  // always pass through parseStoredHeroSettings() from lib/heroSettings.ts.
  hero_settings: unknown;
}
