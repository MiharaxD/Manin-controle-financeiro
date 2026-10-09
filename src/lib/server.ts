import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { configured, supabaseServer } from "./supabase/server";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function authenticated() {
  if (!configured())
    throw new HttpError(503, "O Supabase ainda não foi configurado.");
  const client = await supabaseServer();
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims?.sub)
    throw new HttpError(401, "Sua sessão expirou. Entre novamente.");
  return client;
}
export function verifyOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new HttpError(403, "Origem da solicitação inválida.");
}
export function apiError(error: unknown) {
  if (error instanceof ZodError || error instanceof SyntaxError)
    return NextResponse.json(
      { error: "Confira os dados informados." },
      { status: 400 },
    );
  return NextResponse.json(
    {
      error:
        error instanceof HttpError
          ? error.message
          : "Não foi possível concluir. Confira os dados e tente novamente.",
    },
    { status: error instanceof HttpError ? error.status : 500 },
  );
}
export function dbError(error: { code?: string; message: string } | null) {
  if (!error) return;
  const messages: Record<string, string> = {
    "23503": "Este registro está em uso ou pertence a outra conta.",
    "23505": "Este registro já existe. Edite o existente.",
    "23514": "Confira os dados informados.",
    "42501": "Você não tem acesso a este registro.",
  };
  throw new HttpError(
    400,
    messages[error.code ?? ""] ??
      (error.code === "P0001"
        ? error.message
        : "Não foi possível salvar. Confira a configuração do banco."),
  );
}
