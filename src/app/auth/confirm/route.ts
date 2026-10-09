import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url),
    token_hash = url.searchParams.get("token_hash"),
    type = url.searchParams.get("type");
  if (token_hash && (type === "email" || type === "recovery")) {
    const client = await supabaseServer();
    const { error } = await client.auth.verifyOtp({ token_hash, type });
    if (!error)
      return NextResponse.redirect(
        new URL(type === "recovery" ? "/login?mode=update" : "/", url.origin),
      );
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
