/** Placeholder shaped like the final notes: natural height, centred axis. */
export default function ArchiveSkeleton() {
  const notes = [
    { lines: ["w-full", "w-5/6", "w-2/3"], side: "md:mx-auto md:max-w-xl" },
    { lines: ["w-4/5", "w-1/2"], side: "md:mx-auto md:max-w-md" },
    { lines: ["w-full", "w-full", "w-3/4", "w-1/3"], side: "md:mx-auto md:max-w-2xl" },
  ];
  return (
    <div aria-hidden className="flex flex-col gap-6">
      {notes.map((note, i) => (
        <div
          key={i}
          className={`archive-note w-full animate-pulse px-6 py-7 sm:px-9 sm:py-9 ${note.side}`}
        >
          <div className="flex flex-col gap-3">
            {note.lines.map((w, j) => (
              <div key={j} className={`h-3.5 rounded bg-muted-foreground/20 ${w}`} />
            ))}
          </div>
          <div className="mt-7 flex items-center justify-between">
            <div className="h-4 w-28 rounded bg-muted-foreground/20" />
            <div className="h-3 w-10 rounded bg-muted-foreground/20" />
          </div>
        </div>
      ))}
    </div>
  );
}
