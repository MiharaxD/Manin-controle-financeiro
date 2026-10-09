"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Logo } from "./icons";
export function Auth({
  configured,
  demo,
  mode: initialMode,
  linkError,
}: {
  configured: boolean;
  demo: boolean;
  mode: string;
  linkError: boolean;
}) {
  const router = useRouter();
  const enter = () => {
    router.replace("/");
    router.refresh();
  };
  const [mode, setMode] = useState(initialMode),
    [error, setError] = useState(
      linkError ? "Esse link expirou ou já foi usado. Peça um novo." : "",
    ),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget),
        email = String(form.get("email") ?? ""),
        password = String(form.get("password") ?? "");
      if (mode !== "update" && !z.email().safeParse(email).success)
        throw new Error("Informe um e-mail válido.");
      if (mode !== "recover" && password.length < 10)
        throw new Error("Use uma senha com pelo menos 10 caracteres.");
      const client = supabaseBrowser();
      if (mode === "signup") {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${location.origin}/auth/callback` },
        });
        if (error) throw error;
        if (data.session) enter();
        else
          setSuccess(
            "Confira seu e-mail para confirmar a conta. Se já tiver cadastro, entre ou recupere o acesso.",
          );
      } else if (mode === "recover") {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/auth/callback?next=/login?mode=update`,
        });
        if (error) throw error;
        setSuccess(
          "Se houver uma conta com esse e-mail, você receberá o link de recuperação.",
        );
      } else if (mode === "update") {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        enter();
      } else {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        enter();
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      setError(
        raw.startsWith("Informe") || raw.startsWith("Use ")
          ? raw
          : mode === "signin"
            ? "Não foi possível entrar. Confira o e-mail, a senha e a confirmação da conta."
            : "Não foi possível concluir. Tente novamente em instantes.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page">
      <section className="auth-art">
        <Logo />
        <div>
          <h1>
            <span>Mais clareza.</span>
            <br />
            <span>Menos peso.</span>
          </h1>
          <p>
            Seu dinheiro merece um espaço simples. Registre o agora e veja o que
            vem pela frente.
          </p>
          <svg className="auth-emblem" viewBox="0 0 300 160" aria-hidden="true">
            <path
              d="m35 84 38-14-8-42 33 24 33-29-5 40 45 9-34 24 14 38-40-17-24 29-7-38z"
              fill="var(--paper)"
              stroke="var(--ink)"
              strokeWidth="4"
            />
            <path
              d="m152 30 27-12-5 39 46-18-14 43 52-16-72 76 11-48-43 20 16-47-27 11z"
              fill="var(--ink)"
            />
            <path
              d="m260 20 6 14 15-4-8 13 10 11-15-2-6 14-3-16-16-1 13-9z"
              fill="var(--paper)"
              stroke="var(--ink)"
              strokeWidth="2"
            />
          </svg>
        </div>
        <small>Feito para o seu dia a dia. Do computador ao iPhone.</small>
      </section>
      <div className="auth-form-wrap">
        <section className="auth-form">
          <Logo />
          <h2>
            {!configured
              ? "Seu espaço está quase pronto."
              : {
                  signin: "Bom te ver por aqui.",
                  signup: "Comece com clareza.",
                  recover: "Vamos recuperar seu acesso.",
                  update: "Escolha sua nova senha.",
                }[mode]}
          </h2>
          <p>
            {!configured
              ? "A interface já está disponível. Conecte o Supabase para criar sua conta e sincronizar seus dados."
              : "Um espaço para acompanhar suas finanças, no seu ritmo."}
          </p>
          {!configured ? (
            <div className="setup-note">
              Siga as instruções do README para configurar o banco e preencher
              as variáveis do Supabase.
              {demo && (
                <>
                  <br />
                  <a className="button primary" href="/demo">
                    Explorar demonstração
                  </a>
                </>
              )}
            </div>
          ) : (
            <>
              <form onSubmit={submit}>
                {mode !== "update" && (
                  <label>
                    E-mail
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="voce@exemplo.com"
                    />
                  </label>
                )}
                {mode !== "recover" && (
                  <label>
                    {mode === "update" ? "Nova senha" : "Senha"}
                    <input
                      name="password"
                      type="password"
                      minLength={10}
                      autoComplete={
                        mode === "signin" ? "current-password" : "new-password"
                      }
                      required
                      placeholder="Pelo menos 10 caracteres"
                    />
                  </label>
                )}
                {error && (
                  <p role="alert" className="form-error">
                    {error}
                  </p>
                )}
                {success && (
                  <p role="status" className="auth-success">
                    {success}
                  </p>
                )}
                <button className="button primary" disabled={busy}>
                  {busy
                    ? "Aguarde…"
                    : {
                        signin: "Entrar no meu espaço",
                        signup: "Criar conta",
                        recover: "Enviar link",
                        update: "Salvar nova senha",
                      }[mode]}
                </button>
              </form>
              <div className="auth-links">
                <button
                  className="text-button"
                  onClick={() => {
                    setMode(mode === "signup" ? "signin" : "signup");
                    setError("");
                    setSuccess("");
                  }}
                >
                  {mode === "signup" ? "Já tenho uma conta" : "Criar conta"}
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    setMode(mode === "recover" ? "signin" : "recover");
                    setError("");
                    setSuccess("");
                  }}
                >
                  {mode === "recover"
                    ? "Voltar para entrar"
                    : "Esqueci minha senha"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
