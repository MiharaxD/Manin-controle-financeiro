import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url),
    code = url.searchParams.get("code");
  if (code) {
    const client = await supabaseServer();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(
          url.searchParams.get("next") === "/login?mode=update"
            ? "/login?mode=update"
            : "/",
          url.origin,
        ),
      );
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
