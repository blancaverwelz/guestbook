"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo/Logo";

type LoginState = "IDLE" | "SUBMITTING" | "ERROR";

/**
 * Single admin login, email/password only (no OAuth — one host account per
 * event platform instance, per the chat 7 spec). Session lives in cookies
 * via the same @supabase/ssr browser client every other client component
 * uses, so a successful sign-in here is immediately visible to
 * middleware.ts on the very next navigation.
 *
 * inFlightRef-equivalent guard: `state === "SUBMITTING"` gates the submit
 * handler itself (not just the button's disabled attribute), same reason
 * as useMessageSubmit/useGalleryUpload — a second Enter-key submit can't
 * race in ahead of the re-render that disables the button.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<LoginState>("IDLE");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (state === "SUBMITTING") return;

    setState("SUBMITTING");
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Incorrect email or password.");
      setState("ERROR");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  const isSubmitting = state === "SUBMITTING";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 text-foreground">
      <Logo />

      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-border bg-card p-6"
        noValidate
      >
        <h1 className="text-lg font-medium text-foreground">Admin sign in</h1>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="admin-email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            autoComplete="email"
            required
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="host@example.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="admin-password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            autoComplete="current-password"
            required
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="••••••••"
          />
        </div>

        {state === "ERROR" && error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-accent px-4 py-2 font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
