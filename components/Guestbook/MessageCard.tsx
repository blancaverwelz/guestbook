"use client";

import { motion } from "framer-motion";

type MessageCardProps = {
  name: string;
  message: string;
  createdAt: string;
  index?: number;
};

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Caps the stagger delay so a long initial batch doesn't leave the last
// few cards visibly waiting — beyond ~8 items the cascade reads as
// "loaded", not "staggering", anyway.
const MAX_STAGGER_INDEX = 8;
const STAGGER_STEP_S = 0.05;

export default function MessageCard({
  name,
  message,
  createdAt,
  index = 0,
}: MessageCardProps) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.25,
        ease: "easeOut",
        delay: Math.min(index, MAX_STAGGER_INDEX) * STAGGER_STEP_S,
      }}
      className="rounded-lg border border-border bg-card p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium text-foreground">{name}</p>
        <time dateTime={createdAt} className="shrink-0 text-xs text-muted-foreground">
          {formatRelativeTime(createdAt)}
        </time>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
        {message}
      </p>
    </motion.li>
  );
}
