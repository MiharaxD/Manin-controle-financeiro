# Instruções do projeto

Converse em português como um amigo próximo, com naturalidade de quem usa Discord e Twitter. Evite memes forçados. Seja direto e honesto sobre o que foi verificado.

## Projeto

Manin: controle financeiro pessoal em português, PWA offline com dados só no navegador (IndexedDB), sem backend. Next.js 16 (App Router, `output: export`), React 19, TypeScript 6 strict, Tailwind 4 + CSS próprio, zod 4, Recharts, Radix Dialog. Node 22+, pnpm 11.25.0. Detalhes de uso no `README.md`.

## Comandos

- Instalar: `pnpm install --frozen-lockfile` (no Windows desta máquina o pnpm pode estar só no caminho citado no README)
- Rodar: `pnpm dev` (http://localhost:3000; `/demo` usa dados fictícios separados) ou `Iniciar-Manin.cmd`
- Testes de domínio/armazenamento: `pnpm test`
- Checagens: `pnpm typecheck`, `pnpm lint`
- Navegador: `pnpm test:e2e` (sobe o dev server sozinho), `pnpm test:visual` (exige `pnpm dev` ativo)
- Build estático: `pnpm build` → `out/`; offline: `pnpm test:offline` depois do build
- Só com pedido explícito: deploy/redeploy na Vercel, `git push`, qualquer teste com conta Google real.

## Invariantes

- Preserve TypeScript strict e dinheiro em centavos inteiros.
- Mudanças financeiras exigem testes proporcionais, incluindo transições de calendário e isolamento entre conjuntos (pessoal × demo).
- Gravações em uma única transação IndexedDB; mudança de formato exige migração e leitura de backups antigos.
- Nunca apresente demonstração como sincronização real. Não use dados fictícios em produção.
- Não exponha credenciais privilegiadas, nem registre dados financeiros em logs.

## Estilo

Textos de interface e documentação em português; nomes de código em inglês. Comentários raros e curtos. Siga o idioma e a densidade do arquivo vizinho; formatação estilo Prettier padrão (aspas duplas, vírgula final), sem config de formatter no repo.

## Consulta (antes de qualquer tarefa)

1. Leia `docs/context/ROUTES.md` e vá direto aos caminhos do tipo de tarefa.
2. Leia `STATE.md` e `DECISIONS.md` só se a tarefa depender de estado, prioridades ou escolhas de produto; `DOMAIN_RULES.md` para dinheiro, datas, parcelas e recorrências; `ARCHITECTURE.md` só para mudanças que cruzam camadas.
3. Explore além disso só se a rota não cobrir o caso. Em arquivo grande, use busca e leia trechos.

## Manutenção (ao terminar trabalho relevante, sem precisar pedir)

- Atualize só os documentos afetados em `docs/context/`, antes de declarar a tarefa concluída.
- Substitua em vez de acrescentar: remova o que ficou obsoleto, as pendências concluídas e as redundâncias.
- Se descobriu um caminho novo ou uma rota errada, corrija o `ROUTES.md`.
- Nunca registre diário, log de sessão, raciocínio, SHAs, resultados de teste datados ou tamanhos de build.
- Cada arquivo de contexto fica em ~2.000 tokens; quando chegar perto, compacte.
- Instruções novas do usuário prevalecem; atualize os documentos quando elas mudarem uma regra.
