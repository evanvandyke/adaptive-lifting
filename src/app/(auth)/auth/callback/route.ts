import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only a path on this site: anything else (another host, "//host", "@host") falls back to the app.
  const asked = searchParams.get("next") ?? "/lift";
  const target = asked.startsWith("/") && !asked.startsWith("//") ? new URL(asked, origin) : null;
  const next = target && target.origin === origin ? `${target.pathname}${target.search}` : "/lift";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Could not verify your email. Please try again.")}`
  );
}
