import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Protects /admin/* (except /admin/login itself) behind a Supabase session
 * check. This is route-level UX (fast redirect, no flash of admin UI) —
 * the actual authorization boundary is Postgres/Storage RLS
 * (`auth.role() = 'authenticated'`), which every admin data call still goes
 * through regardless of what this middleware does. Losing this file would
 * be a broken redirect, not an open database.
 *
 * Own Supabase server client here (not the one in lib/supabase/server.ts,
 * which is Server Component-shaped and reads/writes cookies via
 * next/headers). Middleware gets cookies from the NextRequest/NextResponse
 * pair instead. `setAll`'s param is typed explicitly against
 * `CookieOptions` from `@supabase/ssr` — see shared reference doc's "Known
 * failure modes": this callback silently falls back to implicit `any`
 * under strict TS if untyped, which passes `tsc` in-editor but fails
 * `next build`'s type-check step. Already hit once in
 * lib/supabase/server.ts; not reintroducing it here.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";

  if (!user && !isLoginPage) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
