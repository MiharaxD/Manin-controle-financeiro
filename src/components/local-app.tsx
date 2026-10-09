"use client";
import { useEffect, useState } from "react";
import {
  LocalStore,
  type LocalRecord,
  type StoreMode,
} from "@/lib/local-store";
import { buildSnapshot, monthOf, todaySP } from "@/lib/finance";
import { FinanceApp } from "./app";
import { Logo } from "./icons";

export function LocalApp({ mode = "local" }: { mode?: StoreMode }) {
  const [loaded, setLoaded] = useState<{
    repository: LocalStore;
    record: LocalRecord;
  } | null>(null);
  const [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const repository = new LocalStore(mode);
    let active = true;
    void repository
      .refresh()
      .then((record) => {
        if (active) {
          setLoaded({ repository, record });
          setError("");
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "Não foi possível abrir os dados deste navegador.",
          );
      });
    return () => {
      active = false;
      repository.close();
    };
  }, [mode, retry]);
  if (error)
    return (
      <div className="boot-error">
        <Logo />
        <h1>Seu armazenamento precisa de atenção.</h1>
        <p role="alert">{error}</p>
        <p>
          Nenhum conjunto vazio foi salvo por cima dos seus registros. Confira o
          armazenamento do navegador e tente novamente.
        </p>
        <button
          className="button primary"
          onClick={() => {
            setError("");
            setRetry((n) => n + 1);
          }}
        >
          Tentar novamente
        </button>
      </div>
    );
  if (!loaded)
    return (
      <div className="boot-error" role="status">
        <Logo />
        <p>Preparando os dados deste navegador…</p>
      </div>
    );
  const today = todaySP();
  return (
    <FinanceApp
      repository={loaded.repository}
      initial={buildSnapshot(loaded.record.data, monthOf(today), today)}
      initialData={loaded.record.data}
      needNotice={!loaded.record.noticeAcknowledged}
    />
  );
}
