# Arquitetura

- `src/lib/finance.ts`: cálculos puros de centavos, calendário e indicadores; compartilhados por UI e testes.
- `src/lib/schemas.ts`: contratos Zod usados no cliente e servidor.
- `src/app/api/`: servidor autenticado, consultas limitadas/paginadas e mutações em RPCs.
- `supabase/migrations/`: schema, constraints, RLS e operações atômicas; banco é a autoridade.
- `src/components/views/`: telas e componentes financeiros reutilizáveis; `app.tsx` coordena dados e navegação e `forms.tsx` concentra formulários. Preferência local real apenas para tema.
- `src/app/globals.css`: tokens de marca/estado, componentes e regras responsivas consolidadas; Anton/Inter em `public/fonts/`. Marca original em SVG e ícones PWA gerados por `scripts/create-icons.mjs`.
- `src/components/ui/dialog.tsx`: Radix mantém contenção de foco; o chamador é capturado antes do portal para restaurar o foco ao fechar, inclusive com campos `autoFocus`.
- `scripts/verify-ui.mjs`: revisão visual local em 1440/390/320px, ambos os temas, fonte a 200%, menus, valores longos, modais, foco, navegação inferior, cores de séries e redução de movimento. Capturas e relatório ficam em `artifacts/redesign/`.
- `Iniciar-Manin.cmd`: inicia o servidor de desenvolvimento no Windows sem depender de npm/pnpm no terminal. Usa o Node instalado pelo Codex, com alternativa ao Node do PATH; requer `node_modules` instalado. O terminal do usuário não reconheceu `npm.cmd`.
- Testes de banco executam PostgreSQL via PGlite, com papéis e identidades locais que simulam Supabase Auth. Verificação no Supabase hospedado é uma etapa distinta.
- Service worker permite cache apenas de ícones e página offline sem dados. Rotas, respostas autenticadas e dados financeiros nunca são cacheados.
