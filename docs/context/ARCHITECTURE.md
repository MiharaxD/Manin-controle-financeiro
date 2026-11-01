# Fluxos entre camadas

## Abertura
`page.tsx` → `LocalApp` cria `LocalStore("local" | "demo")` e chama `refresh()`: numa transação do IndexedDB `manin-device-v1` (v2, store `datasets`, chaves `local`/`demo`) lê o registro (ou cria pelo seed), valida com `validateRecord` — envelope antigo v1 passa por `migratePreviousData` (`legacy-records.ts` valida, `migrations.ts` converte, `records.validateData` confere) — roda `generateDue` e regrava. O `FinanceApp` monta com o snapshot (`finance.buildSnapshot`).

## Mutação (salvar, excluir, pagar fatura)
Formulário (`forms.tsx`) monta uma `Mutation` → `app.tsx` `save`/`safeMutate` → `LocalStore.mutate` → numa transação: `applyMutation` (`engine.ts`, valida com `mutationSchema`; o formulário já faz `safeParse` antes) → `generateDue` → `validateData` → grava com revisão +1 → avisa outras abas por BroadcastChannel `manin-local-updates`. Erro em qualquer etapa aborta sem alterar o registro.

## Backup e restauração
Exportar: `LocalStore.backup()` → `createBackup` (v3). Importar arquivo ou Drive: `parseBackup` (reconhece v1/v2/v3, migra, valida tudo) → `backups.tsx` mostra origem/data/contagem e pede confirmação → `LocalStore.replace(backup, revisãoEsperada)` substitui em uma transação, recusando se a revisão mudou.

## Google Drive
`google-drive.ts` carrega GIS no navegador, pede token com `drive.appdata` (só em memória), confirma a conta por `about.get`, envia/baixa direto ao Google. Recibo confirmado é guardado com `recordDriveBackup` vinculado ao ID do conjunto.

## Build e offline
`pnpm build` = `next build` (export para `out/`) + `create-offline-manifest.mjs` (lista arquivos públicos versionados). `public/sw.js` pré-carrega essa lista; `pwa.tsx` registra o SW fora do desenvolvimento. Vercel serve `out/` com headers de `vercel.json`.
