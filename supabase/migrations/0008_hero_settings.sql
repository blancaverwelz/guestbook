-- 0008_hero_settings.sql
-- Adds per-event hero content/typography customization (Chat 14).
-- Additive only — new column, default value, no RLS change, no
-- modification of any existing migration file (see playbook: "create a
-- new migration; do not modify existing migrations").
--
-- Encoded as a single jsonb column rather than one column per
-- field/setting (title/subtitle/date/guestbookText x visible/fontFamily/
-- fontSize, plus decoration = 13 columns) — mirrors the accent_color
-- single-text-column encoding pattern already used in this project. Parse
-- with lib/heroSettings.ts's parseStoredHeroSettings(); never read/write
-- events.hero_settings directly anywhere else.
--
-- The default below reproduces the pre-Chat-14 hardcoded Hero.tsx look as
-- closely as the curated font/size lists allow, so every already-published
-- event keeps rendering the same way after this migration runs, with zero
-- backfill needed (same reasoning as the accent_color migration).
alter table events
  add column hero_settings jsonb not null default '{
    "title": { "visible": true, "fontFamily": "Cormorant Garamond", "fontSize": 48 },
    "subtitle": { "visible": true, "fontFamily": "Cormorant Garamond", "fontSize": 20 },
    "date": { "visible": true, "fontFamily": "Cormorant Garamond", "fontSize": 16 },
    "guestbookText": {
      "visible": true,
      "fontFamily": "Great Vibes",
      "fontSize": 40,
      "content": "Sign Our Guestbook"
    },
    "decoration": "floral"
  }'::jsonb;
