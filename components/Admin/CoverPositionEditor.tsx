"use client";

import { useId, useState } from "react";
import { DEFAULT_COVER_SETTINGS, type CoverFraming, type CoverSettings } from "@/lib/coverSettings";
import type { LandingEvent } from "@/types/event";
import HeroPreview from "./HeroPreview";

interface CoverPositionEditorProps {
  event: LandingEvent & { slug: string };
  value: CoverSettings;
  onChange: (value: CoverSettings) => void;
  disabled?: boolean;
}

const CONTROLS: { key: keyof CoverFraming; label: string; min: number; max: number }[] = [
  { key: "x", label: "Horizontal crop (left to right)", min: 0, max: 100 },
  { key: "y", label: "Vertical crop (top to bottom)", min: 0, max: 100 },
  { key: "zoom", label: "Zoom", min: 100, max: 200 },
];

export default function CoverPositionEditor({ event, value, onChange, disabled = false }: CoverPositionEditorProps) {
  const id = useId();
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const framing = value[device];

  return (
    <fieldset disabled={disabled || !event.cover_image} className="flex min-w-0 flex-col gap-4 rounded-md border border-border p-4 disabled:opacity-60">
      <legend className="px-1 text-sm font-medium">Cover photo positioning</legend>
      <div className="flex gap-2" role="group" aria-label="Preview device">
        {(["desktop", "mobile"] as const).map((option) => (
          <button key={option} type="button" aria-pressed={device === option} onClick={() => setDevice(option)} className={`rounded-md border px-3 py-2 text-sm ${device === option ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card text-foreground"}`}>
            {option === "desktop" ? "Desktop" : "Mobile"}
          </button>
        ))}
      </div>
      {event.cover_image ? <HeroPreview event={event} device={device} /> : <p className="text-sm text-muted-foreground">Upload a cover image to adjust its framing.</p>}
      {CONTROLS.map(({ key, label, min, max }) => (
        <div key={key} className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-${key}`} className="flex justify-between gap-2 text-sm"><span>{label}</span><span>{framing[key]}%</span></label>
          <input id={`${id}-${key}`} type="range" min={min} max={max} step={1} value={framing[key]} onChange={(e) => onChange({ ...value, [device]: { ...framing, [key]: Number(e.target.value) } })} className="w-full accent-current" />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Move the vertical crop toward bottom to bring lower subjects into view. If an axis does not move at 100% zoom, increase zoom slightly to give it room to pan.</p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-overlay`} className="flex justify-between gap-2 text-sm"><span>Overlay strength (both devices)</span><span>{value.overlay}%</span></label>
        <input id={`${id}-overlay`} type="range" min={0} max={100} step={1} value={value.overlay} onChange={(e) => onChange({ ...value, overlay: Number(e.target.value) })} className="w-full accent-current" />
        <p className="text-xs text-muted-foreground">Lower values reveal more of the photo. Keep the text readable.</p>
      </div>
      <button type="button" className="w-fit rounded-md border border-border px-3 py-2 text-sm" onClick={() => onChange({ ...value, [device]: { ...DEFAULT_COVER_SETTINGS[device] } })}>Reset {device} positioning</button>
      <p className="text-xs text-muted-foreground">Desktop applies from 768px wide. Use Save changes below to publish your adjustments.</p>
    </fieldset>
  );
}
