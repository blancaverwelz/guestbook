interface SuccessStateProps {
  onReset?: () => void;
}

export function SuccessState({ onReset }: SuccessStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-8 text-center">
      <span aria-hidden className="text-3xl text-accent">
        ✓
      </span>
      <p className="text-base font-medium text-foreground">
        Thank you! Your message has been added.
      </p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="text-sm text-accent underline underline-offset-2 hover:opacity-80"
        >
          Leave another message
        </button>
      )}
    </div>
  );
}
