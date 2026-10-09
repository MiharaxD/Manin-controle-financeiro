import { NextResponse } from "next/server";
import { apiError, authenticated, dbError } from "@/lib/server";
import { csv } from "@/lib/export";
import type { Category, Transaction } from "@/lib/types";
export async function GET(request: Request) {
  try {
    const client = await authenticated();
    const readAll = async (table: string) => {
      const rows: Record<string, unknown>[] = [];
      for (let page = 0; ; page++) {
        const { data, error } = await client
          .from(table)
          .select("*")
          .order("id")
          .range(page * 500, page * 500 + 499);
        dbError(error);
        rows.push(...(data ?? []));
        if (!data || data.length < 500) break;
      }
      return rows;
    };
    const format = new URL(request.url).searchParams.get("format");
    const entries = await Promise.all(
      (format === "csv"
        ? ["transactions", "categories"]
        : [
            "accounts",
            "categories",
            "cards",
            "transactions",
            "installments",
            "invoice_payments",
            "recurrences",
            "budgets",
          ]
      ).map(async (table) => [table, await readAll(table)] as const),
    );
    const result = Object.fromEntries(entries),
      rows = (result.transactions as unknown as Transaction[]).filter(
        (t) => !t.deleted_at,
      );
    const body =
      format === "csv"
        ? csv(rows, result.categories as unknown as Category[])
        : JSON.stringify(
            { version: 1, exported_at: new Date().toISOString(), ...result },
            null,
            2,
          );
    return new NextResponse(body, {
      headers: {
        "Content-Type":
          format === "csv" ? "text/csv; charset=utf-8" : "application/json",
        "Content-Disposition": `attachment; filename="manin.${format === "csv" ? "csv" : "json"}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
