import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authenticated, dbError } from "@/lib/server";
import { date } from "@/lib/schemas";
import { todaySP } from "@/lib/finance";
export async function GET(request: Request) {
  try {
    const client = await authenticated(),
      params = new URL(request.url).searchParams;
    const card = z.uuid().parse(params.get("card")),
      month = date.parse(params.get("month"));
    const page = z.coerce
      .number()
      .int()
      .min(0)
      .max(100000)
      .parse(params.get("page") ?? 0);
    const results = await Promise.all([
      client.rpc("invoice_categories", { cid: card, m: month }),
      client
        .from("installments")
        .select("*, transaction:transactions!inner(*)", { count: "exact" })
        .eq("card_id", card)
        .eq("billing_month", month)
        .is("transaction.deleted_at", null)
        .eq("transaction.status", "actual")
        .lte("transaction.purchase_date", todaySP())
        .order("due_date")
        .order("id")
        .range(page * 30, page * 30 + 29),
      client
        .from("invoice_payments")
        .select("*")
        .eq("card_id", card)
        .eq("billing_month", month)
        .order("paid_date", { ascending: false })
        .limit(100),
    ]);
    results.forEach((r) => dbError(r.error));
    return NextResponse.json({
      category_totals: results[0].data,
      rows: results[1].data,
      count: results[1].count,
      payments: results[2].data,
    });
  } catch (error) {
    return apiError(error);
  }
}
