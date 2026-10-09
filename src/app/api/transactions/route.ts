import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticated, apiError, dbError, HttpError } from "@/lib/server";
import { date } from "@/lib/schemas";
const optionalId = z.uuid();
export async function GET(request: Request) {
  try {
    const client = await authenticated();
    const params = new URL(request.url).searchParams;
    const page = z.coerce
      .number()
      .int()
      .min(0)
      .max(100000)
      .parse(params.get("page") ?? 0);
    let query = client
      .from("transactions")
      .select("*", { count: "exact" })
      .is("deleted_at", null)
      .order("purchase_date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(page * 30, page * 30 + 29);
    for (const [param, column] of [
      ["category", "category_id"],
      ["card", "card_id"],
      ["recurrence", "recurrence_id"],
    ])
      if (params.get(param))
        query = query.eq(column, optionalId.parse(params.get(param)));
    if (params.get("kind"))
      query = query.eq(
        "kind",
        z.enum(["expense", "income", "transfer"]).parse(params.get("kind")),
      );
    if (params.get("method"))
      query = query.eq(
        "payment_method",
        z.enum(["pix", "debit", "cash", "credit"]).parse(params.get("method")),
      );
    if (params.get("status"))
      query = query.eq(
        "status",
        z.enum(["actual", "planned"]).parse(params.get("status")),
      );
    if (params.get("from"))
      query = query.gte("purchase_date", date.parse(params.get("from")));
    if (params.get("to"))
      query = query.lte("purchase_date", date.parse(params.get("to")));
    const search = params.get("search")?.trim();
    if (search) {
      if (search.length > 100) throw new HttpError(400, "Busca muito longa.");
      // PostgREST grammar characters are excluded; user text cannot become a filter expression.
      const safe = search.replace(/[(),.%_\\"']/g, " ");
      query = query.or(`description.ilike.%${safe}%,merchant.ilike.%${safe}%`);
    }
    const { data, count, error } = await query;
    dbError(error);
    return NextResponse.json({ rows: data, count });
  } catch (error) {
    return apiError(error);
  }
}
