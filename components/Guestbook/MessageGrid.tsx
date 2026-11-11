import { HERO_FONT_CLASS_NAMES } from "@/lib/heroFonts";
import { formatCount, type DayGroup } from "@/lib/guestbook/presentation";
import MessageCard from "./MessageCard";

const display = HERO_FONT_CLASS_NAMES["Cormorant Garamond"];

/**
 * Date-grouped archive. DOM order is exactly the reading order returned by
 * the query. Notes are plain grid items with natural height (no stretching,
 * no minimum heights); the composition comes only from each note's width and
 * from near-equal neighbours sharing a row, never from reordering.
 */
export default function MessageGrid({ groups }: { groups: DayGroup[] }) {
  let index = 0;
  return (
    <div className="flex flex-col gap-20 sm:gap-24">
      {groups.map((group) => {
        const { parts } = group;
        const headingId = `day-${group.key}`;
        return (
          <section key={group.key} aria-labelledby={headingId}>
            <div className="mb-10 flex items-center gap-5 sm:mb-12 sm:gap-8">
              <span aria-hidden className="archive-rule flex-1 [--rule-dir:to_left]" />
              <h2 id={headingId} aria-label={parts.full} className="flex items-center gap-4">
                <span
                  aria-hidden
                  className={`${display} text-6xl font-light leading-[0.8] text-foreground lining-nums sm:text-7xl`}
                >
                  {parts.day}
                </span>
                <span aria-hidden className="flex flex-col gap-1.5">
                  <span className="text-[0.6875rem] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                    {parts.weekday}
                  </span>
                  <span className={`${display} text-xl italic leading-none text-foreground`}>
                    {parts.month}
                    {parts.year ? ` ${parts.year}` : ""}
                  </span>
                  <span className="text-xs tracking-wide text-muted-foreground">
                    {formatCount(group.messages.length)}
                  </span>
                </span>
              </h2>
              <span aria-hidden className="archive-rule flex-1" />
            </div>

            <ol role="list" className="grid list-none grid-cols-1 gap-5 p-0 md:grid-cols-12 md:gap-x-6 md:gap-y-6">
              {group.messages.map((message) => (
                <MessageCard key={message.id} message={message} index={index++} />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
