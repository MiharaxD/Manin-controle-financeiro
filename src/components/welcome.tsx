import { Logo } from "./icons";
import Link from "next/link";
export function Welcome() {
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
          <h2>Seu espaço, neste dispositivo.</h2>
          <p>
            Sem cadastro. Seus dados financeiros ficam neste dispositivo e
            navegador. Limpar o navegador ou trocar de dispositivo pode remover
            seus dados ou o acesso a eles.
          </p>
          <div className="setup-note">
            <p>
              Use backups JSON para guardar uma cópia. O Google Drive é opcional
              e recebe backups somente quando você solicitar; não há
              sincronização entre dispositivos.
            </p>
            <Link className="button primary" href="/" prefetch={false}>
              Abrir meu espaço local
            </Link>
            {process.env.NODE_ENV === "development" && (
              <Link className="text-button" href="/demo/" prefetch={false}>
                Explorar demonstração separada
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
