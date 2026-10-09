import { NextResponse } from "next/server";
import {
  apiError,
  authenticated,
  dbError,
  HttpError,
  verifyOrigin,
} from "@/lib/server";
import { date, mutationSchema } from "@/lib/schemas";
import { monthOf, todaySP } from "@/lib/finance";
export async function GET(request: Request) {
  try {
    const client = await authenticated();
    const m = date.parse(
      new URL(request.url).searchParams.get("month") ?? monthOf(todaySP()),
    );
    if (!m.endsWith("-01")) throw new HttpError(400, "Mês inválido.");
    const bootstrap = await client.rpc("bootstrap");
    dbError(bootstrap.error);
    const generated = await client.rpc("generate_recurring");
    dbError(generated.error);
    const { data, error } = await client.rpc("snapshot", { m });
    dbError(error);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const client = await authenticated();
    if (Number(request.headers.get("content-length")) > 16384)
      throw new HttpError(413, "Solicitação muito grande.");
    const parsed = mutationSchema.safeParse(await request.json());
    if (!parsed.success)
      throw new HttpError(400, parsed.error.issues[0].message);
    const { action, payload } = parsed.data;
    let result;
    if (action === "transaction")
      result = await client.rpc("save_transaction", { p: payload });
    else if (action === "payment")
      result = await client.rpc("pay_invoice", { p: payload });
    else if (action === "delete")
      result = await client.rpc("delete_entity", {
        entity: payload.entity,
        eid: payload.id,
      });
    else if (action === "restore")
      result = await client.rpc("restore_transaction", { eid: payload.id });
    else if (action === "clear")
      result = await client.rpc("clear_data", {
        confirmation: payload.confirmation,
      });
    else
      result = await client.rpc("save_entity", { entity: action, p: payload });
    dbError(result.error);
    return NextResponse.json({ id: result.data });
  } catch (error) {
    return apiError(error);
  }
}
