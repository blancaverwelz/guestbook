"use client";

import { HERO_FONT_FAMILIES, HERO_FONT_SIZES, HERO_MOBILE_FONT_SIZES, type HeroFieldSettings } from "@/lib/heroSettings";

interface HeroFieldEditorProps {
  /** Label for this field's whole group, e.g. "Event title". */
  label: string;
  idPrefix: string;
  settings: HeroFieldSettings;
  onChange: (next: HeroFieldSettings) => void;
  disabled?: boolean;
  /**
   * Optional content editor rendered above the visibility/font controls —
   * supplied by EventEditor for each field.
   */
  children?: React.ReactNode;
}

/**
 * Shared visible/font-family/font-size control group for one hero field.
 * Used four times in EventEditor (title, subtitle, date, guestbook text)
 * so the same layout/behavior doesn't get hand-duplicated per field.
 *
 * Font family and size are both closed `<select>` dropdowns over the
 * curated HERO_FONT_FAMILIES / HERO_FONT_SIZES lists — deliberately no
 * free-text/arbitrary-value input, per the feature spec ("do not allow
 * arbitrary font-family names or arbitrary CSS font-size values").
 */
export default function HeroFieldEditor({
  label,
  idPrefix,
  settings,
  onChange,
  disabled = false,
  children,
}: HeroFieldEditorProps) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={settings.visible}
            onChange={(e) => onChange({ ...settings, visible: e.target.checked })}
            disabled={disabled}
            className="h-4 w-4 rounded border-border accent-[var(--accent)] disabled:cursor-not-allowed"
          />
          Show on hero
        </label>
      </div>

      {children}

      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idPrefix}-font-family`} className="text-xs text-muted-foreground">
            Font family
          </label>
          <select
            id={`${idPrefix}-font-family`}
            value={settings.fontFamily}
            onChange={(e) => onChange({ ...settings, fontFamily: e.target.value as HeroFieldSettings["fontFamily"] })}
            disabled={disabled}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {HERO_FONT_FAMILIES.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${idPrefix}-font-size`} className="text-xs text-muted-foreground">
            Desktop size
          </label>
          <select
            id={`${idPrefix}-font-size`}
            value={settings.fontSize}
            onChange={(e) =>
              onChange({ ...settings, fontSize: Number(e.target.value) as HeroFieldSettings["fontSize"] })
            }
            disabled={disabled}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {HERO_FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}px
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idPrefix}-mobile-font-size`} className="text-xs text-muted-foreground">
            Mobile size
          </label>
          <select
            id={`${idPrefix}-mobile-font-size`}
            value={settings.mobileFontSize ?? "auto"}
            onChange={(e) => onChange({
              ...settings,
              mobileFontSize: e.target.value === "auto"
                ? null
                : Number(e.target.value) as HeroFieldSettings["mobileFontSize"],
            })}
            disabled={disabled}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="auto">Automatic (existing scaling)</option>
            {HERO_MOBILE_FONT_SIZES.map((size) => (
              <option key={size} value={size}>{size}px</option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Mobile: below 768px. Desktop: 768px and wider. Choose a mobile size to make it independent of desktop.
      </p>
    </div>
  );
}
