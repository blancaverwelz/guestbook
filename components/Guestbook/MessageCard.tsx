type MessageCardProps = {
  name: string;
  message: string;
  createdAt: string;
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

export default function MessageCard({
  name,
  message,
  createdAt,
}: MessageCardProps) {
  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium text-foreground">{name}</p>
        <time dateTime={createdAt} className="shrink-0 text-xs text-muted-foreground">
          {formatRelativeTime(createdAt)}
        </time>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
        {message}
      </p>
    </li>
  );
}
