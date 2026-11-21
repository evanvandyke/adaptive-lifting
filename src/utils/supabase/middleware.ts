import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup");
  // The no-sign-in preview of the workout exists on a developer's machine only.
  const isPreview =
    process.env.NODE_ENV !== "production" &&
    request.nextUrl.pathname.startsWith("/lift/preview");
  // The callback is where an email or provider link lands, before there is a session.
  const isCallback = request.nextUrl.pathname.startsWith("/auth/callback");
  const isPublic =
    request.nextUrl.pathname === "/" || isAuthPage || isCallback || isPreview;

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Signed in: the workout is the front door.
  if (user && (isAuthPage || request.nextUrl.pathname === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/lift";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
};
