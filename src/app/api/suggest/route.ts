import { NextResponse } from "next/server";
import { apiError, authenticated, dbError } from "@/lib/server";
export async function GET(request: Request) {
  try {
    const client = await authenticated();
    const merchant = (new URL(request.url).searchParams.get("merchant") ?? "")
      .trim()
      .slice(0, 100)
      .replace(/[%_\\]/g, "\\$&");
    const { data, error } = await client
      .from("transactions")
      .select("category_id")
      .is("deleted_at", null)
      .not("category_id", "is", null)
      .ilike("merchant", merchant)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    dbError(error);
    return NextResponse.json({ category_id: data?.category_id ?? null });
  } catch (error) {
    return apiError(error);
  }
}
