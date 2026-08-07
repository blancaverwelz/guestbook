export interface LandingEvent {
  id: string;
  title: string;
  subtitle: string | null;
  event_date: string | null; // ISO date string (YYYY-MM-DD) from Postgres `date`
  cover_image: string | null;
  accent_color: string | null;
}
