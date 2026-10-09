"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="boot-error">
      <div>
        <h1>Algo interrompeu o carregamento.</h1>
        <p>Confira sua conexão e tente abrir seu espaço novamente.</p>
        <button className="button primary" onClick={reset}>
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
