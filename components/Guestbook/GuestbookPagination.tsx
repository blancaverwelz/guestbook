import { Fragment } from "react";
import { pageNumbers } from "@/lib/guestbook/pagination";

type Props = { page: number; pages: number; onPage: (page: number) => void };
const button = "min-h-11 min-w-11 rounded-full px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const direction = `${button} px-4 disabled:opacity-40 enabled:hover:bg-muted`;

export default function GuestbookPagination({ page, pages, onPage }: Props) {
  if (pages < 2) return null;
  const numbers = pageNumbers(page, pages);
  return (
    <nav aria-label="Guestbook pages" className="mt-14 flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
      <button type="button" className={direction} disabled={page === 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <div className="order-first flex basis-full items-center justify-center sm:order-none sm:basis-auto">
        {numbers.map((number, index) => (
          <Fragment key={number}>
            {index > 0 && number - numbers[index - 1] > 1 && <span aria-hidden className="px-1">…</span>}
            <button
              type="button"
              aria-label={`Page ${number}`}
              aria-current={number === page ? "page" : undefined}
              className={`${button} ${number === page ? "bg-foreground text-background" : "hover:bg-muted"}`}
              onClick={() => { if (number !== page) onPage(number); }}
            >
              {number}
            </button>
          </Fragment>
        ))}
      </div>
      <button type="button" className={direction} disabled={page === pages} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </nav>
  );
}
