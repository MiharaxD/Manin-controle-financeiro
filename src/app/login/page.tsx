import { Auth } from "@/components/auth";
import { configured } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return (
    <Auth
      configured={configured()}
      demo={process.env.NODE_ENV === "development"}
      mode={params.mode === "update" ? "update" : "signin"}
      linkError={!!params.error}
    />
  );
}
