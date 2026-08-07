export interface AdminEvent {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  cover_image: string | null;
  accent_color: string | null;
  gallery_requires_approval: boolean;
}
