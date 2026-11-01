# Rotas por tipo de tarefa

App de página única: `src/app/page.tsx` → `src/components/local-app.tsx` (abre o IndexedDB) → `src/components/app.tsx` (`FinanceApp`: navegação, estado, telas). Domínio puro em `src/lib/`. Sem backend: `output: export` gera `out/`.

## Design / UI / tema
- **Ir direto para:** `src/app/globals.css` (tokens em `:root` e `:root[data-theme="dark"]`), `src/components/views/*.tsx` da tela, `src/components/views/shared.tsx` (Panel, Empty, BudgetBar em 10 segmentos, TransactionRows com carimbo do dia), `src/components/icons.tsx` (`Ransom`, `Burst`, `Logo`), `src/components/charts.tsx`, `src/components/ui/dialog.tsx` (Radix). Fontes em `public/fonts/`.
- **Testes:** `pnpm test:visual` (exige `pnpm dev` ativo; capturas em `artifacts/redesign/`), `pnpm test:e2e`. Os testes navegam pelo título `h1` da tela (nome acessível vem do `sr-only` do `Ransom`) e, no celular, abrem Orçamentos/Relatórios pelo "Mais". Classes usadas como seletor: `.topbar`, `.desktop-add`, `.fab`, `.hero-amount`, `.transaction-row`, `.row-menu`, `.recurrence-row`, `.card-panel`, `.demo-banner`, `.segmented`.
- **Cuidados:** direção visual e movimento em DECISIONS.md. Mudar nos dois temas e conferir 1440/390/320px e `prefers-reduced-motion`. Placas com placa girada atrás usam `::before` (placa) + `::after` (fundo) para não inverter a ordem quando uma animação cria contexto de empilhamento. Troca de tela remonta `.stage` e `.wipe` por `key={page}` em `app.tsx`. Em `TransactionRows`, o `::after` de `.transaction-text` cobre a linha toda para abrir a edição; outro controle na linha precisa de `z-index` acima dele, como o `.row-menu`. Diálogos condicionais ficam dentro de `<DialogExit>` (`ui/dialog.tsx`), que mantém a janela montada com `open={false}` enquanto a saída (`[data-state="closed"]`) roda; diálogo novo também precisa dele.
- **Arquivo grande:** `globals.css` (~3.600 linhas). Busque pela classe com grep ou pelos comentários de seção (`Shell`, `Main area`, `Panels`, `Rows`, `Transactions`, `Dialogs`, `Forms`, `Motion`); `@media` no fim.

## Telas e navegação
- **Ir direto para:** `src/components/app.tsx`; telas em `views/dashboard.tsx` (Início), `transactions.tsx`, `recurrences.tsx` (Recorrentes + apelidos de cartão), `cards.tsx`, `invoice.tsx` (detalhe por cartão/mês), `reports.tsx`; `views/types.ts` (tipo `Page`). Primeiro acesso: `welcome.tsx`. `/login/` e `/demo/` em `src/app/`.
- **Arquivo grande:** `app.tsx` (~1.230 linhas). Grep: `const navigation` (destinos; `mobilePrimary` define a barra do celular, o resto vai para "Mais"), `className="topbar"` (barra única: título, mês, avisos, ações), `pageAction` (botão principal por tela), `backupAge` (status de backup no menu), `page === "`, `const save`, `loadTransactions`, `loadInvoice`, `Preferências` (tipos de recorrentes ficam ali).
- **Não precisa ler:** `src/app/error.tsx`, `loading.tsx`, `next-env.d.ts`.

## Formulários (lançamento, cartão, recorrente, tipo, conta, orçamento)
- **Ir direto para:** `src/components/forms.tsx` → `TransactionForm` (~158) e `EntityForm` (~554, ramo por `editor.type`); `CardPicker`/`RecurrenceTypePicker` criam apelido/tipo sem perder o rascunho.
- **Testes:** `tests/e2e/flows.spec.ts`, `tests/e2e/recurrences.spec.ts`.
- **Cuidados:** a validação real está em `src/lib/schemas.ts` (`mutationSchema`); o formulário só monta a mutação. Campo novo costuma exigir `types.ts` + `schemas.ts` + `records.ts` + `engine.ts` + backup.
- **Arquivo grande:** `forms.tsx` (~920 linhas); busque `editor.type ===`.

## Regras financeiras (dinheiro, datas, parcelas, recorrências, indicadores)
- **Ir direto para:** `docs/context/DOMAIN_RULES.md`, depois `src/lib/finance.ts` (dinheiro, calendário America/Sao_Paulo, `splitInstallments`, `buildSnapshot`) e `src/lib/engine.ts` (`applyMutation`, `generateDue`).
- **Testes:** `tests/finance.test.ts`, `tests/recurrences.test.ts`; `pnpm test`.
- **Cuidados:** centavos inteiros; testar virada de mês, fevereiro/bissexto e dezembro. Mutação inválida deve lançar erro sem alterar dados.

## Modelo de dados, validação e migração
- **Ir direto para:** `src/lib/types.ts`, `src/lib/schemas.ts` (zod por entidade), `src/lib/records.ts` (`validateData`: referências e invariantes do conjunto), `src/lib/initial-data.ts` (conjunto vazio e tipos iniciais), `src/lib/migrations.ts` + `legacy-records.ts` (formato antigo → atual).
- **Testes:** `tests/local-store.test.ts`, `tests/fixtures/legacy-data.ts`.
- **Cuidados:** mudar o formato exige migração + aceitação no backup + teste de dado antigo íntegro e recusado. Nunca descartar IDs, parcelas, pagamentos ou competências.

## Armazenamento local (IndexedDB, abas, revisão)
- **Ir direto para:** `src/lib/local-store.ts` (`LocalStore`: `read`, `mutate`, `refresh`, `backup`, `replace`, BroadcastChannel `manin-local-updates`), `src/components/local-app.tsx`.
- **Testes:** `tests/local-store.test.ts` (fake-indexeddb).
- **Cuidados:** toda gravação numa única transação; conjuntos `local` e `demo` nunca se misturam.

## Backup JSON e Google Drive
- **Ir direto para:** `src/lib/backup.ts` (v3, lê v1/v2), `src/components/backups.tsx` (UI e confirmação), `src/lib/google-drive.ts` (GIS, `drive.appdata`), `src/lib/export.ts` (CSV).
- **Testes:** `tests/local-store.test.ts` (backup/restauração), `tests/google-drive.test.ts` (respostas controladas, sem conta real).
- **Cuidados:** restauração substitui tudo após confirmação e revisão esperada; token só em memória; nunca alegar envio sem confirmação da API.

## PWA / offline
- **Ir direto para:** `public/sw.js`, `scripts/create-offline-manifest.mjs`, `src/components/pwa.tsx`, `src/app/manifest.ts`, `public/offline.html`.
- **Testes:** `pnpm build && pnpm test:offline` (`tests/offline/offline.spec.ts`).
- **Cuidados:** cache só de arquivos públicos de `out/`; nunca dados financeiros, Drive ou OAuth. SW desativado em desenvolvimento. `audio/` fica fora do cache (o SW não atende range); sem rede a música não toca.
- **Música de fundo:** `src/components/music-toggle.tsx` (áudio em loop + botão na `.topbar-actions`; preferência em `localStorage` `manin-music`), arquivo em `public/audio/`.

## Build, deploy e ambiente
- **Ir direto para:** `package.json`, `next.config.ts`, `vercel.json` (headers, `out/`), `.env.example` (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`, opcional), `scripts/serve-static.mjs`, `Iniciar-Manin.cmd`.
- **Cuidados:** ferramentas fixadas (ver DECISIONS.md). Deploy na Vercel só com pedido explícito.
- **Não precisa ler:** `pnpm-lock.yaml`, `out/`, `.next/`, `test-results/`, `artifacts/`, fontes/ícones em `public/`, `scripts/create-icons.mjs`.

## Demonstração
- `src/lib/demo.ts` + `src/app/demo/page.tsx`; só em desenvolvimento. Os testes e2e e visuais usam `/demo`.

## Legado
- `docs/migration-export.sql`: exportação antiga do Supabase, somente leitura, nunca executada pelo app. Ignore salvo pedido específico.

## Mini-mapa
| Arquivo | Papel |
|---|---|
| `src/components/app.tsx` | Shell, navegação, estado, mutações |
| `src/components/forms.tsx` | Todos os formulários |
| `src/components/local-app.tsx` | Abre LocalStore e monta o app |
| `src/components/backups.tsx` | Backup JSON/Drive e restauração |
| `src/lib/finance.ts` | Dinheiro, datas, parcelas, snapshot |
| `src/lib/engine.ts` | Mutações e geração de recorrências |
| `src/lib/local-store.ts` | IndexedDB, transações, revisão |
| `src/lib/schemas.ts` / `records.ts` | Validação por entidade / do conjunto |
| `src/lib/migrations.ts` | Formato antigo → atual |
| `src/lib/backup.ts` | Formato `manin-backup` v3 |
| `src/lib/google-drive.ts` | OAuth GIS + API Drive |
| `src/lib/types.ts` | Tipos do domínio |
| `src/app/globals.css` | Todo o estilo e temas |
| `public/sw.js` | Service worker offline |
