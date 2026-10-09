import { redirect } from "next/navigation";
import { FinanceApp } from "@/components/app";
import { configured, supabaseServer } from "@/lib/supabase/server";
import { monthOf, todaySP } from "@/lib/finance";
import type { Snapshot } from "@/lib/types";
import { Logo } from "@/components/icons";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!configured()) redirect("/login");
  const client = await supabaseServer();
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims?.sub) redirect("/login");
  const bootstrap = await client.rpc("bootstrap"),
    generated = await client.rpc("generate_recurring");
  const snapshot = await client.rpc("snapshot", { m: monthOf(todaySP()) });
  if (bootstrap.error || generated.error || snapshot.error)
    return (
      <div className="boot-error">
        <div>
          <Logo />
          <h1>Vamos conectar seu espaço.</h1>
          <p>
            Não foi possível carregar o banco. Confira se as migrations foram
            aplicadas e se o Supabase está disponível.
          </p>
          <Link className="button primary" href="/">
            Tentar novamente
          </Link>
        </div>
      </div>
    );
  return (
    <FinanceApp
      initial={snapshot.data as Snapshot}
      email={String(data.claims.email ?? "")}
    />
  );
}
